# Registry V3: 混合环境与 KMS 签名架构方案

本文档详细描述了如何改造 Registry Admin 系统，使其支持**本地开发（.env 私钥）**与**生产环境（AWS KMS）**的无缝切换，同时保持管理后台的正常运行。

## 1. 核心目标

1.  **环境隔离**：
    *   **Local**: 开发者使用本地 `.env` 文件中的私钥进行快速调试。
    *   **Production**: 部署在 Vercel 上，但**严禁**将私钥直接作为环境变量注入。使用 AWS KMS (Key Management Service) 进行远程签名。
2.  **安全性**：确保私钥永远不会离开安全存储区域（KMS HSM 或本地受控环境）。
3.  **功能完整**：Admin 后台的所有写操作（配置角色、转移权限等）需适配服务端签名流程。

## 2. 架构变更：从 "DApp 模式" 到 "混合模式"

目前的 Registry 是一个纯前端 DApp（直接连接 MetaMask）。要引入 KMS，我们需要将**写操作**（Write Operations）下沉到 Vercel Serverless Functions（后端 API）。

### 2.1 架构对比

| 特性 | 当前 (纯 DApp) | 目标 (混合 KMS) |
| :--- | :--- | :--- |
| **私钥持有者** | 用户 (MetaMask/Ledger) | **Server (KMS / Local Env)** |
| **交易发起方** | 前端 Browser | **后端 API (Vercel Function)** |
| **鉴权方式** | 钱包签名 | **Web 2.0 Auth (Login/JWT)** + 链上权限校验 |
| **适用场景** | 个人管理员操作 | 自动化任务 / 托管式 Admin / 团队协作 |

> **⚠️ 关键决策**：如果你的目标是让 Admin 依然用自己的 MetaMask 签名，但只是部署在 Vercel 上，那么**不需要 KMS**。只有当你希望**系统自动签名**或者**Admin 不持有私钥**时，才需要此方案。
> 下文假设你的需求是 **"托管式 Admin" (Backend Signing)**。

## 3. 技术实施方案

### 3.1 目录结构调整

需要在 `api/` 目录下扩展更多的 Serverless Functions。

```
projects/registry/
├── api/
│   ├── rpc-proxy.ts          # [现有] 只读 RPC 代理
│   ├── auth/                 # [新增] 登录与鉴权
│   │   └── session.ts
│   └── admin/                # [新增] 管理操作 API
│       ├── configure-role.ts # POST: 修改角色配置
│       └── transfer-owner.ts # POST: 转移所有权
├── lib/
│   ├── signer/               # [新增] 签名器抽象
│   │   ├── interface.ts
│   │   ├── local-signer.ts   # .env 实现
│   │   └── kms-signer.ts     # AWS KMS 实现
│   └── contracts.ts          # 合约实例封装
```

### 3.2 抽象签名层 (Signer Service)

利用 `viem` 的强大扩展性，创建一个统一的 `SmartAccount` 或 `CustomAccount`。

**`lib/signer/factory.ts`**:

```typescript
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
// import { getKmsAccount } from './kms-signer'; // 需实现

export async function getAdminSigner() {
  const chainId = process.env.CHAIN_ID || 11155111;
  const transport = http(process.env.SEPOLIA_RPC_URL);

  // 1. 本地模式：使用 .env 私钥
  if (process.env.USE_LOCAL_SIGNER === 'true') {
    if (!process.env.ADMIN_PRIVATE_KEY) throw new Error("Missing ADMIN_PRIVATE_KEY");
    
    // ⚠️ 仅本地开发使用
    const account = privateKeyToAccount(process.env.ADMIN_PRIVATE_KEY as `0x${string}`);
    return createWalletClient({ account, chain: /*...*/, transport });
  }

  // 2. 生产模式：使用 AWS KMS
  // 需要安装 @aws-sdk/client-kms 和 viem-kms-signer (或自定义实现)
  /*
  const kmsAccount = await getKmsAccount({
    keyId: process.env.AWS_KMS_KEY_ID,
    region: process.env.AWS_REGION,
    credentials: { ... }
  });
  
  return createWalletClient({ account: kmsAccount, chain: ..., transport });
  */
}
```

### 3.3 后端 API 实现示例

**`api/admin/configure-role.ts`**:

```typescript
import { getAdminSigner } from '../../lib/signer/factory';
// import { checkAuth } from '../../lib/auth'; // 必须有鉴权！

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // 1. 安全检查 (至关重要)
  // const user = await checkAuth(req);
  // if (!user.isAdmin) return res.status(403).json({ error: "Unauthorized" });

  try {
    const { roleId, minStake, entryBurn } = req.body;
    
    // 2. 获取签名器 (Local 或 KMS)
    const walletClient = await getAdminSigner();
    
    // 3. 发送交易
    // 注意：Registry 合约必须通过 AccessControl 授权给这个 KMS Key 的地址
    // const hash = await walletClient.writeContract({
    //   address: REGISTRY_ADDRESS,
    //   abi: RegistryABI,
    //   functionName: 'adminConfigureRole',
    //   args: [roleId, minStake, ...],
    // });

    return res.json({ txHash: '0x...' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
```

## 4. 安全评估与改进建议

### 4.1 风险分析

| 风险点 | 描述 | 缓解措施 (Mitigation) |
| :--- | :--- | :--- |
| **API 滥用** | 如果 `api/admin/*` 接口暴露，黑客可随意调用消耗 Gas 或篡改配置。 | **必须集成强鉴权** (如 NextAuth, Clerk)。仅允许白名单 User ID 调用。 |
| **KMS 权限过大** | 如果 Vercel 被攻破，攻击者可能获得 KMS 调用权限。 | **AWS IAM 策略限制**：限制该 Key 只能签名为特定合约的交易（较难实现）或设置 KMS 使用限额。 |
| **交易卡死** | Vercel Function 执行超时 (默认 10s)，等待区块链确认可能导致超时。 | **异步架构**：API 仅返回 txHash，前端轮询状态。不要在 API 里 `waitForTransactionReceipt`。 |
| **Nonce 冲突** | 高并发下，KMS 签名速度慢，可能导致 Nonce 混乱。 | 使用 Redis 管理 Nonce，或依赖 KMS 自身的序列化能力（通常 KMS 并不管 Nonce）。 |

### 4.2 推荐技术栈

1.  **KMS 库**: 使用 `viem` 的 Account Abstraction 能力。
    *   推荐库: 暂无官方 KMS 适配，需手写 `toAccount` 适配器（调用 `kms.sign`）。
2.  **Auth**: **NextAuth.js** (适配 Vercel 完美)。
    *   配置 Google/GitHub 登录。
    *   在环境变量配置 `ADMIN_EMAILS=jason@example.com`，API 仅放行这些邮箱。
3.  **Vercel Config**:
    *   设置 Function Timeout 为 60s (Pro plan) 或使用 Edge Functions (如果不涉及重型 Node 库)。

## 5. 迁移路线图

1.  **阶段一：基础设施 (Done)**
    *   ✅ 完成前端重构，支持 Proxy。
    *   ✅ 确保合约逻辑清晰。

2.  **阶段二：后端签名器开发**
    *   在 `lib/` 下实现 `LocalSigner` 和 `KmsSigner`。
    *   编写一个简单的测试脚本验证 KMS 签名能否被链上接受（Signature Recovery）。

3.  **阶段三：API 端点开发**
    *   实现 `/api/admin/configure` 等接口。
    *   在前端 `AdminPortal` 增加 "Server Mode" 开关：
        *   Client Mode: `useRegistry` 调用 MetaMask。
        *   Server Mode: `useRegistry` 调用 `fetch('/api/admin/...')`。

4.  **阶段四：部署与配置**
    *   在 AWS 创建 KMS Key (ECC_SECG_P256K1)。
    *   获取 KMS Key 的 Public Key -> 算出 Ethereum Address。
    *   **重要**：将 Registry 合约的 `DEFAULT_ADMIN_ROLE` 或相应管理权限 `grantRole` 给这个 **KMS Address**。

---

**总结**：
只要引入服务端签名（KMS），本质上就是引入了一套 **Web 2.0 的权限管理系统** 来保护 Web 3.0 的私钥。请务必把守好 API 接口的大门（Auth）。
