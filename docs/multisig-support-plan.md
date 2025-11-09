# 多签钱包支持实施方案

**日期**：2025-11-09
**状态**：P0 已完成，P1-P2 待实施
**相关合约**：Registry v2.2.0, PaymasterV4.1, SuperPaymasterV2, MySBT v2.4.3

---

## 📊 现状评估

### 1. 管理功能清单

| 功能 | 页面路径 | 实现状态 | Safe 支持 | 使用的合约 | 优先级 |
|------|---------|---------|----------|-----------|--------|
| **社区信息管理** | `/register-community` | ✅ 完成 | ❌ 无 | Registry v2.2.0 | P0 |
| **Paymaster AOA 管理** | `/operator/manage` | ✅ 完成 | ❌ 无 | PaymasterV4.1 | P1 |
| **Paymaster AOA+ 管理** | ConfigureSuperPaymaster | 🚧 开发中 | ❌ 无 | SuperPaymasterV2 | P1 |
| **Mint xPNTs** | `/get-xpnts` | ✅ 完成 | ❌ 无 | xPNTsFactory | P2 |
| **Bind/Mint SBT** | `/mysbt` | ✅ 完成 | ✅ **已支持** | MySBT v2.4.3 | - |
| **Stake/Unstake GToken** | `/get-gtoken` | ✅ 完成 | ❌ 无 | GTokenStaking | P1 |

### 2. 合约地址存储分析

**支持多签的关键字段**：

| 合约 | 字段 | 说明 | 当前类型 |
|------|------|------|---------|
| **Registry** | communities[].community | 社区所有者（已支持任意地址） | address |
| **PaymasterV4Base** | owner | Paymaster 所有者（单地址） | address |
| **PaymasterV4Base** | treasury | 收费地址（已支持任意地址） | address |
| **SuperPaymasterV2** | accounts[].treasury | 运营商收费地址（已支持任意地址） | address |
| **GTokenStaking** | owner | Staking 合约所有者（单地址） | address |
| **MySBT** | daoMultisig | DAO 多签地址（已支持） | address |

**转移所有权的关键函数**：

```solidity
// Registry v2.2.0
function transferCommunityOwnership(address newOwner) external onlyCommunity

// Ownable 合约（PaymasterV4, GTokenStaking 等）
function transferOwnership(address newOwner) external onlyOwner

// PaymasterV4Base
function setTreasury(address newTreasury) external onlyOwner

// SuperPaymasterV2
function updateTreasury(address newTreasury) external
```

---

## ✅ 已完成工作（P0）

### Task 1: Step3_Complete 页面 - 多签转移指引

**实现内容**：
- ✅ 添加安全建议卡片
- ✅ 展示多签优势（防止单点故障、多重审批、团队治理）
- ✅ "Create Gnosis Safe Multisig" 按钮 → https://app.safe.global/new-safe
- ✅ "Transfer Community Ownership" 按钮 → /register-community?action=transfer
- ✅ 说明调用 `Registry.transferCommunityOwnership(newOwner)` 方法

**文件修改**：
- `src/pages/operator/deploy-v2/steps/Step3_Complete.tsx` - UI 组件
- `src/pages/operator/deploy-v2/steps/Step3_Complete.css` - 样式（黄色警告卡片）

**效果**：
```
🔐 Security Recommendation: Transfer to Multisig Account

For production use, we strongly recommend transferring community ownership
to a Gnosis Safe multisig wallet instead of using a single EOA account.

✅ Prevent single point of failure (lost private key)
✅ Require multiple approvals for critical operations
✅ Enable team-based governance

[🛡️ Create Gnosis Safe Multisig ↗] [🔄 Transfer Community Ownership ↗]

Note: After creating a Safe multisig, use the Transfer button to call
Registry.transferCommunityOwnership(newOwner) to transfer ownership.
```

---

## 🎯 实施计划

### P1（中优先级）- 核心管理页面 Safe 支持

#### 1.1 RegisterCommunity.tsx - 社区管理

**需要实现的功能**：
```typescript
// 1. 引入 useSafeApp hook
const { sdk, safe, isSafeApp } = useSafeApp();

// 2. 检测 action 参数
const params = new URLSearchParams(location.search);
const action = params.get('action'); // "transfer" | null

// 3. 添加 Transfer Ownership 功能
if (action === 'transfer') {
  // 显示转移表单
  // 输入新所有者地址（Safe 地址）
  // 调用 Registry.transferCommunityOwnership(newOwner)
}

// 4. Safe/MetaMask 双模式支持
if (isSafeApp && sdk) {
  // Safe 模式
  await sdk.txs.send({ txs: [transferTx] });
} else {
  // MetaMask 模式
  const tx = await registry.transferCommunityOwnership(newOwner);
  await tx.wait();
}
```

**估计工作量**：4-6 小时

---

#### 1.2 ManagePaymasterAOA.tsx - Paymaster 管理

**需要添加 Safe 支持的操作**：
- ✅ 暂停/恢复 Paymaster (`pause()` / `unpause()`)
- ✅ 修改配置 (`setServiceFeeRate`, `setMaxGasCostCap`, etc.)
- ✅ 添加/移除 SBT 支持 (`setSupportedSBT`)
- ✅ 添加/移除 Gas Token (`addGasToken` / `removeGasToken`)
- ✅ 修改 Treasury (`setTreasury`)
- ✅ EntryPoint 充值 (`depositTo`)

**实现模式**：
```typescript
const { sdk, safe, isSafeApp } = useSafeApp();

// 批量交易支持
const transactions: BaseTransaction[] = [
  {
    to: paymasterAddress,
    value: '0',
    data: paymaster.interface.encodeFunctionData('setServiceFeeRate', [newRate])
  },
  {
    to: entryPointAddress,
    value: depositAmount,
    data: entryPoint.interface.encodeFunctionData('depositTo', [paymasterAddress])
  }
];

if (isSafeApp && sdk) {
  await sdk.txs.send({ txs: transactions });
} else {
  // MetaMask - 顺序执行
  for (const tx of transactions) {
    await signer.sendTransaction(tx);
  }
}
```

**估计工作量**：6-8 小时

---

#### 1.3 GetGToken.tsx - GToken Stake/Unstake

**需要添加 Safe 支持的操作**：
- ✅ Stake GToken (`stake(amount)`)
- ✅ Unstake GToken (`unstake(amount)`)
- ✅ Approve GToken (`approve(spender, amount)`)

**实现模式**：
```typescript
// 需要两步交易：approve + stake
const transactions: BaseTransaction[] = [
  {
    to: gTokenAddress,
    value: '0',
    data: gToken.interface.encodeFunctionData('approve', [stakingAddress, amount])
  },
  {
    to: stakingAddress,
    value: '0',
    data: staking.interface.encodeFunctionData('stake', [amount])
  }
];

if (isSafeApp && sdk) {
  // Safe 原子提交两个交易
  await sdk.txs.send({ txs: transactions });
}
```

**估计工作量**：3-4 小时

---

### P2（低优先级）- 可选功能

#### 2.1 GetXPNTs.tsx - xPNTs 管理
- 部署 xPNTs（已支持 MetaMask）
- 添加 Safe 支持
**估计工作量**：3 小时

#### 2.2 GetSBT.tsx - SBT 铸造
- 可以直接引导到 `/mysbt`（已支持 Safe）
- 或添加简化的 Safe 支持
**估计工作量**：2 小时

---

## 🔧 技术实现

### 核心 Hook：useSafeApp

**文件位置**：`src/hooks/useSafeApp.ts`

**功能**：
```typescript
export interface SafeInfo {
  safeAddress: string;
  threshold: number;
  owners: string[];
  chainId: number;
  isReadOnly: boolean;
}

export function useSafeApp() {
  const [sdk, setSdk] = useState<SafeAppsSDK | null>(null);
  const [safe, setSafe] = useState<SafeInfo | null>(null);
  const [isSafeApp, setIsSafeApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 自动检测 Safe App 环境
  // 返回 Safe SDK 实例和信息
}
```

**使用示例**（参考 MySBT.tsx）：
```typescript
const { sdk, safe, isSafeApp, isLoading } = useSafeApp();

if (isLoading) {
  return <Loading />;
}

if (isSafeApp && sdk && safe) {
  console.log('Running in Safe App:', safe.safeAddress);
  console.log('Threshold:', safe.threshold);
  console.log('Owners:', safe.owners);
}
```

### Safe 交易构建

**BaseTransaction 接口**：
```typescript
interface BaseTransaction {
  to: string;
  value: string;
  data: string;
}
```

**提交交易**：
```typescript
// Safe SDK 提交
await sdk.txs.send({
  txs: transactions,
  params: { safeTxGas: 500000 } // 可选
});

// 返回交易哈希（待审批）
// 用户需要在 Safe UI 中审批和执行
```

---

## 📈 优先级和时间线

### 阶段 1（P0 - 已完成）：
- ✅ Step3_Complete 添加多签转移指引

### 阶段 2（P1 - 2-3 周）：
1. RegisterCommunity Safe 支持（4-6h）
2. ManagePaymasterAOA Safe 支持（6-8h）
3. GetGToken Safe 支持（3-4h）

### 阶段 3（P2 - 可选）：
4. GetXPNTs Safe 支持（3h）
5. GetSBT Safe 支持（2h）或引导到 MySBT

**总估计工作量**：20-25 小时

---

## 🔐 安全考虑

### 当前风险

1. **社区所有者为 EOA**：
   - 私钥丢失 → 社区永久失控
   - 私钥泄露 → 社区被恶意转移

2. **Paymaster owner 为 EOA**：
   - 无法修改配置
   - 无法暂停合约
   - 资金可能被恶意提取

3. **缺乏多重审批**：
   - 单个签名即可执行关键操作
   - 没有时间锁保护

### 多签方案优势

1. **防止单点故障**：
   - M-of-N 签名方案（如 2-of-3, 3-of-5）
   - 密钥分散存储

2. **团队治理**：
   - 多个团队成员共同管理
   - 提高透明度

3. **安全操作**：
   - 重要操作需要多重审批
   - 降低恶意操作风险

---

## 📚 参考资料

### Gnosis Safe
- **官网**：https://safe.global/
- **创建 Safe**：https://app.safe.global/new-safe
- **Safe Apps SDK**：https://github.com/safe-global/safe-apps-sdk
- **Safe App 开发文档**：https://docs.safe.global/safe-core-aa-sdk/safe-apps

### 合约文档
- **Registry v2.2.0**：`SuperPaymaster/docs/Registry-v2.2.0.md`
- **PaymasterV4.1**：`SuperPaymaster/docs/PaymasterV4.1.md`
- **Address Storage Analysis**：`SuperPaymaster/docs/address-storage-analysis.md`

### 代码示例
- **Safe 支持参考**：`src/pages/resources/MySBT.tsx`
- **Hook 实现**：`src/hooks/useSafeApp.ts`

---

## 🎬 下一步行动

### 立即可做（用户）：
1. ✅ 访问 https://app.safe.global/new-safe 创建多签钱包
2. ✅ 完成资源部署后，点击 "Transfer Community Ownership" 按钮
3. ✅ 输入 Safe 地址，转移社区所有权

### 开发任务（下一阶段）：
1. ⏳ RegisterCommunity 添加 Safe 支持
2. ⏳ ManagePaymasterAOA 添加 Safe 支持
3. ⏳ GetGToken 添加 Safe 支持

---

**文档版本**：v1.0
**最后更新**：2025-11-09
**维护者**：AAstar Dev Team
