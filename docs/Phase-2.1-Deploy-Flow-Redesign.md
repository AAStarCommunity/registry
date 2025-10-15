# Phase 2.1: Deploy 流程完整重新设计

## 概述

根据 [SuperPaymaster-4-Phase-Development-Plan.md](../../SuperPaymaster/docs/SuperPaymaster-4-Phase-Development-Plan.md) 和 [Stake.md](../../docs/Stake.md)，重新设计 Operator Portal 的 Paymaster 部署流程。

## 核心目标

1. **完全移除 simulation 模式** - 实现真实的合约部署
2. **支持两个 Stake 分支** - 根据用户资源选择不同路径
3. **智能资源检查** - 自动检测用户拥有的资源并提供指导
4. **表单历史记录** - 记住用户之前填写的信息
5. **完整的用户引导** - 每一步都提供清晰的说明和帮助

---

## 新流程设计

### Step 1: 配置信息填写（带历史记录）

**组件**: `DeployConfigForm.tsx`

**功能**:
- 填写基本配置信息
- 支持表单历史记录（从 LocalStorage 加载）
- 实时验证
- 显示预估 gas 费用

**字段**:
```typescript
interface DeployConfig {
  communityName: string;        // 必填，历史记录
  treasury: string;              // 必填，地址格式验证，历史记录
  gasToUSDRate: string;          // 默认 4500，历史记录
  pntPriceUSD: string;           // 默认 0.02，历史记录
  serviceFeeRate: string;        // 默认 2，范围 0-10
  maxGasCostCap: string;         // 默认 0.1 ETH
  minTokenBalance: string;       // 默认 100 PNT
}

// LocalStorage 结构
interface FormHistory {
  treasuryAddresses: string[];   // 最近使用的 5 个地址
  gasToUSDRates: string[];       // 最近使用的 3 个值
  pntPriceUSDs: string[];        // 最近使用的 3 个值
  lastUsed: number;              // 时间戳
}
```

**UI 设计**:
- 输入框点击显示历史下拉列表
- 历史记录按时间排序，最近的在前
- 可删除单个历史记录
- "Clear All History" 按钮

---

### Step 2: 钱包检查

**组件**: `WalletChecker.tsx`

**功能**:
- 连接 MetaMask
- 检查所有相关资源的余额
- 提供资源不足时的解决方案

**检查项**:
```typescript
interface WalletStatus {
  isConnected: boolean;
  address: string;
  
  // 余额检查
  ethBalance: string;           // 用于部署和 gas
  gTokenBalance: string;        // 用于 Stake
  pntsBalance: string;          // 用于 Fast Stake Flow
  
  // 合约检查（可选）
  hasSBTContract: boolean;      // 是否已部署 SBT
  sbtContractAddress?: string;
  hasGasTokenContract: boolean; // 是否已部署 GasToken
  gasTokenAddress?: string;
  
  // 资源充足性
  hasEnoughETH: boolean;        // >= 0.05 ETH (部署 + gas)
  hasEnoughGToken: boolean;     // >= 最小 Stake 要求
  hasEnoughPNTs: boolean;       // >= 最小 Deposit 要求
}
```

**UI 展示**:
```
✅ ETH Balance: 0.5 ETH (Sufficient)
❌ GToken Balance: 0 GToken (Insufficient)
   → Get GToken: [Go to GToken Page]

✅ PNTs Balance: 1000 PNT (Sufficient)

⚠️ SBT Contract: Not deployed
   → You'll need to deploy SBT contract in Step 6

⚠️ GasToken Contract: Not deployed
   → You'll need to deploy GasToken contract in Step 6
```

**资源不足处理**:
- 如果 ETH 不足: 提供 Faucet 链接（Sepolia）或购买指南（Mainnet）
- 如果 GToken 不足: 跳转到 `/get-gtoken` 页面（新建）
- 如果 PNTs 不足: 跳转到 `/get-pnts` 页面（新建）

---

### Step 3: Stake 方案选择

**组件**: `StakeOptionSelector.tsx`

**功能**:
- 根据 Step 2 的检查结果，推荐合适的 Stake 方案
- 清晰展示两个方案的区别
- 用户选择后，显示详细的准备清单

**两个选项**:

#### Option 1: Standard ERC-4337 Flow
```
推荐给: ETH 持有者
要求:
  ✅ ETH >= 0.1 (部署 + Stake + Deposit)
  ✅ GToken >= 最小 Stake 要求

步骤:
  1. Deploy Paymaster Contract (需要 ~0.02 ETH gas)
  2. Stake ETH to EntryPoint (ERC-4337 标准)
  3. Deposit ETH to EntryPoint (用于 gas sponsorship)
  4. Stake GToken to Governance Contract
  
优点:
  ✨ 完全符合 ERC-4337 标准
  ✨ 直接控制 EntryPoint 中的 ETH
  
适合场景:
  - 已有充足的 ETH
  - 想要完全控制 gas 预算
```

#### Option 2: Fast Stake Flow
```
推荐给: GToken 持有者
要求:
  ✅ ETH >= 0.02 (仅部署 gas)
  ✅ GToken >= 最小 Stake 要求
  ✅ PNTs >= 最小 Deposit 要求

步骤:
  1. Deploy Paymaster Contract (需要 ~0.02 ETH gas)
  2. Stake GToken to Governance Contract
  3. Deposit PNTs (协议自动将 GToken→ETH)
  
优点:
  ✨ 更简单的流程（少 2 步）
  ✨ 不需要持有大量 ETH
  ✨ 协议自动处理 EntryPoint 要求
  
适合场景:
  - GToken 和 PNTs 充足，ETH 不多
  - 希望简化操作流程
```

**UI 设计**:
- 卡片式布局，两个选项并排
- 根据 WalletStatus 自动禁用不满足条件的选项
- 显示清晰的 "推荐" 标签
- 选择后展开详细的准备清单

---

### Step 4: 资源准备指导

**组件**: `ResourcePreparation.tsx`

**功能**:
- 根据选择的 Stake 方案，显示详细的准备清单
- 实时检查每一项是否完成
- 提供获取资源的具体指导

**Option 1 准备清单**:
```typescript
interface Option1Checklist {
  deployGas: {
    required: "0.02 ETH";
    current: string;
    sufficient: boolean;
    action: "确保钱包中有足够 ETH";
  };
  
  stakeETH: {
    required: "0.05 ETH";
    current: string;
    sufficient: boolean;
    action: "准备用于 Stake 到 EntryPoint 的 ETH";
  };
  
  depositETH: {
    required: "0.1 ETH";
    current: string;
    sufficient: boolean;
    action: "准备用于 Deposit 到 EntryPoint 的 ETH";
  };
  
  gToken: {
    required: "1000 GToken";
    current: string;
    sufficient: boolean;
    action: "获取 GToken";
    link: "/get-gtoken";
  };
}
```

**Option 2 准备清单**:
```typescript
interface Option2Checklist {
  deployGas: {
    required: "0.02 ETH";
    current: string;
    sufficient: boolean;
    action: "确保钱包中有足够 ETH";
  };
  
  gToken: {
    required: "1000 GToken";
    current: string;
    sufficient: boolean;
    action: "获取 GToken";
    link: "/get-gtoken";
  };
  
  pnts: {
    required: "500 PNT";
    current: string;
    sufficient: boolean;
    action: "获取 PNTs";
    link: "/get-pnts";
  };
}
```

**UI 展示**:
```
资源准备清单 (Option 2: Fast Stake Flow)

✅ 1. 部署 Gas Fee
   需要: 0.02 ETH
   当前: 0.5 ETH
   状态: 充足 ✅

❌ 2. GToken Stake
   需要: 1000 GToken
   当前: 0 GToken
   状态: 不足 ❌
   操作: [获取 GToken →]

✅ 3. PNTs Deposit
   需要: 500 PNT
   当前: 1000 PNT
   状态: 充足 ✅

[点击检查] 按钮 - 重新检查所有余额
[继续部署] 按钮 - 仅在所有项都✅时可点击
```

---

### Step 5: 执行部署

**组件**: `DeploymentExecutor.tsx`

**功能**:
- 真实部署 PaymasterV4_1 合约
- 显示详细的部署进度
- 处理部署错误
- 保存合约地址到 LocalStorage

**部署流程**:
```typescript
interface DeploymentProgress {
  step: number;
  total: number;
  status: 'pending' | 'processing' | 'success' | 'error';
  message: string;
  txHash?: string;
}

// 部署步骤
const DEPLOYMENT_STEPS = [
  {
    step: 1,
    title: "准备部署参数",
    action: "prepareParameters",
  },
  {
    step: 2,
    title: "部署 PaymasterV4_1 合约",
    action: "deployContract",
    estimatedGas: "~0.02 ETH",
  },
  {
    step: 3,
    title: "等待交易确认",
    action: "waitForConfirmation",
    expectedTime: "~15 seconds",
  },
  {
    step: 4,
    title: "验证合约部署",
    action: "verifyDeployment",
  },
  {
    step: 5,
    title: "保存合约信息",
    action: "saveContractInfo",
  },
];
```

**UI 展示**:
```
部署进度

✅ 1. 准备部署参数
   完成

🔄 2. 部署 PaymasterV4_1 合约
   交易已发送: 0xabcd...1234
   预计 gas: 0.018 ETH
   [在 Etherscan 查看 →]

⏳ 3. 等待交易确认
   预计时间: ~15 seconds

⏳ 4. 验证合约部署

⏳ 5. 保存合约信息
```

**错误处理**:
- Gas 估算失败 → 提示用户增加 gas limit
- 交易被拒绝 → 提示用户检查钱包
- 部署失败 → 显示详细错误信息，提供重试按钮
- 网络问题 → 提示切换 RPC 或稍后重试

---

### Step 6: 后续配置

**组件**: `PostDeployConfig.tsx`

**功能**:
- 部署或配置 SBT 合约
- 部署或配置 GasToken (PNTs) 合约
- Mint 初始代币给自己
- 配置 Paymaster 参数

**流程**:

#### 6.1 SBT 合约配置

```typescript
interface SBTConfig {
  option: 'deploy' | 'use-existing';
  
  // 如果选择部署
  deploy?: {
    name: string;           // 例如: "MyDAO SBT"
    symbol: string;         // 例如: "MDAO"
    baseURI: string;        // NFT metadata URI
    mintAmount: number;     // 给自己 mint 多少个
  };
  
  // 如果选择使用已有
  useExisting?: {
    address: string;        // SBT 合约地址
    verified: boolean;      // 是否验证可用
  };
}
```

**UI 展示**:
```
SBT (Soul Bound Token) 配置

SBT 用于身份验证，用户必须持有 SBT 才能使用 Paymaster。

选项 1: 部署新的 SBT 合约 [推荐]
  └─ Name: [MyDAO SBT]
  └─ Symbol: [MDAO]
  └─ Base URI: [https://metadata.mydao.com/sbt/]
  └─ Mint to yourself: [1] SBT
  └─ [部署 SBT 合约]

选项 2: 使用已有的 SBT 合约
  └─ SBT Address: [0x...]
  └─ [验证合约]
```

#### 6.2 GasToken (PNTs) 合约配置

```typescript
interface GasTokenConfig {
  option: 'deploy' | 'use-existing';
  
  deploy?: {
    name: string;           // 例如: "MyDAO Points"
    symbol: string;         // 例如: "MDP"
    decimals: number;       // 默认 18
    initialSupply: string;  // 初始供应量
    mintToSelf: string;     // Mint 给自己的数量
  };
  
  useExisting?: {
    address: string;
    verified: boolean;
  };
}
```

**UI 展示**:
```
GasToken (PNTs) 配置

PNTs 是用户用来支付 gas 的代币。

选项 1: 部署新的 ERC20 代币 [推荐]
  └─ Name: [MyDAO Points]
  └─ Symbol: [MDP]
  └─ Decimals: [18]
  └─ Initial Supply: [1000000] MDP
  └─ Mint to yourself: [10000] MDP
  └─ [部署 GasToken 合约]

选项 2: 使用已有的 ERC20 代币
  └─ Token Address: [0x...]
  └─ [验证合约]
```

#### 6.3 配置 Paymaster

```typescript
interface PaymasterFinalConfig {
  sbtAddress: string;
  gasTokenAddress: string;
  
  // 可选的其他配置
  additionalSBTs?: string[];      // 其他允许的 SBT
  additionalGasTokens?: string[]; // 其他允许的 GasToken
  
  // 权限配置
  grantAccessTo?: string[];       // 授权给其他地址管理权限
}
```

**完成后**:
```
✅ 部署完成！

您的 Paymaster 信息:
━━━━━━━━━━━━━━━━━━━━━━━
📍 Paymaster: 0xABCD...1234
🪪 SBT Contract: 0xEF12...5678
💰 GasToken: 0x3456...9ABC

下一步:
1. ✅ 执行 Stake (根据您选择的方案)
2. ✅ 注册到 Registry
3. ✅ 开始接受 gas payment 请求

[进入管理界面] [查看详情]
```

---

## 新建的辅助页面

### `/get-gtoken` - 获取 GToken

**功能**:
- 说明什么是 GToken
- 如何获取 GToken
- 提供购买/交换链接

**内容**:
```
什么是 GToken？
GToken 是 SuperPaymaster 生态的治理代币，用于:
- Stake 到 Governance Contract (准入门槛)
- 提升 Reputation (信用评级)
- 参与治理投票

如何获取 GToken？

方法 1: 在 Uniswap 购买 [推荐]
  → [去 Uniswap]

方法 2: 在 SuperPaymaster DEX 兑换
  → [去 DEX]

方法 3: 参与社区活动获得
  → [查看活动]

Sepolia 测试网:
  → [领取测试 GToken] (Faucet)
```

---

### `/get-pnts` - 获取 PNTs

**功能**:
- 说明什么是 PNTs
- 如何获取 PNTs
- 提供购买/交换链接

**内容**:
```
什么是 PNTs？
PNTs 是 SuperPaymaster 协议中的通用积分，用于:
- 用户支付 gas 费用
- 在 Fast Stake Flow 中作为 Deposit

如何获取 PNTs？

方法 1: 使用 GToken 兑换
  → [兑换 PNTs]

方法 2: 在 SuperPaymaster Pool 购买
  → [去 Pool]

方法 3: 社区空投
  → [查看空投资格]

Sepolia 测试网:
  → [领取测试 PNTs] (Faucet)
```

---

## 技术实现细节

### 表单历史记录实现

```typescript
// utils/formHistory.ts

const HISTORY_KEY_PREFIX = 'deploy_form_history_';
const MAX_HISTORY_ITEMS = 5;

interface HistoryItem {
  value: string;
  timestamp: number;
}

export function saveToHistory(fieldName: string, value: string) {
  const key = `${HISTORY_KEY_PREFIX}${fieldName}`;
  const existing = loadHistory(fieldName);
  
  // 去重
  const filtered = existing.filter(item => item.value !== value);
  
  // 添加新项到开头
  const updated = [
    { value, timestamp: Date.now() },
    ...filtered
  ].slice(0, MAX_HISTORY_ITEMS);
  
  localStorage.setItem(key, JSON.stringify(updated));
}

export function loadHistory(fieldName: string): HistoryItem[] {
  const key = `${HISTORY_KEY_PREFIX}${fieldName}`;
  const data = localStorage.getItem(key);
  
  if (!data) return [];
  
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function clearHistory(fieldName: string) {
  const key = `${HISTORY_KEY_PREFIX}${fieldName}`;
  localStorage.removeItem(key);
}

export function clearAllHistory() {
  Object.keys(localStorage)
    .filter(key => key.startsWith(HISTORY_KEY_PREFIX))
    .forEach(key => localStorage.removeItem(key));
}
```

---

### 钱包余额检查实现

```typescript
// utils/walletChecker.ts

export async function checkWalletStatus(
  provider: ethers.BrowserProvider,
  address: string
): Promise<WalletStatus> {
  const [
    ethBalance,
    gTokenBalance,
    pntsBalance,
    sbtInfo,
    gasTokenInfo
  ] = await Promise.all([
    provider.getBalance(address),
    checkGTokenBalance(provider, address),
    checkPNTsBalance(provider, address),
    checkSBTContract(provider, address),
    checkGasTokenContract(provider, address),
  ]);
  
  return {
    isConnected: true,
    address,
    ethBalance: ethers.formatEther(ethBalance),
    gTokenBalance: ethers.formatUnits(gTokenBalance, 18),
    pntsBalance: ethers.formatUnits(pntsBalance, 18),
    hasSBTContract: sbtInfo.exists,
    sbtContractAddress: sbtInfo.address,
    hasGasTokenContract: gasTokenInfo.exists,
    gasTokenAddress: gasTokenInfo.address,
    hasEnoughETH: ethBalance >= ethers.parseEther("0.05"),
    hasEnoughGToken: gTokenBalance >= ethers.parseUnits("1000", 18),
    hasEnoughPNTs: pntsBalance >= ethers.parseUnits("500", 18),
  };
}
```

---

## 文件结构

```
src/pages/operator/
├── deploy-v2/                      # 新的部署流程
│   ├── DeployWizard.tsx           # 主向导组件
│   ├── steps/
│   │   ├── Step1_ConfigForm.tsx
│   │   ├── Step2_WalletCheck.tsx
│   │   ├── Step3_StakeOption.tsx
│   │   ├── Step4_ResourcePrep.tsx
│   │   ├── Step5_Deploy.tsx
│   │   └── Step6_PostConfig.tsx
│   ├── components/
│   │   ├── HistoryDropdown.tsx    # 历史记录下拉组件
│   │   ├── WalletStatus.tsx       # 钱包状态显示
│   │   ├── StakeOptionCard.tsx    # Stake 方案卡片
│   │   ├── ChecklistItem.tsx      # 准备清单项
│   │   └── DeployProgress.tsx     # 部署进度条
│   └── utils/
│       ├── formHistory.ts
│       ├── walletChecker.ts
│       ├── deployment.ts
│       └── validation.ts
│
├── resources/                      # 资源获取页面
│   ├── GetGToken.tsx
│   └── GetPNTs.tsx
│
└── DeployPaymaster.tsx            # 旧版本（保留作为参考）
```

---

## 开发计划

### Phase 2.1.1: 基础组件 (1-2天)
- [ ] 实现表单历史记录功能
- [ ] 创建 HistoryDropdown 组件
- [ ] 创建 Step1_ConfigForm 组件

### Phase 2.1.2: 钱包检查 (1天)
- [ ] 实现 walletChecker.ts
- [ ] 创建 WalletStatus 组件
- [ ] 创建 Step2_WalletCheck 组件

### Phase 2.1.3: Stake 方案 (1天)
- [ ] 创建 StakeOptionCard 组件
- [ ] 创建 Step3_StakeOption 组件
- [ ] 实现方案推荐逻辑

### Phase 2.1.4: 资源准备 (1天)
- [ ] 创建 ChecklistItem 组件
- [ ] 创建 Step4_ResourcePrep 组件
- [ ] 创建 GetGToken 和 GetPNTs 页面

### Phase 2.1.5: 真实部署 (2天)
- [ ] 实现 deployment.ts
- [ ] 创建 DeployProgress 组件
- [ ] 创建 Step5_Deploy 组件
- [ ] 集成 PaymasterV4_1 工厂合约

### Phase 2.1.6: 后续配置 (1天)
- [ ] 创建 Step6_PostConfig 组件
- [ ] 实现 SBT 部署逻辑
- [ ] 实现 GasToken 部署逻辑

### Phase 2.1.7: 集成测试 (1天)
- [ ] 端到端测试
- [ ] 错误处理测试
- [ ] 用户体验优化

**总计**: 约 8-9 天

---

## 成功标准

✅ **必须满足**:
1. 完全移除 simulation 模式
2. 真实部署 PaymasterV4_1 合约
3. 支持两个 Stake 分支选择
4. 表单历史记录功能完整
5. 钱包余额检查准确
6. 部署成功率 > 95%

✅ **用户体验**:
1. 每一步都有清晰的说明
2. 错误信息友好且可操作
3. 加载状态明确
4. 支持返回上一步修改

✅ **技术质量**:
1. TypeScript 类型完整
2. 错误处理健全
3. 代码可维护
4. 性能优秀

---

## 参考文档
- [SuperPaymaster-4-Phase-Development-Plan.md](../../SuperPaymaster/docs/SuperPaymaster-4-Phase-Development-Plan.md)
- [Stake.md](../../docs/Stake.md)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
