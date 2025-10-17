# SuperPaymaster Registry 用户指南

## 目录

1. [应用概述](#应用概述)
2. [主要功能模块](#主要功能模块)
3. [操作员 (Operator) 完整流程](#操作员-operator-完整流程)
4. [开发者 (Developer) 集成指南](#开发者-developer-集成指南)
5. [浏览器 (Explorer) 使用说明](#浏览器-explorer-使用说明)
6. [常见问题](#常见问题)

---

## 应用概述

**SuperPaymaster Registry** 是一个去中心化的 Gasless 交易基础设施平台，基于 ERC-4337 标准。

### 核心概念

- **Paymaster**: 代付 Gas 费用的智能合约，让用户可以无需持有 ETH 即可发送交易
- **Entry Point v0.7**: ERC-4337 标准的入口合约
- **Registry**: Paymaster 注册中心，管理所有已注册的 Paymaster
- **PNT (Paymaster Native Token)**: 平台原生代币，用于支付 Gas 费用
- **GToken**: 质押代币，用于注册到 Registry

### 应用架构

```
主页 (Landing Page)
├── 开发者门户 (Developer Portal) - 集成 Paymaster 到你的 dApp
├── 操作员门户 (Operator Portal) - 部署和管理 Paymaster
└── 浏览器 (Explorer) - 查看所有已注册的 Paymaster
```

---

## 主要功能模块

### 1. 首页 (/)

**访问方式**: http://localhost:5173/

**功能**:
- 显示平台统计数据（Paymaster 数量、交易数、节省费用）
- 三个核心功能入口：
  - 🔍 探索注册中心 (Explore Registry)
  - 👨‍💻 开发者门户 (Developer Portal)
  - 🏪 操作员门户 (Operator Portal)

**截图说明**:
```
┌─────────────────────────────────────┐
│   SuperPaymaster Registry           │
│   去中心化 Gasless 交易基础设施      │
│                                     │
│   [🔍 Explore Registry]             │
│   [👨‍💻 Developer Portal]            │
│   [🏪 Operator Portal]               │
│                                     │
│   统计数据:                         │
│   🏪 156 Community Paymasters       │
│   ⚡ 89,234 Gasless Transactions   │
│   💰 $4,567 Gas Fees Saved         │
└─────────────────────────────────────┘
```

---

### 2. 操作员门户 (/operator)

**访问方式**: http://localhost:5173/operator

**功能**: 操作员可以：
- 部署新的 Paymaster
- 管理现有的 Paymaster
- 查看收益统计

**主要操作**:
1. **Deploy New Paymaster** - 部署新的 Paymaster 合约
2. **Manage Existing** - 管理已部署的 Paymaster
3. **View Earnings** - 查看收益数据

---

### 3. 开发者门户 (/developer)

**访问方式**: http://localhost:5173/developer

**功能**: 开发者可以：
- 查看 SDK 文档
- 获取集成代码示例
- 测试 Paymaster 集成

---

### 4. 浏览器 (/explorer)

**访问方式**: http://localhost:5173/explorer

**功能**:
- 浏览所有已注册的 Paymaster
- 查看每个 Paymaster 的详细信息
- 过滤和搜索 Paymaster

---

## 操作员 (Operator) 完整流程

### 步骤 1: 准备工作

**所需条件**:
- ✅ 安装 MetaMask 浏览器扩展
- ✅ 切换到 Sepolia 测试网络
- ✅ 拥有足够的 Sepolia ETH（用于部署合约和质押）
- ✅ 拥有一定数量的 GToken（用于注册到 Registry）

**获取测试代币**:
1. Sepolia ETH: https://sepoliafaucet.com/
2. PNT Token: http://localhost:5173/get-pnts
3. GToken: http://localhost:5173/get-gtoken

---

### 步骤 2: 部署 Paymaster

#### 2.1 启动部署向导

1. 访问 http://localhost:5173/operator/wizard
2. 连接 MetaMask 钱包

**截图说明**:
```
┌─────────────────────────────────────────┐
│  Deploy Your Paymaster - Step 1/7      │
│                                         │
│  📝 Configuration                       │
│                                         │
│  Paymaster Name: [________________]    │
│  Treasury Address: [________________]  │
│  Service Fee: [___] basis points       │
│  Gas to USD Rate: [___]                │
│  PNT Price: [___] USD                  │
│                                         │
│  [Cancel]              [Next Step →]   │
└─────────────────────────────────────────┘
```

#### 2.2 填写配置信息 (Step 1)

**必填字段**:
- **Paymaster Name**: 你的 Paymaster 名称（例如: "MyPaymaster"）
- **Treasury Address**: 收款地址（收取服务费的地址）
- **Service Fee Rate**: 服务费率（0-1000 基点，1% = 100 基点）
- **Gas to USD Rate**: Gas 价格转 USD 的汇率（例如: 4500）
- **PNT Price USD**: PNT 代币的 USD 价格（例如: 0.02）
- **Max Gas Cost Cap**: 单笔交易最大 Gas 成本（ETH）
- **Min Token Balance**: 用户最小代币余额要求

**示例配置**:
```yaml
Paymaster Name: "Community Paymaster #1"
Treasury Address: 0x1234567890123456789012345678901234567890
Service Fee Rate: 200  # 2%
Gas to USD Rate: 4500  # 每个 Gas 单位值 4500 USD（缩放后）
PNT Price USD: 0.02    # $0.02 per PNT
Max Gas Cost Cap: 0.1  # 0.1 ETH
Min Token Balance: 100 # 100 tokens
```

点击 **[Next Step →]**

#### 2.3 连接钱包 (Step 2)

- 系统会自动检测 MetaMask
- 如果未连接，会提示连接钱包
- 确认你在 **Sepolia 测试网络**

**截图说明**:
```
┌─────────────────────────────────────────┐
│  Deploy Your Paymaster - Step 2/7      │
│                                         │
│  🔌 Connect Wallet                      │
│                                         │
│  ✅ MetaMask Detected                   │
│  📍 Network: Sepolia Testnet            │
│  💼 Address: 0x1234...5678              │
│  💰 Balance: 1.5 ETH                    │
│                                         │
│  [← Back]              [Next Step →]   │
└─────────────────────────────────────────┘
```

点击 **[Next Step →]**

#### 2.4 选择质押选项 (Step 3)

选择是否在 EntryPoint 质押 ETH（可选）:

- **Option 1**: 不质押（跳过）
- **Option 2**: 质押 ETH（提高信任度）

**质押金额建议**: 0.1 - 1 ETH

**截图说明**:
```
┌─────────────────────────────────────────┐
│  Deploy Your Paymaster - Step 3/7      │
│                                         │
│  💎 Stake on EntryPoint (Optional)      │
│                                         │
│  Staking increases your Paymaster's    │
│  reputation and trust score.           │
│                                         │
│  Stake Amount: [___] ETH               │
│  Unstake Delay: [___] seconds          │
│                                         │
│  ⚠️ Minimum: 0.1 ETH                    │
│  ⚠️ Recommended: 1 day unstake delay    │
│                                         │
│  [Skip Stake]          [Stake & Next]  │
└─────────────────────────────────────────┘
```

点击 **[Skip Stake]** 或 **[Stake & Next]**

#### 2.5 部署合约 (Step 4)

系统会自动部署 Paymaster 合约。

**部署过程**:
1. 准备合约字节码
2. 发送部署交易
3. 等待交易确认（约 15-30 秒）
4. 获取合约地址

**截图说明**:
```
┌─────────────────────────────────────────┐
│  Deploy Your Paymaster - Step 4/7      │
│                                         │
│  🚀 Deploying Contract...               │
│                                         │
│  [████████████░░░░░░░] 75%             │
│                                         │
│  Status: Waiting for confirmation...   │
│  Tx Hash: 0xabcd...1234                │
│                                         │
│  ⏳ Estimated time: 20 seconds          │
└─────────────────────────────────────────┘
```

**部署成功后**:
```
┌─────────────────────────────────────────┐
│  ✅ Deployment Successful!              │
│                                         │
│  Paymaster Address:                    │
│  0x9876543210987654321098765432109876543 │
│                                         │
│  [Copy Address]        [Next Step →]   │
└─────────────────────────────────────────┘
```

**重要**: 复制并保存你的 Paymaster 地址！

#### 2.6 质押到 EntryPoint (Step 5)

如果在 Step 3 选择了质押，这里会执行质押交易。

**操作**:
1. 确认质押金额
2. 点击 **[Stake Now]**
3. 在 MetaMask 中确认交易
4. 等待交易确认

**截图说明**:
```
┌─────────────────────────────────────────┐
│  Deploy Your Paymaster - Step 5/7      │
│                                         │
│  💎 Stake to EntryPoint                 │
│                                         │
│  Amount: 0.5 ETH                       │
│  Unstake Delay: 86400 seconds (1 day)  │
│                                         │
│  ⚠️ This will lock your ETH for the     │
│     specified unstake delay period.    │
│                                         │
│  [← Skip]              [Stake Now →]   │
└─────────────────────────────────────────┘
```

#### 2.7 注册到 Registry (Step 6)

将你的 Paymaster 注册到 AAstar Registry。

**所需**:
- GToken 用于质押（例如: 100 GToken）
- 授权 Registry 合约使用你的 GToken

**操作流程**:
1. **Approve**: 授权 Registry 使用 GToken
2. **Register**: 注册 Paymaster 到 Registry

**截图说明**:
```
┌─────────────────────────────────────────┐
│  Deploy Your Paymaster - Step 6/7      │
│                                         │
│  📋 Register to Registry                │
│                                         │
│  Step 1: Approve GToken                │
│  Amount: 100 GToken                    │
│  [Approve GToken]  ✅ Approved          │
│                                         │
│  Step 2: Register                      │
│  [Register to Registry]                │
│                                         │
│  Status: Waiting for approval...       │
└─────────────────────────────────────────┘
```

**交易序列**:
1. 点击 **[Approve GToken]** → MetaMask 确认
2. 等待确认（约 15 秒）
3. 点击 **[Register to Registry]** → MetaMask 确认
4. 等待确认（约 15 秒）

#### 2.8 完成部署 (Step 7)

恭喜！你的 Paymaster 已成功部署并注册。

**截图说明**:
```
┌─────────────────────────────────────────┐
│  🎉 Deployment Complete!                │
│                                         │
│  Your Paymaster is now live!           │
│                                         │
│  Paymaster Address:                    │
│  0x9876543210987654321098765432109876543 │
│                                         │
│  Next Steps:                           │
│  ✓ Deposit ETH to EntryPoint           │
│  ✓ Configure supported tokens          │
│  ✓ Share with developers               │
│                                         │
│  [View in Explorer]  [Manage Paymaster]│
└─────────────────────────────────────────┘
```

点击 **[Manage Paymaster]** 进入管理界面

---

### 步骤 3: 管理 Paymaster

#### 3.1 访问管理界面

**方式 1**: 从部署完成页面点击 **[Manage Paymaster]**

**方式 2**: 直接访问（替换 `<address>` 为你的 Paymaster 地址）:
```
http://localhost:5173/operator/manage?address=<your-paymaster-address>
```

**示例**:
```
http://localhost:5173/operator/manage?address=0x9876543210987654321098765432109876543
```

#### 3.2 管理界面概览

**截图说明**:
```
┌─────────────────────────────────────────────────────────────┐
│  Manage Paymaster                                           │
│                                                             │
│  Address: 0x9876543210987654321098765432109876543          │
│  Your Address: 0x1234567890123456789012345678901234567890  │
│  👑 Owner                                                   │
│                                                             │
│  [Configuration] [EntryPoint] [Registry] [Token Management] │
│  ───────────────────────────────────────────────────────────│
│                                                             │
│  📊 Configuration Parameters                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Parameter        │ Current Value      │ Actions     │   │
│  ├─────────────────────────────────────────────────────│   │
│  │ Owner            │ 0x1234...5678      │ [Edit]      │   │
│  │ Treasury         │ 0x9876...4321      │ [Edit]      │   │
│  │ Gas to USD Rate  │ 4500               │ [Edit]      │   │
│  │ PNT Price (USD)  │ $0.02              │ [Edit]      │   │
│  │ Service Fee Rate │ 200 bp (2.00%)     │ [Edit]      │   │
│  │ Max Gas Cost Cap │ 0.1 ETH            │ [Edit]      │   │
│  │ Min Token Balance│ 100 tokens         │ [Edit]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🔒 Pause Control                                           │
│  The Paymaster is currently active and sponsoring          │
│  transactions.                                              │
│  [Pause Paymaster]                                          │
│                                                             │
│  [Refresh Data]                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.3 Tab 1: Configuration（配置）

**功能**: 查看和修改 Paymaster 配置参数

**可编辑参数**（仅 Owner）:
1. **Owner**: 所有者地址（转移所有权）
2. **Treasury**: 收款地址
3. **Gas to USD Rate**: Gas 价格汇率
4. **PNT Price (USD)**: PNT 代币价格
5. **Service Fee Rate**: 服务费率（基点）
6. **Max Gas Cost Cap**: 最大 Gas 成本上限
7. **Min Token Balance**: 用户最小余额要求

**修改参数步骤**:
1. 点击参数右侧的 **[Edit]** 按钮
2. 输入框变为可编辑状态
3. 输入新值
4. 点击 **[Save]** 保存（会发起链上交易）
5. 在 MetaMask 确认交易
6. 等待交易确认（约 15 秒）
7. 刷新页面查看新值

**截图说明 - 编辑模式**:
```
┌─────────────────────────────────────────────────┐
│ Parameter        │ Current Value  │ Actions     │
├─────────────────────────────────────────────────│
│ Gas to USD Rate  │ [4500________] │ [Save]      │
│                  │                │ [Cancel]    │
└─────────────────────────────────────────────────┘
```

**暂停/恢复 Paymaster**:

如果你的 Paymaster 当前是 **Active（活跃）**:
- 点击 **[Pause Paymaster]** 暂停服务
- 暂停后，所有用户交易将被拒绝

如果当前是 **Paused（暂停）**:
- 会显示橙色横幅: "⏸️ Paymaster is currently PAUSED"
- 点击 **[Unpause Paymaster]** 恢复服务

#### 3.4 Tab 2: EntryPoint（入口点）

**功能**: 查看 Paymaster 在 EntryPoint v0.7 的状态

**显示信息**:
```
┌─────────────────────────────────────────┐
│  EntryPoint v0.7 Status                 │
│                                         │
│  Balance: 0.05 ETH                     │
│  Deposit: 50000000000000000 wei        │
│  Staked: ✓ Yes                         │
│  Stake Amount: 0.1 ETH                 │
│  Unstake Delay: 86400 seconds          │
│  Withdraw Time: N/A                    │
│                                         │
│  ℹ️ Note: EntryPoint balance is used   │
│     to sponsor user operations.        │
└─────────────────────────────────────────┘
```

**关键指标说明**:

- **Balance**: Paymaster 在 EntryPoint 的余额（用于支付 Gas）
  - ⚠️ 如果余额低于 0.01 ETH，需要充值
  - 充值方式: 直接向 EntryPoint 合约发送 ETH，指定 Paymaster 地址

- **Staked**: 是否已质押
  - ✓ Yes: 已质押（提高信任度）
  - ✗ No: 未质押

- **Stake Amount**: 质押金额
  - 越高越好，推荐 ≥ 0.1 ETH

- **Unstake Delay**: 解除质押的等待时间
  - 建议 ≥ 1 天（86400 秒）

#### 3.5 Tab 3: Registry（注册中心）

**功能**: 查看 Paymaster 在 AAstar Registry 的注册状态

**显示信息**:
```
┌─────────────────────────────────────────┐
│  Registry v1.2 Status                   │
│                                         │
│  Stake Amount: 100 GToken              │
│                                         │
│  ℹ️ Note: This is the amount of GToken │
│     staked in the AAstar Registry for  │
│     this Paymaster.                    │
└─────────────────────────────────────────┘
```

**说明**:
- **Stake Amount**: 在 Registry 质押的 GToken 数量
- 质押越多，排名越高，用户越容易发现你的 Paymaster

#### 3.6 Tab 4: Token Management（代币管理）

**功能**: 管理支持的 SBT 和 Gas Token

**两种代币类型**:

##### A. 支持的 SBT (Soul-Bound Tokens)

**用途**: 限制只有持有特定 SBT 的用户才能使用 Paymaster

**操作步骤**:
1. 输入 SBT 合约地址（例如: `0xabcd...1234`）
2. 点击 **[Check Status]** 检查是否已支持
3. 如果未支持且你是 Owner:
   - 点击 **[Add SBT]** 添加
   - MetaMask 确认交易
   - 等待确认

**截图说明**:
```
┌─────────────────────────────────────────┐
│  Supported SBT (Soul-Bound Tokens)      │
│                                         │
│  Add or remove SBT tokens that users   │
│  must hold to use this Paymaster.      │
│                                         │
│  [0xabcd...1234__________________]     │
│  [Check Status]                        │
│                                         │
│  ✓ This SBT is currently supported     │
│                                         │
│  [Add SBT]    [Remove SBT]             │
└─────────────────────────────────────────┘
```

##### B. 支持的 Gas Tokens

**用途**: 允许用户使用特定 ERC20 代币支付 Gas 费用

**操作步骤**:
1. 输入 Gas Token 合约地址
2. 点击 **[Check Status]**
3. 如果未支持且你是 Owner:
   - 点击 **[Add Gas Token]**
   - MetaMask 确认交易

**常用 Gas Token**（Sepolia 测试网）:
- USDC: `0x...`
- USDT: `0x...`
- DAI: `0x...`

#### 3.7 刷新数据

点击页面底部的 **[Refresh Data]** 按钮可以重新加载所有数据，包括：
- 配置参数
- EntryPoint 状态
- Registry 质押信息

---

### 步骤 4: 充值 EntryPoint 余额

**为什么需要充值?**
- Paymaster 使用 EntryPoint 的余额来支付用户的 Gas 费用
- 如果余额不足，用户交易将失败

**如何充值**（两种方式）:

#### 方式 1: 通过 ethers.js (推荐)

```javascript
import { ethers } from 'ethers';

const ENTRY_POINT = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
const PAYMASTER_ADDRESS = '0x你的Paymaster地址';

async function depositToEntryPoint() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const entryPoint = new ethers.Contract(
    ENTRY_POINT,
    ['function depositTo(address account) payable'],
    signer
  );

  // 充值 0.1 ETH
  const tx = await entryPoint.depositTo(PAYMASTER_ADDRESS, {
    value: ethers.parseEther('0.1')
  });

  await tx.wait();
  console.log('Deposit successful!');
}
```

#### 方式 2: 使用 cast (Foundry)

```bash
cast send 0x0000000071727De22E5E9d8BAf0edAc6f37da032 \
  "depositTo(address)" \
  0x你的Paymaster地址 \
  --value 0.1ether \
  --rpc-url https://sepolia.infura.io/v3/YOUR_KEY \
  --private-key YOUR_PRIVATE_KEY
```

---

## 开发者 (Developer) 集成指南

### 步骤 1: 选择 Paymaster

访问 http://localhost:5173/explorer 浏览可用的 Paymaster

**筛选条件**:
- EntryPoint 余额充足（≥ 0.05 ETH）
- Registry 质押高（排名靠前）
- 服务费率合理（≤ 5%）
- 支持你需要的 Gas Token

### 步骤 2: 集成到 dApp

#### 2.1 安装 SDK

```bash
npm install @aastar/sdk ethers
```

#### 2.2 创建 UserOperation

```typescript
import { ethers } from 'ethers';
import { AAStarClient } from '@aastar/sdk';

const PAYMASTER_ADDRESS = '0x你选择的Paymaster地址';
const ENTRY_POINT = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';

async function sendGaslessTransaction() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // 初始化 AAStarClient
  const aaClient = new AAStarClient({
    entryPoint: ENTRY_POINT,
    paymaster: PAYMASTER_ADDRESS,
    bundlerUrl: 'https://bundler.example.com',
  });

  // 创建 UserOperation
  const userOp = await aaClient.createUserOp({
    sender: await signer.getAddress(),
    target: '0x目标合约地址',
    data: '0x调用数据',
    value: 0,
  });

  // 请求 Paymaster 签名
  const signedUserOp = await aaClient.signUserOp(userOp, signer);

  // 提交到 Bundler
  const txHash = await aaClient.sendUserOp(signedUserOp);

  console.log('Transaction Hash:', txHash);
}
```

#### 2.3 处理支付

如果 Paymaster 要求用户支付 PNT:

```typescript
// 1. 批准 Paymaster 使用 PNT
const pntToken = new ethers.Contract(PNT_ADDRESS, ERC20_ABI, signer);
await pntToken.approve(PAYMASTER_ADDRESS, ethers.parseEther('100'));

// 2. 发送交易（Paymaster 会自动扣除 PNT）
const txHash = await aaClient.sendUserOp(signedUserOp);
```

---

## 浏览器 (Explorer) 使用说明

### 访问浏览器

http://localhost:5173/explorer

### 功能说明

**截图说明**:
```
┌─────────────────────────────────────────────────────────┐
│  Paymaster Explorer                                     │
│                                                         │
│  Search: [__________] [🔍]                              │
│                                                         │
│  Filters:                                               │
│  ☑ Active Only  ☐ Staked Only  ☐ Low Fee (<2%)        │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 🏪 Community Paymaster #1                         │ │
│  │                                                   │ │
│  │ Address: 0x9876...4321                           │ │
│  │ EntryPoint Balance: 1.5 ETH                      │ │
│  │ Service Fee: 2.00%                               │ │
│  │ Staked: ✓ Yes (0.5 ETH)                          │ │
│  │                                                   │ │
│  │ [View Details]  [Use This Paymaster]             │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [Load More...]                                         │
└─────────────────────────────────────────────────────────┘
```

### 查看详情

点击 **[View Details]** 查看 Paymaster 的完整信息：

- 所有配置参数
- EntryPoint 状态
- Registry 质押
- 支持的代币
- 历史交易统计

---

## 常见问题

### 1. MetaMask 未检测到

**问题**: 页面显示 "MetaMask is not installed"

**解决方案**:
1. 安装 MetaMask 浏览器扩展
2. 刷新页面
3. 点击 MetaMask 图标确保已解锁

### 2. 交易失败: "Insufficient EntryPoint balance"

**问题**: Paymaster EntryPoint 余额不足

**解决方案**:
1. 访问管理页面的 **EntryPoint** Tab
2. 检查 Balance（应 ≥ 0.05 ETH）
3. 按照 [充值 EntryPoint 余额](#步骤-4-充值-entrypoint-余额) 的步骤充值

### 3. 无法编辑参数

**问题**: Edit 按钮是灰色的

**原因**: 你不是 Paymaster 的 Owner

**解决方案**:
- 确认你连接的钱包地址与 Owner 地址一致
- 如果不是 Owner，你只能查看数据，不能修改

### 4. 部署失败

**问题**: 合约部署交易被 Revert

**可能原因**:
1. Gas 不足 - 确保有足够的 Sepolia ETH
2. 网络拥堵 - 等待几分钟后重试
3. 参数错误 - 检查所有配置参数是否有效

### 5. 注册到 Registry 失败

**问题**: "Insufficient GToken balance"

**解决方案**:
1. 访问 http://localhost:5173/get-gtoken 获取 GToken
2. 确保至少有 100 GToken
3. 先 Approve，再 Register

### 6. 用户交易被拒绝

**可能原因**:
1. **Paymaster 已暂停** - 在管理页面 Unpause
2. **EntryPoint 余额不足** - 充值 ETH
3. **用户不满足条件**:
   - 没有持有要求的 SBT
   - 没有足够的 PNT 支付费用
   - 代币余额低于 Min Token Balance

### 7. 测试环境 vs 生产环境

**当前配置**: Sepolia 测试网

**切换到主网**:
1. 修改合约地址:
   - EntryPoint: `0x0000000071727De22E5E9d8BAf0edAc6f37da032` (same)
   - Registry: 使用主网 Registry 地址
2. 在 MetaMask 切换到 Ethereum Mainnet
3. 使用真实的 ETH 和 代币

---

## 附录

### A. 合约地址（Sepolia 测试网）

```
EntryPoint v0.7: 0x0000000071727De22E5E9d8BAf0edAc6f37da032
Registry v1.2:   0x838da93c815a6E45Aa50429529da9106C0621eF0
```

### B. 配置参数说明

| 参数 | 类型 | 说明 | 推荐值 |
|------|------|------|--------|
| Owner | address | 所有者地址 | 你的钱包地址 |
| Treasury | address | 收款地址 | 你的收款地址 |
| Gas to USD Rate | uint256 | Gas 价格汇率（缩放 10^18） | 4500000000000000000000 |
| PNT Price USD | uint256 | PNT 价格（USD，缩放 10^18） | 20000000000000000 |
| Service Fee Rate | uint256 | 服务费率（基点，10000 = 100%） | 200 (2%) |
| Max Gas Cost Cap | uint256 | 最大 Gas 成本（wei） | 100000000000000000 (0.1 ETH) |
| Min Token Balance | uint256 | 最小代币余额（wei） | 100000000000000000000 (100 tokens) |

### C. ABI 参考

**Paymaster V4 主要函数**:
```solidity
// 查询函数
function owner() external view returns (address);
function treasury() external view returns (address);
function gasToUSDRate() external view returns (uint256);
function paused() external view returns (bool);

// 管理函数（仅 Owner）
function setTreasury(address newTreasury) external;
function setServiceFeeRate(uint256 rate) external;
function pause() external;
function unpause() external;

// 代币管理
function addSBT(address sbtToken) external;
function removeSBT(address sbtToken) external;
function addGasToken(address gasToken) external;
function removeGasToken(address gasToken) external;
```

### D. 测试代币获取

**Sepolia ETH**:
- https://sepoliafaucet.com/
- https://faucet.quicknode.com/ethereum/sepolia

**PNT Token**:
- 访问: http://localhost:5173/get-pnts
- 或使用合约: `mint(address to, uint256 amount)`

**GToken**:
- 访问: http://localhost:5173/get-gtoken
- 或使用合约: `mint(address to, uint256 amount)`

---

## 总结

通过本指南，你应该能够：

✅ 理解 SuperPaymaster Registry 的架构和功能
✅ 成功部署和配置自己的 Paymaster
✅ 管理 Paymaster 的所有参数和状态
✅ 集成 Paymaster 到你的 dApp
✅ 解决常见问题

**下一步**:
1. 尝试部署一个测试 Paymaster
2. 充值 EntryPoint 余额
3. 邀请开发者使用你的 Paymaster
4. 监控收益和交易统计

**需要帮助?**
- GitHub Issues: https://github.com/AAStarCommunity/registry/issues
- Discord: https://discord.gg/aastar
- 文档: https://docs.aastar.io

---

**版本**: v1.0
**更新日期**: 2025-10-17
**作者**: AAStar Community
**许可**: MIT
