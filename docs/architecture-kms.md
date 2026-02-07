# Registry V3: Custom KMS Integration & Hybrid Architecture

本文档详细描述了 Registry V3 系统如何集成**自定义 KMS (Custom Key Management System)**，以实现高安全性的混合签名架构。

核心设计理念是将**意愿 (Intention)** 与 **安全 (Security)** 分离：
- **意愿**：用户或管理员确认业务逻辑并发起请求（如 MetaMask 签名、Passkey 验证）。
- **安全**：后台 KMS 验证交易安全性（额度、对象、风控）后，自动进行最终签名或多签批准。

## 1. 核心架构：意愿与安全分离

### 1.1 角色与职责

| 角色 | 组件 | 职责 (Responsibility) | 签名/验证方式 |
| :--- | :--- | :--- | :--- |
| **User / Admin** | Frontend / EOA / Passkey | **意愿确认 (Intention)**<br>发起交易请求，确认业务参数。 | MetaMask (EOA), Passkey (WebAuthn) |
| **Management Terminal** | Backend API / Admin Portal | **业务编排 (Orchestration)**<br>组装交易，调用 KMS API。 | API Key / Session Token |
| **Secured KMS** | **Custom KMS Service** | **安全验证 (Security)**<br>检查额度、合约白名单、风控规则。<br>自动签名 (Auto-Signing)。 | HSM / TEE / MPC Private Key |
| **On-Chain Identity** | Smart Account / Safe / Registry | **最终执行 (Execution)**<br>校验多重签名 (User + KMS) 或执行 UserOp。 | EIP-1271 / EntryPoint |

### 1.2 工作流 (Workflows)

#### A. 管理员操作 (Admin Management)
用于 Protocol Admin 修改配置、转移所有权等高权限操作。

1.  **Admin Login**: 管理员使用 EOA (Locally) 连接 MetaMask。
2.  **Intention**: 在 Admin Portal 发起操作（例如 `configureRole`），MetaMask 弹出请求签名（**Sign Typed Data**，表明意图）。
3.  **Submission**: 前端将 `UserSignature` + `TransactionParams` 发送给后端 Management API。
4.  **KMS Validation**: 后端调用 KMS API：
    *   验证 `UserSignature` 是否来自授权 Admin。
    *   **Security Check**: 检查参数是否符合风控规则（如：不能将所有权转给黑名单地址）。
5.  **Execution**:
    *   **模式 1 (Safe Multisig)**: KMS 作为一个 Signer，自动签出第二份签名。交易被提交到 Gnosis Safe 执行。
    *   **模式 2 (Custody)**: KMS 直接作为 Owner 发送交易（仅限低风险操作）。

#### B. 用户/自动化操作 (User/Bot Operations)
用于 Operator 注册、自动化任务等。

1.  **Identity**: 使用 **Viem Custom Account** (Smart Account)。
2.  **Request**: 脚本/Bot 生成 UserOp。
3.  **KMS Signing**: 调用 KMS 接口请求签名。
    *   **Phase 1 (Initial)**: 仅验证请求来源 IP/Domain (Allowlist)。
    *   **Phase 2 (Passkey)**: 请求携带 Passkey 签名（硬件密钥），KMS 验证 Passkey 后放行。
4.  **On-Chain**: 交易上链执行。

## 2. API 抽象：Management Terminal to KMS

为了支持自定义 KMS，我们需要在管理端定义一套通用的 API 接口标准。KMS 服务端需实现这些接口。

### 2.1 基础配置与鉴权

*   **API Base URL**: `https://kms.internal.your-domain.com`
*   **Auth**: Bearer Token (JWT) 或 mTLS。

### 2.2 核心接口定义

#### 1. 交易预校验与签名 (Sign Transaction / UserOp)

用于请求 KMS 对交易或 UserOp 进行签名。

```typescript
// POST /api/v1/sign
interface SignRequest {
  // 意图证明
  userIntent?: {
    signer: string; // EOA Address
    signature: string; // EIP-712 Signature of the request payload
    timestamp: number;
    passkeyData?: any; // WebAuthn data (Phase 2)
  };

  // 交易上下文
  context: {
    chainId: number;
    contractAddress: string; // 交互的合约地址
    functionSelector: string; // 调用的方法
  };

  // 待签名数据 (Raw Transaction or UserOp)
  payload: {
    to: string;
    value: string;
    data: string;
    nonce?: number;
    gasLimit?: string;
    // ... UserOp fields if AA
  };
}

interface SignResponse {
  allowed: boolean;
  rejectReason?: string; // 如果被风控拦截
  signature?: string; // KMS 的签名结果 (Generic: ECDSA / BLS / etc.)
  signedTransaction?: string; // 完整的 RLP 编码交易 (可选)
}
```

#### 2. 策略查询 (Policy Check)

查询当前 KMS 对特定操作的限制规则。

```typescript
// GET /api/v1/policy/check
interface PolicyCheckRequest {
  user: string;
  action: 'transfer_ownership' | 'configure_role' | 'withdraw';
  params: any;
}

interface PolicyCheckResponse {
  status: 'APPROVED' | 'REQUIRES_2FA' | 'REJECTED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  message?: string;
}
```

#### 3. 密钥/账户管理 (Key Management - Admin Only)

```typescript
// POST /api/v1/keys/rotate
// 触发 KMS 内部密钥轮换
```

## 3. 客户端集成方案 (Viem Custom Account)

在管理端代码中，我们通过 `viem` 的 Custom Account 实现与 KMS 的无缝对接。

**`lib/kms-account.ts`**:

```typescript
import { type CustomSource, toAccount } from 'viem/accounts';

export async function createKmsAccount(kmsApiUrl: string, authToken: string): Promise<CustomSource> {
  return {
    address: '0x...', // Fetch from KMS /api/v1/public-key
    
    signMessage: async ({ message }) => {
      // Call KMS /api/v1/sign with message type
      const res = await fetch(`${kmsApiUrl}/sign`, { ... });
      return res.signature;
    },

    signTransaction: async (tx) => {
      // Call KMS /api/v1/sign with transaction type
      /* 
         这里是将 Intention (Local) 与 Security (Remote) 结合的关键点。
         如果需要 EOA 意图，这里可以先请求本地 EOA 对 tx hash 签名，
         然后把 EOA 签名作为 userIntent 传给 KMS。
      */
      const res = await fetch(`${kmsApiUrl}/sign`, {
        body: JSON.stringify({
          payload: tx,
          // userIntent: ... 
        })
      });
      
      if (!res.allowed) throw new Error(`KMS Rejected: ${res.rejectReason}`);
      return res.signature;
    },
    
    // signTypedData ...
  };
}
```

## 4. 安全演进路线 (Security Roadmap)

1.  **Phase 1: 域名/IP 白名单**
    *   KMS 仅验证请求来源是否为部署的 Management Terminal (Vercel IP / Domain)。
    *   适用于初期快速迭代，信任管理后台服务器。

2.  **Phase 2: Passkey / EOA 签名验证**
    *   引入 `userIntent` 字段。
    *   KMS 校验请求必须携带有效的管理员 Passkey 签名或 EOA 签名。
    *   实现真正的“意愿”与“安全”双重校验。

3.  **Phase 3: 多签与风控引擎**
    *   KMS 对接 Gnosis Safe，作为多签的一方 (Co-signer)。
    *   引入动态风控策略（例如：大额转账需 2 人批准，修改关键配置需 24h 时间锁）。

---

**总结**：
Registry V3 的 KMS 集成不仅仅是远程签名，而是一个 **"Intention-Verification-Execution"** 的完整安全闭环。管理端通过标准化的 API 与 KMS 交互，确保每一笔链上操作既符合用户意图，又通过了严格的安全审计。
