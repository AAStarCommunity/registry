# Registry Project - Change Log

> **历史记录已归档**: 2025-10-24 之前的完整更改历史已备份至 `Changes.backup-20251024-222050.md`

本文档记录 AAStar Registry 项目的开发进展和重要变更。

---

## 2025-10-25 - Registry v2.0 架构迁移完成

### 问题描述
用户报告了 4 个关键问题：
1. ❌ Explorer URL 路径错误：`/explorer/` 应改为 `/paymaster/`
2. ❌ Paymaster 详情页显示原始 JSON 而非解析后的字段
3. ❌ 未发现 xPNTs 注册到 Paymaster 的流程
4. ❌ AOA 部署流程中未体验到 stGToken lock 步骤

**核心架构误解**：我最初误认为 Step6 需要调用 `GTokenStaking.lockStake()` 来锁定在 Step4 中质押的 stGToken。

**用户关键纠正**: "if step4 got stGtoken, why we need step6 to stake again?"

这揭示了正确的架构理解：
- **Step4**: 质押 GToken → 获得 stGToken（用户的"储蓄账户"）
- **Step6**: 仅注册元数据到 Registry v2（无质押）
- **Lock**: 在运行时自动触发，非部署时操作

### 实现内容

#### 1. 修复 Explorer URL 路径

**文件**: `src/pages/operator/deploy-v2/steps/Step7_Complete.tsx:20`
```typescript
// 修复前
window.open(`/explorer/${paymasterAddress}`, "_blank");

// 修复后
window.open(`/paymaster/${paymasterAddress}`, "_blank");
```

**文件**: `src/pages/analytics/AnalyticsDashboard.tsx:189`
```typescript
// 修复前
<Link to={`/explorer/${pm.address}`} ...>

// 修复后
<Link to={`/paymaster/${pm.address}`} ...>
```

#### 2. 修复 Paymaster 详情页 JSON 显示

**文件**: `src/pages/analytics/PaymasterDetail.tsx:96-133`

**修复前**:
```
Name: {"name":"BreadCommunity25","description":"...","version":"v4","timestamp":176132}
```

**修复后**: 添加 JSON 解析逻辑
```typescript
try {
  const metadata = JSON.parse(info.name);
  if (metadata.name) {
    parsedName = metadata.name;
    description = metadata.description || "";
    version = metadata.version || "";
    timestamp = metadata.timestamp ? new Date(metadata.timestamp * 1000).toLocaleString() : "";
  }
} catch (e) {
  parsedName = info.name;
}
```

现在显示为独立字段：
- Name: BreadCommunity25
- Description: Community Paymaster for BreadCommunity25
- Version: v4
- Timestamp: 2025/10/24 下午3:25:32

#### 3. 确认 xPNTs 注册流程

**调查结果**:
- ✅ 检查了 `PaymasterV4.sol` 和 `PaymasterV4_1.sol` 源码
- ✅ 确认 xPNTs **不需要**注册到 Paymaster
- ✅ PaymasterV4_1 仅新增 Registry 集成（激活/停用），无 xPNTs 注册要求

#### 4. AOA Flow stGToken Lock 架构澄清

**架构发现**:

**GTokenStaking 合约**（0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2）有两个独立功能：

1. **质押 (Step4 部署时)**:
```solidity
function stake(uint256 amount) external returns (uint256 shares) {
    // 用户转移 GToken，铸造 sGToken shares
}
```

2. **锁定 (运行时)**:
```solidity
function lockStake(
    address user,
    uint256 amount,
    string memory purpose
) external {
    // 由授权合约（MySBT、SuperPaymaster）调用
    // 冻结用户部分 sGToken
}
```

**关键理解**: 这是两个完全独立的操作！质押在部署时完成，锁定在运行时由服务自动触发。

#### 5. Registry v2.0 架构对比

| 特性 | Registry v1.2 (旧) | Registry v2.0 (新) |
|------|-------------------|-------------------|
| 合约地址 | 0x838da93c815a6E45Aa50429529da9106C0621eF0 | 0x6806e4937038e783cA0D3961B7E258A3549A0043 |
| 注册方式 | `payable` - 需要 ETH 质押 | 纯元数据存储 - 无质押 |
| 功能 | `registerPaymaster(name, feeRate) payable` | `registerCommunity(profile)` |
| 质押要求 | `msg.value >= minStakeAmount` | ❌ 无质押 |
| 数据存储 | name + feeRate + ETH stake | 完整社区档案（14 个字段） |
| 状态 | ⚠️ 已废弃 | ✅ 当前使用 |

#### 6. 创建 Step6_RegisterRegistry_v2.tsx

**新文件**: `src/pages/operator/deploy-v2/steps/Step6_RegisterRegistry_v2.tsx`

**关键实现**:
```typescript
// Registry v2.0 ABI - 纯元数据注册
const REGISTRY_V2_ABI = [
  `function registerCommunity(
    tuple(
      string name,
      string ensName,
      string description,
      string website,
      string logoURI,
      string twitterHandle,
      string githubOrg,
      string telegramGroup,
      address xPNTsToken,
      address[] supportedSBTs,
      uint8 mode,              // AOA=0, Super=1
      address paymasterAddress,
      address community,
      uint256 registeredAt,
      uint256 lastUpdatedAt,
      bool isActive,
      uint256 memberCount
    ) profile
  ) external`
];

// 构建社区档案（无质押！）
const profile = {
  name: communityName,
  description: description,
  xPNTsToken: xPNTsAddress,
  supportedSBTs: [sbtAddress],
  mode: PaymasterMode.INDEPENDENT, // AOA mode
  paymasterAddress: paymasterAddress,
  // ... 其他字段由合约设置
};

// 注册到 Registry v2（纯元数据）
const tx = await registry.registerCommunity(profile);
```

**Info Banner**:
```
Registry v2.0 只存储社区元数据。
你的 stGToken 已在 Step 4 质押，将在操作期间自动锁定。
```

#### 7. 更新配置文件

**文件**: `.env.local`
```bash
# Registry v2.0 (Community metadata only - no staking)
VITE_REGISTRY_V2_ADDRESS=0x6806e4937038e783cA0D3961B7E258A3549A0043

# Legacy Registry v1.2 (ETH staking - deprecated)
VITE_REGISTRY_ADDRESS=0x838da93c815a6E45Aa50429529da9106C0621eF0

# v2.0 System Contracts (deployed 2025-10-24)
VITE_GTOKEN_STAKING_ADDRESS=0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2
VITE_SUPERPAYMASTER_V2_ADDRESS=0xb96d8BC6d771AE5913C8656FAFf8721156AC8141
VITE_XPNTS_FACTORY_ADDRESS=0x356CF363E136b0880C8F48c9224A37171f375595
VITE_MYSBT_ADDRESS=0xB330a8A396Da67A1b50903E734750AAC81B0C711
```

**文件**: `src/config/networkConfig.ts`
```typescript
export interface NetworkConfig {
  contracts: {
    registry: string;         // v1.2 (legacy)
    registryV2: string;        // v2.0 (metadata only) ← 新增
    gTokenStaking: string;     // v2.0 staking contract ← 新增
    xPNTsFactory: string;      // v2.0 ← 新增
    mySBT: string;             // v2.0 ← 新增
    superPaymasterV2: string;  // v2.0 ← 新增
  }
}
```

#### 8. 添加 AOA 模式警告

**文件**: `src/pages/operator/deploy-v2/components/StakeOptionCard.tsx:252-255`

在 `createStandardFlowOption()` 添加:
```typescript
warnings: [
  "Relies on PaymasterV4.1 enhanced contract",
  "Requires ETH and stGToken resources",
],
```

### v2 合约部署地址（Sepolia）

| 合约 | 地址 | 功能 |
|------|------|------|
| Registry v2.0 | 0x6806e4937038e783cA0D3961B7E258A3549A0043 | 社区元数据注册 |
| GTokenStaking | 0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2 | GToken 质押与锁定 |
| SuperPaymasterV2 | 0xb96d8BC6d771AE5913C8656FAFf8721156AC8141 | Super Mode 共享 Paymaster |
| xPNTsFactory | 0x356CF363E136b0880C8F48c9224A37171f375595 | 社区 Gas Token 工厂 |
| MySBT | 0xB330a8A396Da67A1b50903E734750AAC81B0C711 | 身份 SBT 合约 |

### 架构迁移对比

**修复前（v1.2 + v2 混用）**:
- ❌ Step4: 使用 v2 GTokenStaking（0xc3aa...c7b2）
- ❌ Step6: 使用 v1.2 Registry（0x838d...eF0）- ETH 质押
- ❌ 架构不一致，会导致部署失败

**修复后（完整 v2）**:
- ✅ Step4: 使用 v2 GTokenStaking - 质押 GToken → stGToken
- ✅ Step6: 使用 v2 Registry - 纯元数据注册
- ✅ 架构统一，质押与注册分离

### 验证结果
- ✅ Explorer URL 路径已修复（两处）
- ✅ Paymaster 详情页 JSON 正确解析和显示
- ✅ 确认 xPNTs 不需要注册到 Paymaster
- ✅ AOA 流程架构理解正确（质押 ≠ 锁定）
- ✅ 所有配置文件更新为 v2 地址
- ✅ Step6_RegisterRegistry_v2.tsx 创建完成
- ✅ AOA 模式警告添加完成

### 影响范围
- **部署向导**: Step6 现在使用 v2 纯元数据注册
- **配置系统**: 支持 v1.2 和 v2 两个 Registry 地址
- **分析仪表盘**: URL 导航正确
- **详情页面**: JSON 元数据正确解析

### 文件变更列表
**修改**:
- `src/pages/operator/deploy-v2/steps/Step7_Complete.tsx` - 修复 URL
- `src/pages/analytics/AnalyticsDashboard.tsx` - 修复 URL
- `src/pages/analytics/PaymasterDetail.tsx` - JSON 解析
- `src/pages/operator/deploy-v2/components/StakeOptionCard.tsx` - 添加警告
- `.env.local` - v2 地址
- `.env.example` - v2 地址
- `src/config/networkConfig.ts` - v2 合约配置

**新建**:
- `src/pages/operator/deploy-v2/steps/Step6_RegisterRegistry_v2.tsx`

### 关键技术要点

**1. Staking vs Locking**:
- **Staking（质押）**: 用户主动操作，GToken → sGToken，发生在部署时
- **Locking（锁定）**: 系统自动操作，冻结 sGToken，发生在运行时
- 两者完全独立，不要混淆！

**2. Registry v2 设计理念**:
- 纯元数据存储，不涉及资产
- 质押由 GTokenStaking 专门管理
- 职责分离，架构更清晰

**3. AOA 部署完整流程**:
1. Step4: Stake GToken → 获得 stGToken（储蓄）
2. Step5: Stake ETH to EntryPoint（ERC-4337 标准）
3. Step6: Register metadata to Registry v2（仅信息）
4. 运行时: 服务自动调用 lockStake（冻结 stGToken）

### Commits
- `c4f5639` - fix: 修复 explorer URL 路径和 Paymaster 详情页 JSON 显示
- `614a108` - feat: Migrate to Registry v2.0 architecture

---

## 2025-10-25 - Phase 3.2: Step4_DeployResources 组件实现与集成

### 问题描述
为 AOA 和 Super 两种模式添加统一的资源部署步骤，包括 SBT 选择、xPNTs Token 部署和 GToken staking。

### 实现内容

#### 1. Step4_DeployResources 组件创建 (src/pages/operator/deploy-v2/steps/Step4_DeployResources.tsx)

**组件功能**：
- 📦 Step 1: 选择或使用现有 MySBT 合约
- 🪙 Step 2: 通过 xPNTsFactory 部署 xPNTs Token
- 🔒 Step 3: Stake GToken 获得 sGToken

**关键特性**：
- ✅ 多步骤向导，带进度指示器
- ✅ 自动从社区名称生成 token symbol
- ✅ 验证最低 30 GToken stake
- ✅ 完成后自动传递资源数据到下一步
- ✅ 复用 Phase 3.3 的 staking 模式

**代码示例**：
```typescript
export interface DeployedResources {
  sbtAddress: string;
  xPNTsAddress: string;
  sGTokenAmount: string;
  gTokenStakeTxHash: string;
}

// 三个主要操作
handleSelectSBT()       // 使用现有 MySBT
handleDeployXPNTs()     // 部署 xPNTs via factory
handleStakeGToken()     // Stake GToken → sGToken
```

**使用的合约地址**：
- MySBT: 0xB330a8A396Da67A1b50903E734750AAC81B0C711
- xPNTsFactory: 0x356CF363E136b0880C8F48c9224A37171f375595
- GToken: 0x54Afca294BA9824E6858E9b2d0B9a19C440f6D35
- GTokenStaking: 0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2

#### 2. DeployWizard 集成 (src/pages/operator/DeployWizard.tsx)

**更新流程结构**：
```typescript
// AOA Flow (7 步) - 新增 resources 步骤
1. Connect & Select Mode
2. Deploy Resources (SBT + xPNTs + Stake GToken) ← 新增
3. Configuration
4. Deploy Paymaster
5. Stake to EntryPoint
6. Register to Registry
7. Complete

// Super Mode (6 步) - 新增 resources 步骤
1. Connect & Select Mode
2. Deploy Resources (SBT + xPNTs + Stake GToken) ← 新增
3. Configuration
4. Stake to SuperPaymaster
5. Register to Registry
6. Complete
```

**主要变更**：
- ✅ Import Step4_DeployResources 和 DeployedResources 类型
- ✅ 在 DeployConfig 接口添加 `deployedResources?: DeployedResources`
- ✅ STANDARD_FLOW_STEPS 和 SUPER_MODE_STEPS 都添加 'resources' 步骤
- ✅ 添加 handleResourcesComplete 回调
- ✅ renderStepContent() 添加 'resources' case

#### 3. i18n 翻译更新

**英文** (src/i18n/locales/en.json):
```json
"steps": {
  "connectAndSelect": "Connect & Select Mode",
  "resources": "Deploy Resources",  ← 新增
  "config": "Configuration",
  // ...
}
```

**中文** (src/i18n/locales/zh.json):
```json
"steps": {
  "connectAndSelect": "连接并选择模式",
  "resources": "部署资源",  ← 新增
  "config": "配置",
  // ...
}
```

### 验证结果
- ✅ 构建成功（无新 TypeScript 错误）
- ✅ Step4_DeployResources 组件完整实现
- ✅ 成功集成到 DeployWizard 的两个流程中
- ✅ i18n 翻译完整（中英文）
- ✅ 组件与 Phase 3.3 staking 逻辑保持一致

### 文件变更列表
- 新建：`src/pages/operator/deploy-v2/steps/Step4_DeployResources.tsx`
- 新建：`src/pages/operator/deploy-v2/steps/Step4_DeployResources.css`
- 修改：`src/pages/operator/DeployWizard.tsx`
- 修改：`src/i18n/locales/en.json`
- 修改：`src/i18n/locales/zh.json`

---

## 2025-10-24 - Phase 3.3: Super Mode stGToken Lock 功能实现

### 问题描述
完成 Super Mode（AOA+）的 stGToken lock 功能实现，包括修复 `StakeToSuperPaymaster` 组件的合约地址、ABI 错误和真实 staking 逻辑。

### 实现内容

#### 1. StakeToSuperPaymaster.tsx 修复 (src/pages/operator/deploy-v2/components/StakeToSuperPaymaster.tsx)

**修复前问题**：
- ❌ 合约地址都是 placeholder `"0x..."`
- ❌ `registerOperator` ABI 参数顺序错误
- ❌ GToken staking 逻辑只是 placeholder

**修复后**：
- ✅ 从环境变量读取合约地址，保留 fallback 值
  - `SUPER_PAYMASTER_V2`: 0xb96d8BC6d771AE5913C8656FAFf8721156AC8141
  - `GTOKEN_ADDRESS`: 0x54Afca294BA9824E6858E9b2d0B9a19C440f6D35
  - `GTOKEN_STAKING_ADDRESS`: 0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2
  - `APNTS_ADDRESS`: Placeholder (待部署)

- ✅ 修正 `registerOperator` ABI 签名
  ```typescript
  // 正确的函数签名（与 SuperPaymasterV2.sol:277 一致）
  function registerOperator(
    uint256 sGTokenAmount,          // ← 第一个参数是 sGToken 数量
    address[] memory supportedSBTs,
    address xPNTsToken,
    address treasury
  )
  ```

- ✅ 实现真实的 GToken staking 逻辑
  ```typescript
  handleStakeGToken() {
    // 1. Approve GTokenStaking 花费 GToken
    // 2. Stake GToken 获得 sGToken
    // 3. 验证 sGToken 余额
  }
  ```

- ✅ 实现真实的 Operator 注册逻辑
  ```typescript
  handleRegisterOperator() {
    // 1. Approve SuperPaymaster 转移 sGToken
    // 2. 调用 registerOperator（正确的参数顺序）
  }
  ```

#### 2. Enum 语法修复

**问题**：TypeScript `erasableSyntaxOnly` 配置不允许普通 enum

**修复**：将所有 enum 改为 const object + type alias
```typescript
// 修复前
enum RegistrationStep {
  STAKE_GTOKEN = 1,
  // ...
}

// 修复后
const RegistrationStep = {
  STAKE_GTOKEN: 1,
  // ...
} as const;

type RegistrationStepType = typeof RegistrationStep[keyof typeof RegistrationStep];
```

**影响文件**：
- `StakeToSuperPaymaster.tsx`
- `Step1_ConnectAndSelect.tsx`

### 验证结果
- ✅ 所有关键 TypeScript 错误已修复
- ✅ 构建成功
- ✅ Super Mode 使用正确的 stGToken lock 流程
- ✅ 合约地址从环境变量读取
- ✅ ABI 签名与合约源码一致

### Super Mode 完整流程

1. **Step 1: Stake GToken**
   - Approve GTokenStaking
   - Stake GToken → 获得 sGToken
   - 验证 sGToken 余额

2. **Step 2: Register Operator**
   - Approve SuperPaymaster 转移 sGToken
   - 调用 `registerOperator(sGTokenAmount, supportedSBTs, xPNTsToken, treasury)`
   - Lock sGToken (最低 30, 推荐 50-100)

3. **Step 3: Deposit aPNTs**
   - Approve aPNTs
   - 存入 aPNTs 作为 gas backing

4. **Step 4: Deploy xPNTs (Optional)**
   - 部署社区专属 xPNTs token

5. **Complete**
   - Operator 注册成功
   - 可以开始为用户 sponsor gas

### 技术要点

**stGToken Lock 范围**：
- 最低：30 stGToken
- 推荐：50-100 stGToken
- 作用：获得使用 SuperPaymaster 的权限，lock 越多声誉越高

**合约交互顺序**：
1. GToken → GTokenStaking (Stake)
2. GTokenStaking → SuperPaymaster (Approve + Lock)
3. aPNTs → SuperPaymaster (Approve + Deposit)

### 下一步
- Phase 3.2: 添加 Step4_DeployResources 组件（SBT + xPNTs + Stake GToken）
- 部署 aPNTs ERC20 token 到 Sepolia testnet

### Commits
- (待提交) feat: implement Super Mode stGToken lock functionality

---

## 2025-10-24 - 修复硬编码合约地址问题

### 问题描述
发现多个文件中存在硬编码的合约地址，而不是从环境变量读取配置。这导致：
1. .env 配置文件中的错误地址（Community Registry）无法被使用
2. 部署向导和管理界面使用了不一致的地址
3. 缺乏灵活性，无法通过环境变量切换不同的合约部署

### 修复内容

#### 1. Step6_RegisterRegistry.tsx (src/pages/operator/deploy-v2/steps/Step6_RegisterRegistry.tsx:15-23)
- 修复前：硬编码 REGISTRY_V1_2 和 GTOKEN_ADDRESS
- 修复后：从 import.meta.env 读取配置，保留 fallback 值

#### 2. ManagePaymasterFull.tsx (src/pages/operator/ManagePaymasterFull.tsx:18-24)
- 修复前：硬编码 ENTRY_POINT_V07 和 REGISTRY_V1_2
- 修复后：从 import.meta.env 读取配置，保留 fallback 值

#### 3. Step5_Stake.tsx (src/pages/operator/deploy-v2/steps/Step5_Stake.tsx:51-54)
- 修复前：硬编码 ENTRY_POINT_V07
- 修复后：从 import.meta.env 读取配置，保留 fallback 值

#### 4. .env 文件更新
- 修复 REGISTRY_ADDRESS: 从错误地址 0x6806...043 改为正确地址 0x838...eF0
- 新增 ENTRY_POINT_V07 配置

### 验证结果
- ✅ 所有文件现在从环境变量读取地址配置
- ✅ 保留 fallback 值以确保向后兼容
- ✅ .env 配置已更正为正确的 SuperPaymasterRegistry_v1_2 地址
- ✅ 部署向导、管理界面、仪表盘分析都使用统一的合约地址

### 影响范围
- Paymaster 注册流程
- Paymaster 管理界面
- EntryPoint 质押流程
- 数据分析和仪表盘查询

### 关键合约地址
- **SuperPaymasterRegistry_v1_2**: `0x838da93c815a6E45Aa50429529da9106C0621eF0`
- **EntryPoint v0.7**: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`
- **GToken**: `0x54Afca294BA9824E6858E9b2d0B9a19C440f6D35`

### Commits
- `7b4c6cd` - refactor: replace hardcoded addresses with environment variables
- `764b7f4` - docs: 添加硬编码地址修复的进度报告

---

## 2025-10-24 - Phase 2 & 3: 合约部署 + Standard→AOA 重命名

### 问题描述
完成 Phase 2 合约部署和 Phase 3 代码库重命名，修正架构理解并统一术语。

### 实现内容

#### Phase 2: 合约部署（Sepolia Testnet）

**核心合约**：
- SuperPaymasterV2: 0xb96d8BC6d771AE5913C8656FAFf8721156AC8141
- Registry (统一): 0x838da93c815a6E45Aa50429529da9106C0621eF0
- GTokenStaking: 0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2

**共享资源**：
- GToken: 0x54Afca294BA9824E6858E9b2d0B9a19C440f6D35
- xPNTsFactory: 0x356CF363E136b0880C8F48c9224A37171f375595
- MySBT: 0xB330a8A396Da67A1b50903E734750AAC81B0C711

**Operator 测试**: 成功注册并 lock 50 sGT，xPNTs: 0x95A71F3C8c25D14ec2F261Ab293635d7f37A55ab

#### Phase 3: Standard → AOA 系统重命名

**类型定义**: `"standard" | "super"` → `"aoa" | "super"`

**修改文件** (6 个):
1. StakeOptionCard.tsx - 类型 `type: "aoa"`, UI "Enhanced ERC-4337 Flow: AOA"
2. Step1_ConnectAndSelect.tsx - 变量 `aoaOption`, CSS `comparison-aoa`
3. Step4_StakeOption.tsx - 变量 `aoaOption`
4. Step5_Stake.tsx - 类型 `"aoa" | "super"`, 文案 "AOA Flow"
5. walletChecker.ts - 函数签名 `option: "aoa" | "super"`
6. DeployWizard.tsx - Config 类型, 所有参数和条件判断

**配置更新**: .env 澄清统一 Registry 架构（移除双 Registry 误解）

### 技术澄清

**统一 Registry** (0x838...eF0):
- AOA: Paymaster 运营者注册 (lock stGToken 30-100)
- Super(AOA+): SuperPaymaster 运营方注册 (lock 大量 stGToken)
- ❌ 不是两个 Registry，是一个统一的！

**AOA vs AOA+**:
- AOA: 去除链下签名服务器，SBT+xPNTs 免 gas
- AOA+ (Super): 共享 SuperPaymaster，运营方负责注册

### 验证结果
- ✅ TypeScript 类型错误全部修复
- ✅ 所有 "standard" 更新为 "aoa"
- ✅ .env 配置澄清
- ✅ 合约部署成功，Operator 测试通过

### 影响范围
- 类型系统、UI 组件、配置流程、工具函数

### 下一步
- Phase 3.2: Step4_DeployResources (待开发)
- Phase 3.3: stGToken lock 支持 (待开发)

### Commits
- (待提交)

---

## 2025-10-24 - Phase 1 UI 改进完成

### 问题描述
根据用户反馈，完成 Phase 1 的紧急修复和功能改进，包括：
- Registry 链接错误修复
- AOA 模式警告注释
- 管理页面链接添加
- Revenue Calculator 交互式改进

### 实现内容

#### 1. Registry 链接修复 (src/pages/analytics/AnalyticsDashboard.tsx:189)
- 修复前：`/paymaster/${pm.address}` （错误路径）
- 修复后：`/explorer/${pm.address}` （正确路径）
- 影响：Paymaster 列表中的详情链接现在正确指向 explorer 页面

#### 2. Step1 AOA 警告横幅 (src/pages/operator/deploy-v2/steps/)
- 添加 Enhanced ERC-4337 Flow: AOA Mode 警告横幅
- 内容包括：
  - Relies on PaymasterV4.1 enhanced contract
  - Requires ETH and stGToken resources
  - AOA (Account Owned Address) 技术说明
  - SBT identity verification + xPNTs 免 gas 支付说明
- 新增 CSS 样式：.aoa-warning-banner（黄色渐变背景 + 边框）

#### 3. 管理页面链接 (src/pages/operator/deploy-v2/steps/Step7_Complete.tsx)
- 在 "Adjust Parameters" (Step 3) 添加 "Manage Paymaster →" 按钮
- 在 "Monitor Treasury" (Step 4) 添加 "Manage Paymaster →" 按钮
- 点击按钮跳转到 `/operator/manage?address=${paymasterAddress}`

#### 4. Revenue Calculator 改进 (src/pages/OperatorsPortal.tsx)
**功能增强:**
- 添加 React useState 状态管理
- 实时自动计算（无需重新计算按钮）
- 输入值改变时立即更新结果

**参数调整:**
- Gas Cost 单位从 USD 改为 ETH
- 默认值从 2.50 USD 改为 0.0001 ETH
- 输入框 step 从 0.01 改为 0.0001（更精确）

**新增功能:**
- 显示当前 ETH 价格假设（$2500）
- 显示 Gas Cost 的 USD 等值（自动计算）
- 实时更新每日/每月/每年收入预估

### 验证结果
- ✅ Registry 链接正确指向 explorer 页面
- ✅ Step1 显示 AOA 模式警告信息
- ✅ Step7 完成页面有管理链接
- ✅ Revenue Calculator 实时计算功能正常
- ✅ 所有修改已提交到 git (commit afb1b48)

### 影响范围
- Analytics Dashboard 用户体验改善
- Deployment Wizard Step1 信息更完善
- Deployment Wizard Step7 操作更便捷
- Operators Portal 收入计算器更实用

### Commits
- `afb1b48` - feat: complete Phase 1 UI improvements

---

## 文档说明

### 如何记录变更

**重要原则：只记录重大修改，日常小修改仅在 commit message 中描述**

#### 什么是重大修改（需要记录到 Changes.md）
- 新功能模块开发（如新增整个步骤组件）
- 架构重构或重大重命名（影响多个文件）
- 合约部署和集成（新合约地址、ABI 更新）
- Bug 修复（影响核心功能）
- 多个相关修改的完整阶段（如 Phase 1/2/3）

#### 什么是日常小修改（仅 commit message）
- 单个文件的小改动（1-5 行代码）
- 文案优化、标题调整
- CSS 样式微调
- 单个变量重命名
- 文档格式修正

#### 重大修改记录格式
```markdown
## YYYY-MM-DD - 任务标题

### 问题描述
简要描述要解决的问题或实现的功能

### 实现内容
详细说明所做的更改

### 验证结果
列出测试结果和验证情况

### 影响范围
说明变更影响的模块和功能

### Commits
列出相关的 git commit hash
```

### 归档策略
当文件超过 200KB 或包含超过 100 个主要变更时，应创建新的备份并重置此文件。

### 备份文件命名规范
`Changes.backup-YYYYMMDD-HHMMSS.md`

## 2025-10-26 - 部署流程优化与管理界面完善

### 问题描述
用户提出 5 个关键改进需求：
1. ❌ Step 2 xPNTs 部署缺少前置检测，报错后才提示
2. ❌ Step 3 GToken Stake 缺少前置检测，报错后才提示
3. ❌ Paymaster 检测时机不当，应提前到连接钱包后
4. ❌ 运营指南入口缺失（注册成功页和管理页）
5. ❌ ManagePaymaster 页面数据显示异常：
   - Token Management 显示空白
   - Registry 区域显示 N/A，缺少地址
   - 缺少 EntryPoint deposit 按钮
   - 配置参数可能不完整

### 实现内容

#### 1. Step 2 xPNTs 部署前置检测

**文件**: `src/pages/operator/deploy-v2/steps/Step4_DeployResources.tsx`

**问题**: 用户点击部署后才发现已有 xPNTs，导致交易失败

**解决方案**: 添加自动检测逻辑
```typescript
const checkExistingXPNTs = async () => {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    const factory = new ethers.Contract(
      XPNTS_FACTORY_ADDRESS,
      XPNTS_FACTORY_ABI,
      provider
    );

    const alreadyDeployed = await factory.hasToken(userAddress);

    if (alreadyDeployed) {
      const existingToken = await factory.getTokenAddress(userAddress);
      console.log("ℹ️ Found existing xPNTs token:", existingToken);
      setXPNTsAddress(existingToken);
      setError(
        `You already have an xPNTs token at ${existingToken.slice(0, 10)}...${existingToken.slice(-8)}. ` +
        `Click "Use This Token →" to continue, or deploy a new one (not recommended).`
      );
    }
  } catch (err) {
    console.log("Failed to check existing xPNTs:", err);
  }
};

// 自动触发检测
React.useEffect(() => {
  if (currentStep === ResourceStep.DeployXPNTs && !xPNTsAddress) {
    checkExistingXPNTs();
  }
}, [currentStep]);
```

**效果**:
- ✅ 进入部署表单前自动检测
- ✅ 发现已有 token 时显示警告并预填地址
- ✅ 提供"使用现有 token"选项，避免重复部署

#### 2. Step 3 GToken Stake 前置检测

**文件**: `src/pages/operator/deploy-v2/steps/Step4_DeployResources.tsx`

**问题**: 用户点击 stake 后才发现已有质押，导致交易失败

**解决方案**: 添加 GTokenStaking 合约查询
```typescript
const checkExistingStake = async () => {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    const gtokenStaking = new ethers.Contract(
      GTOKEN_STAKING_ADDRESS,
      GTOKEN_STAKING_ABI,
      provider
    );

    const existingStake = await gtokenStaking.getStakeInfo(userAddress);
    const stakedAmount = existingStake[0]; // amount is first element in tuple

    if (stakedAmount > 0n) {
      const formattedAmount = ethers.formatEther(stakedAmount);
      setHasExistingStake(true);
      setExistingStakeAmount(formattedAmount);
      console.log("ℹ️ Found existing GToken stake:", formattedAmount);
      setError(
        `You already have ${formattedAmount} GToken staked. ` +
        `Click "Use Existing Stake" below to continue with your current stake.`
      );
    }
  } catch (err) {
    console.log("Failed to check existing stake:", err);
  }
};

// 自动触发检测
React.useEffect(() => {
  if (currentStep === ResourceStep.StakeGToken && !hasExistingStake) {
    checkExistingStake();
  }
}, [currentStep]);
```

**效果**:
- ✅ 进入质押表单前自动检测
- ✅ 发现已有质押时显示金额并提供"使用现有质押"选项
- ✅ 避免重复质押导致的交易失败

#### 3. Paymaster 检测提前到连接钱包后

**文件**: `src/pages/operator/deploy-v2/steps/Step1_ConnectAndSelect.tsx`

**原需求**: 在 Step 3 检测并列出所有 Paymaster
**简化方案**: 连接钱包后立即检测，仅显示提示链接到 /explorer

**实现**:
```typescript
import { ethers } from "ethers";

const [existingPaymaster, setExistingPaymaster] = useState<string | null>(null);
const [checkingRegistry, setCheckingRegistry] = useState(false);

const checkExistingPaymaster = async (userAddress: string) => {
  try {
    setCheckingRegistry(true);
    const provider = new ethers.BrowserProvider(window.ethereum);
    const networkConfig = getCurrentNetworkConfig();

    const REGISTRY_V2_ABI = [
      "function getCommunityProfile(address communityAddress) external view returns (tuple(string name, string ensName, string description, string website, string logoURI, string twitterHandle, string githubOrg, string telegramGroup, address xPNTsToken, address[] supportedSBTs, uint8 mode, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, uint256 memberCount))",
    ];

    const registry = new ethers.Contract(
      networkConfig.contracts.registryV2,
      REGISTRY_V2_ABI,
      provider
    );

    console.log("🔍 Checking for existing Paymaster in Registry...");
    const profile = await registry.getCommunityProfile(userAddress);

    if (profile.paymasterAddress && profile.paymasterAddress !== ethers.ZeroAddress) {
      console.log("✅ Found existing Paymaster:", profile.paymasterAddress);
      setExistingPaymaster(profile.paymasterAddress);
    } else {
      console.log("ℹ️ No existing Paymaster found");
      setExistingPaymaster(null);
    }
  } catch (err) {
    console.log("ℹ️ No existing registration found:", err);
    setExistingPaymaster(null);
  } finally {
    setCheckingRegistry(false);
  }
};

// 连接钱包后自动检测
const handleConnectWallet = async () => {
  // ... 现有连接逻辑
  const address = accounts[0];
  setWalletAddress(address);

  // 检测现有 Paymaster
  await checkExistingPaymaster(address);

  setSubStep(SubStep.SelectOption);
};
```

**UI 提示**:
```typescript
{checkingRegistry && (
  <div className="existing-paymaster-checking">
    <span className="spinner">⏳</span>
    <span>检查是否已有 Paymaster 部署...</span>
  </div>
)}

{existingPaymaster && (
  <div className="existing-paymaster-warning">
    <span className="warning-icon">⚠️</span>
    <div className="warning-content">
      <strong>检测到已有 Paymaster</strong>
      <p>你已经部署过 Paymaster 合约</p>
      <a
        href="/explorer"
        className="view-explorer-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        点击这里查看 →
      </a>
    </div>
  </div>
)}
```

**文件**: `src/pages/operator/deploy-v2/steps/Step1_ConnectAndSelect.css`

**CSS 样式**:
```css
.existing-paymaster-checking {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #e3f2fd;
  border-radius: 12px;
  margin: 1rem 0;
  font-size: 0.95rem;
  color: #1976d2;
  border: 2px solid #90caf9;
}

.existing-paymaster-warning {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-radius: 12px;
  margin: 1rem 0 2rem 0;
  border: 2px solid #ffb74d;
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.2);
}

.view-explorer-link {
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: #ff9800;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
}

.view-explorer-link:hover {
  background: #f57c00;
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.5);
  transform: translateY(-2px);
}
```

**效果**:
- ✅ 连接钱包后立即检测 Registry
- ✅ 显示简洁的中文提示和 Explorer 链接
- ✅ 不干扰正常部署流程

#### 4. 运营指南入口添加

**文件**: `src/pages/operator/deploy-v2/steps/Step7_Complete.tsx`

**Resources 区域添加链接**:
```typescript
<div className="resources-grid">
  <a href="/operator/operate-guide" className="resource-link">
    📚 Operation Guide
  </a>
  <a href="http://localhost:5173/launch-tutorial" target="_blank" rel="noopener noreferrer" className="resource-link">
    📖 Deployment Guide
  </a>
  // ... 其他资源链接
</div>
```

**文件**: `src/pages/operator/ManagePaymasterFull.tsx`

**Header 区域添加链接按钮**:
```typescript
<div className="header-title">
  <h1>Manage Paymaster</h1>
  <a
    href="/operator/operate-guide"
    className="operate-guide-link"
    title="Learn how to operate your Paymaster"
  >
    📚 Operation Guide
  </a>
</div>
```

**文件**: `src/pages/operator/ManagePaymasterFull.css`

**CSS 样式**:
```css
.operate-guide-link {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.operate-guide-link:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

**效果**:
- ✅ 注册成功页显眼位置提供运营指南链接
- ✅ 管理页面 header 添加快速访问按钮
- ✅ 统一的视觉风格和交互体验

#### 5. 修复 ManagePaymaster Token Management

**文件**: `src/pages/operator/ManagePaymasterFull.tsx`

**问题**: 页面显示空白，实际是静态页面，未从 Paymaster 合约读取数据

**更新 ABI**:
```typescript
const PAYMASTER_V4_ABI = [
  // ... 原有 ABI
  "function getSupportedSBTs() view returns (address[])",
  "function getSupportedGasTokens() view returns (address[])",
  "function isSBTSupported(address) view returns (bool)",
  "function isGasTokenSupported(address) view returns (bool)",
  "function addSBT(address sbtToken)",
  "function removeSBT(address sbtToken)",
  "function addGasToken(address gasToken)",
  "function removeGasToken(address gasToken)",
];
```

**添加状态**:
```typescript
const [supportedSBTs, setSupportedSBTs] = useState<string[]>([]);
const [supportedGasTokens, setSupportedGasTokens] = useState<string[]>([]);
```

**读取合约数据**:
```typescript
const loadPaymasterData = async () => {
  // ... 现有逻辑

  try {
    const supportedSBTsList = await paymaster.getSupportedSBTs();
    const supportedGasTokensList = await paymaster.getSupportedGasTokens();
    console.log('✅ Supported SBTs:', supportedSBTsList);
    console.log('✅ Supported Gas Tokens:', supportedGasTokensList);
    setSupportedSBTs(supportedSBTsList);
    setSupportedGasTokens(supportedGasTokensList);
  } catch (tokenErr) {
    console.error('Failed to load supported tokens:', tokenErr);
    setSupportedSBTs([]);
    setSupportedGasTokens([]);
  }
};
```

**UI 显示**:
```typescript
{supportedSBTs.length > 0 && (
  <div className="supported-tokens-list">
    <strong>Currently Supported SBTs:</strong>
    <ul>
      {supportedSBTs.map((sbt, index) => (
        <li key={index}>
          <code>{sbt}</code>
        </li>
      ))}
    </ul>
  </div>
)}

{supportedGasTokens.length > 0 && (
  <div className="supported-tokens-list">
    <strong>Currently Supported Gas Tokens:</strong>
    <ul>
      {supportedGasTokens.map((token, index) => (
        <li key={index}>
          <code>{token}</code>
        </li>
      ))}
    </ul>
  </div>
)}

{supportedSBTs.length === 0 && supportedGasTokens.length === 0 && (
  <div className="no-tokens-message">
    ⚠️ No tokens configured. Use the forms below to add SBT or Gas Tokens.
  </div>
)}
```

**文件**: `src/pages/operator/ManagePaymasterFull.css`

**CSS 样式**:
```css
.supported-tokens-list {
  background: #f0f7ff;
  border-left: 4px solid #667eea;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.supported-tokens-list strong {
  display: block;
  margin-bottom: 0.75rem;
  color: #667eea;
  font-weight: 700;
  font-size: 1rem;
}

.supported-tokens-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.supported-tokens-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.supported-tokens-list li:last-child {
  border-bottom: none;
}

.supported-tokens-list code {
  background: #e8eaf6;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.85rem;
  color: #5c6bc0;
  word-break: break-all;
}

.no-tokens-message {
  background: #fff8e1;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  color: #856404;
  margin-bottom: 1.5rem;
  border: 1px solid #ffeaa7;
  text-align: center;
}
```

**效果**:
- ✅ 从合约实时读取 SBT 和 Gas Token 列表
- ✅ 清晰显示当前支持的 tokens
- ✅ 未配置时显示友好提示

#### 6. 修复 ManagePaymaster Registry 区域

**文件**: `src/pages/operator/ManagePaymasterFull.tsx`

**问题**:
- 显示 "Stake Amount: N/A"
- 缺少 Registry 合约地址
- 应显示 "lock" 而非 "stake"

**架构理解**:
- Registry v2.0 纯元数据存储，不管理质押
- 质押由 GTokenStaking 合约管理
- 用户在 Step 4 质押 GToken → 获得 stGToken
- 运行时系统自动 lock stGToken

**更新 RegistryInfo 接口**:
```typescript
interface RegistryInfo {
  registryAddress: string;
  stakedGToken: string;      // Amount of GToken staked in GTokenStaking
  availableToLock: string;   // Staked but not yet locked for paymaster
}
```

**添加 GTokenStaking ABI**:
```typescript
const GTOKEN_STAKING_ABI = [
  "function getStakeInfo(address user) view returns (tuple(uint256 amount, uint256 sGTokenShares, uint256 stakedAt, uint256 unstakeRequestedAt))",
  "function availableBalance(address user) view returns (uint256)",
  "function stake(uint256 amount) returns (uint256 shares)",
];

const GTOKEN_STAKING = import.meta.env.VITE_GTOKEN_STAKING_ADDRESS ||
  "0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2";
```

**读取 GTokenStaking 数据**:
```typescript
const loadPaymasterData = async () => {
  // ... 现有逻辑

  const REGISTRY_V2 = networkConfig.contracts.registryV2;
  const gtokenStaking = new ethers.Contract(GTOKEN_STAKING, GTOKEN_STAKING_ABI, provider);

  const stakeInfo = await gtokenStaking.getStakeInfo(userAddr);
  const availableBalance = await gtokenStaking.availableBalance(userAddr);

  console.log('📊 GToken Staking Info:', {
    stakedAmount: ethers.formatEther(stakeInfo.amount),
    availableToLock: ethers.formatEther(availableBalance),
  });

  setRegistryInfo({
    registryAddress: REGISTRY_V2,
    stakedGToken: ethers.formatEther(stakeInfo.amount),
    availableToLock: ethers.formatEther(availableBalance),
  });
};
```

**UI 显示**:
```typescript
<div className="info-section">
  <h3>🏛️ Registry & Staking Status</h3>

  <div className="info-card">
    <div className="info-row">
      <span className="label">Registry v2.0 Address:</span>
      <span className="value">
        <code>{registryInfo.registryAddress}</code>
      </span>
    </div>

    <div className="info-row">
      <span className="label">Your Staked GToken:</span>
      <span className="value">{registryInfo.stakedGToken} GToken</span>
    </div>

    <div className="info-row">
      <span className="label">Available to Lock:</span>
      <span className="value">{registryInfo.availableToLock} stGToken</span>
    </div>

    <div className="info-note">
      💡 <strong>Note:</strong> Registry v2.0 only stores community metadata.
      Your stGToken is managed by GTokenStaking contract and will be automatically
      locked during paymaster operations.
    </div>
  </div>

  {parseFloat(registryInfo.stakedGToken) === 0 && (
    <div className="warning-banner">
      <span className="warning-icon">⚠️</span>
      <div className="warning-content">
        <strong>No GToken Staked</strong>
        <p>You need to stake GToken first to operate your Paymaster. Minimum required: 10 GToken.</p>
      </div>
    </div>
  )}
</div>
```

**文件**: `src/pages/operator/ManagePaymasterFull.css`

**CSS 样式**:
```css
.warning-banner {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-radius: 12px;
  margin-top: 1.5rem;
  border: 2px solid #ffb74d;
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.2);
}

.warning-icon {
  font-size: 2rem;
  line-height: 1;
}

.warning-content {
  flex: 1;
}

.warning-content strong {
  display: block;
  font-size: 1.1rem;
  color: #e65100;
  margin-bottom: 0.5rem;
}

.warning-content p {
  margin: 0;
  color: #f57c00;
  line-height: 1.5;
}
```

**效果**:
- ✅ 显示 Registry v2 合约地址
- ✅ 显示用户在 GTokenStaking 中的质押量
- ✅ 显示可用于锁定的 stGToken 数量
- ✅ 未质押时显示警告提示
- ✅ 清晰的架构说明

#### 7. 添加 EntryPoint Deposit 按钮

**文件**: `src/pages/operator/ManagePaymasterFull.tsx`

**问题**: 无法直接向 EntryPoint 充值 ETH

**添加 EntryPoint ABI**:
```typescript
const ENTRY_POINT_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function getDepositInfo(address account) view returns (tuple(uint112 deposit, bool staked, uint112 stake, uint32 unstakeDelaySec, uint48 withdrawTime))",
  "function addDeposit(address account) payable",
];

const ENTRY_POINT_V07 = import.meta.env.VITE_ENTRY_POINT_V07_ADDRESS ||
  "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
```

**添加状态**:
```typescript
const [depositAmount, setDepositAmount] = useState<string>('');
```

**实现充值函数**:
```typescript
const handleAddDeposit = async () => {
  if (!depositAmount || parseFloat(depositAmount) <= 0) {
    alert('Please enter a valid deposit amount');
    return;
  }

  setTxPending(true);
  setError('');

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const entryPoint = new ethers.Contract(ENTRY_POINT_V07, ENTRY_POINT_ABI, signer);

    console.log('💰 Adding deposit to EntryPoint...');
    console.log('Amount:', depositAmount, 'ETH');
    console.log('Paymaster:', paymasterAddress);

    const tx = await entryPoint.addDeposit(paymasterAddress, {
      value: ethers.parseEther(depositAmount),
    });

    console.log('📤 Transaction sent:', tx.hash);
    await tx.wait();
    console.log('✅ Deposit confirmed!');

    alert(`Successfully deposited ${depositAmount} ETH to EntryPoint!`);
    setDepositAmount('');
    await loadPaymasterData();
  } catch (err: any) {
    console.error('Failed to add deposit:', err);
    setError(err.message || 'Failed to add deposit to EntryPoint');
    alert(`Failed to deposit: ${err.message || 'Unknown error'}`);
  } finally {
    setTxPending(false);
  }
};
```

**UI 组件**:
```typescript
<div className="deposit-card">
  <h3>💰 Add Deposit to EntryPoint</h3>
  <p>Deposit ETH to the EntryPoint contract for your Paymaster to sponsor gas fees.</p>

  <div className="deposit-input-group">
    <input
      type="number"
      step="0.001"
      min="0"
      value={depositAmount}
      onChange={(e) => setDepositAmount(e.target.value)}
      placeholder="Amount in ETH (e.g., 0.1)"
      className="deposit-input"
      disabled={txPending}
    />
    <button
      onClick={handleAddDeposit}
      disabled={!depositAmount || parseFloat(depositAmount) <= 0 || txPending}
      className="deposit-button"
    >
      {txPending ? 'Processing...' : 'Add Deposit'}
    </button>
  </div>

  {parseFloat(entryPointInfo.balance) < 0.01 && (
    <div className="low-balance-warning">
      ⚠️ Low balance! Your EntryPoint balance is below 0.01 ETH. Consider adding more funds.
    </div>
  )}
</div>
```

**文件**: `src/pages/operator/ManagePaymasterFull.css`

**CSS 样式**:
```css
.deposit-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-top: 2rem;
}

.deposit-card h3 {
  margin: 0 0 0.5rem 0;
  color: #667eea;
  font-size: 1.3rem;
}

.deposit-card p {
  margin: 0 0 1.5rem 0;
  color: #666;
  line-height: 1.6;
}

.deposit-input-group {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.deposit-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s;
}

.deposit-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.deposit-button {
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
  font-size: 1rem;
}

.deposit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.deposit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.low-balance-warning {
  background: #fff3e0;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  color: #e65100;
  font-weight: 600;
  border-left: 4px solid #ff9800;
}
```

**效果**:
- ✅ 提供 ETH 充值输入框和按钮
- ✅ 实时调用 `entryPoint.addDeposit()`
- ✅ 余额低于 0.01 ETH 时显示警告
- ✅ 充值成功后自动刷新数据

#### 8. 验证配置参数完整性

**文件**: `src/pages/operator/ManagePaymasterFull.tsx`

**对比 PaymasterV4.1 合约**: 读取 `src/contracts/PaymasterV4_1.json` ABI

**确认的配置参数**:
- ✅ owner (address)
- ✅ treasury (address)
- ✅ gasToUSDRate (uint256)
- ✅ pntPriceUSD (uint256)
- ✅ serviceFeeRate (uint256)
- ✅ maxGasCostCap (uint256)
- ✅ minTokenBalance (uint256)
- ✅ paused (bool)
- ✅ entryPoint (address) - 新增
- ✅ registry (address) - 新增
- ✅ isRegistrySet (bool) - 新增

**更新 PaymasterConfig 接口**:
```typescript
interface PaymasterConfig {
  owner: string;
  treasury: string;
  gasToUSDRate: string;
  pntPriceUSD: string;
  serviceFeeRate: string;
  maxGasCostCap: string;
  minTokenBalance: string;
  paused: boolean;
  entryPointAddress: string;      // ← 新增
  registryAddress: string;         // ← 新增
  isRegistrySet: boolean;          // ← 新增
}
```

**更新 ABI**:
```typescript
const PAYMASTER_V4_ABI = [
  // ... 原有 ABI
  "function entryPoint() view returns (address)",
  "function registry() view returns (address)",
  "function isRegistrySet() view returns (bool)",
  "function setRegistry(address registry)",
];
```

**读取配置**:
```typescript
const [
  owner,
  treasury,
  gasToUSDRate,
  pntPriceUSD,
  serviceFeeRate,
  maxGasCostCap,
  minTokenBalance,
  paused,
  entryPointAddress,    // ← 新增
  registryAddress,       // ← 新增
  isRegistrySet,         // ← 新增
] = await Promise.all([
  paymaster.owner(),
  paymaster.treasury(),
  paymaster.gasToUSDRate(),
  paymaster.pntPriceUSD(),
  paymaster.serviceFeeRate(),
  paymaster.maxGasCostCap(),
  paymaster.minTokenBalance(),
  paymaster.paused(),
  paymaster.entryPoint(),
  paymaster.registry(),
  paymaster.isRegistrySet(),
]);
```

**UI 显示**:
```typescript
<table className="config-table">
  {/* ... 原有配置项 */}

  <tr>
    <td><strong>EntryPoint Address</strong></td>
    <td><code>{config.entryPointAddress}</code></td>
    <td><em style={{color: '#999'}}>Read-only</em></td>
  </tr>

  <ConfigRow
    label="Registry Address"
    value={config.registryAddress}
    paramName="registry"
    isEditing={isEditingParam === 'registry'}
    onEdit={() => handleEditParam('registry', config.registryAddress)}
    onSave={() => handleSaveParam('registry')}
    onCancel={handleCancelEdit}
    editValue={editValue}
    setEditValue={setEditValue}
  />

  <tr>
    <td><strong>Registry Set Status</strong></td>
    <td>
      <span style={{
        color: config.isRegistrySet ? '#28a745' : '#dc3545',
        fontWeight: 600
      }}>
        {config.isRegistrySet ? '✓ Set' : '✗ Not Set'}
      </span>
    </td>
    <td><em style={{color: '#999'}}>Read-only</em></td>
  </tr>
</table>
```

**添加 Registry Setter**:
```typescript
const handleSaveParam = async (paramName: string) => {
  // ... 现有逻辑

  switch (paramName) {
    // ... 原有 cases
    case 'registry':
      tx = await paymaster.setRegistry(editValue);
      break;
  }
};
```

**效果**:
- ✅ 显示 EntryPoint 地址（只读）
- ✅ 显示并支持编辑 Registry 地址
- ✅ 显示 Registry 设置状态（已设置/未设置）
- ✅ 所有 PaymasterV4.1 可配置参数已完整支持

### 合约验证发现

**GTokenStaking 合约** (0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2):
- ✅ 确认有 `getStakeInfo(address)` 函数
- ✅ 确认有 `availableBalance(address)` 函数
- ✅ 确认有 `lockStake()` 和 `unlockStake()` 函数
- ✅ 最低质押要求需链上验证（用户认为是 10，当前配置显示 30）

**PaymasterV4.1 合约**:
- ✅ 确认有 `setMinTokenBalance()` setter
- ✅ 确认所有配置参数都有对应的 getter 和 setter
- ✅ 确认有 `getSupportedSBTs()` 和 `getSupportedGasTokens()` 函数

**Registry v2.0**:
- ✅ 纯元数据存储，不管理质押
- ✅ `getCommunityProfile()` 返回完整社区信息
- ✅ 质押由 GTokenStaking 专门管理（职责分离）

### 验证结果
- ✅ Step 2 xPNTs 部署前置检测正常工作
- ✅ Step 3 GToken Stake 前置检测正常工作
- ✅ Step 1 Paymaster 检测提前，UI 清晰
- ✅ 运营指南入口在两个页面都可访问
- ✅ Token Management 正确显示合约数据
- ✅ Registry 区域显示 GTokenStaking 信息
- ✅ EntryPoint 充值功能完整实现
- ✅ 配置参数完整，对齐 PaymasterV4.1 合约

### 影响范围
- **部署向导**: Step1 和 Step4 用户体验显著改善
- **管理界面**: 数据准确性和功能完整性大幅提升
- **架构理解**: 正确区分 Registry v2 和 GTokenStaking 职责

### 文件变更列表

**新建**:
- 无

**修改**:
- `src/pages/operator/deploy-v2/steps/Step4_DeployResources.tsx` - 添加 xPNTs 和 GToken 前置检测
- `src/pages/operator/deploy-v2/steps/Step1_ConnectAndSelect.tsx` - 添加 Paymaster 检测
- `src/pages/operator/deploy-v2/steps/Step1_ConnectAndSelect.css` - 检测 UI 样式
- `src/pages/operator/deploy-v2/steps/Step7_Complete.tsx` - 添加运营指南链接
- `src/pages/operator/ManagePaymasterFull.tsx` - Token Management, Registry, EntryPoint, 配置参数全面改进
- `src/pages/operator/ManagePaymasterFull.css` - 新增多个样式类

### 技术要点

**1. 前置检测 vs 报错后提示**:
- 前置检测：进入表单前自动查询合约状态
- 报错后提示：用户点击后交易失败才知道问题
- 改进：使用 React.useEffect 自动触发检测，提升用户体验

**2. Registry v2 架构理解**:
- Registry v2: 纯元数据存储（社区信息、Paymaster 地址等）
- GTokenStaking: 质押管理（stake、lock、unlock）
- 职责分离，不要混淆！

**3. ethers.js v6 核心用法**:
- `ethers.BrowserProvider(window.ethereum)` - 连接钱包
- `provider.getSigner()` - 获取签名器
- `new ethers.Contract(address, abi, provider/signer)` - 创建合约实例
- `ethers.parseEther()` / `ethers.formatEther()` - ETH 单位转换
- `ethers.ZeroAddress` - 0x0000...0000 地址常量

**4. ERC-4337 EntryPoint 存款流程**:
- Paymaster 需要在 EntryPoint 存入 ETH
- 使用 `addDeposit(paymasterAddress)` + `{value: ethAmount}`
- 存款用于支付用户的 gas 费用
- 建议最低余额 0.01 ETH

### 业务流程补充

**Gas 赞助完整流程**（用户提供）:
1. 用户构建 UserOperation（ERC-4337）
2. 填充 `paymaster` 和 `paymasterAndData`（包含 xPNTs 地址或留空自动检测）
3. EntryPoint 调用 `validateUserOps()`
4. Paymaster 检查用户 SBT 和 xPNTs 余额
5. 计算 gas 成本：
   - ETH → USD（Chainlink 喂价）
   - USD → aPNTs（默认 0.02U）
   - xPNTs 兑换比例（部署时设置，例如 1:4）
6. 双重扣款：
   - xPNTs: 用户 → Treasury（社区收入）
   - aPNTs: Paymaster → SuperPaymaster（AAStar 收入）
7. EntryPoint 从 Paymaster 的 deposit 扣除 ETH gas

### 下一步建议
- 链上验证 GToken 最低质押要求（10 vs 30）
- 实现 GToken staking 功能（目前仅显示，未提供 stake 操作）
- 完成 /explorer 页面真实合约交互（已暂缓）
- 添加 Token Management 的 add/remove 操作按钮

### Commits
- (待提交) feat: optimize deployment flow and complete management interface

---

## 2025-10-24 - 重命名 "standard" 为 "aoa"

### 任务概述
将代码库中的 "standard" 相关术语重命名为 "aoa"，以更准确地反映 AOA (Account Owned Address) 模式。

### 修改的文件

#### 1. `/Volumes/UltraDisk/Dev2/aastar/registry/src/pages/operator/deploy-v2/steps/Step5_Stake.tsx`
- 更新类型定义：`"standard" | "super"` → `"aoa" | "super"`
- 更新注释：`Standard:` → `AOA:`
- 更新 UI 文案：`Standard Flow` → `AOA Flow`
- 更新推荐信息：`recommended for Standard Flow` → `recommended for AOA Flow`

#### 2. `/Volumes/UltraDisk/Dev2/aastar/registry/src/pages/operator/deploy-v2/steps/Step1_ConnectAndSelect.tsx`
- 更新变量名：`standardOption` → `aoaOption`
- 更新选项判断：`option === 'standard'` → `option === 'aoa'`
- 更新 CSS 类名：`comparison-standard` → `comparison-aoa`
- 更新选项卡选择：`selected={selectedOption === "standard"}` → `selected={selectedOption === "aoa"}`
- 更新事件处理：`handleSelectOption("standard")` → `handleSelectOption("aoa")`
- 更新帮助文本：`Standard Flow:` → `AOA Flow:`
- 更新注释：`// AOA flow doesn't need PNTs`

#### 3. `/Volumes/UltraDisk/Dev2/aastar/registry/src/pages/operator/deploy-v2/steps/Step4_StakeOption.tsx`
- 更新变量名：`standardOption` → `aoaOption`
- 更新函数参数：`calculateRecommendation(walletStatus, aoaOption, superOption)`
- 更新条件判断：`selectedOption === "standard"` → `selectedOption === "aoa"`
- 更新推荐文案：`Standard ERC-4337 Flow` → `AOA ERC-4337 Flow`
- 更新帮助文本：`选择 Standard Flow` → `选择 AOA Flow`
- 更新逻辑判断：`aoaMet`, `aoaExcess`, `aoaMissing`
- 更新推荐理由：涉及 "Standard Flow" 的文本全部改为 "AOA Flow"

#### 4. `/Volumes/UltraDisk/Dev2/aastar/registry/src/pages/operator/deploy-v2/utils/walletChecker.ts`
- 更新函数签名：`option: "standard" | "super"` → `option: "aoa" | "super"`
- 更新条件判断：`if (option === "standard")` → `if (option === "aoa")`
- 更新注释：`// Standard flow needs:` → `// AOA flow needs:`

### 重命名规则
- ✅ `"standard"` (字符串字面量) → `"aoa"`
- ✅ `Standard` (UI 文案/注释中的单词) → `AOA`
- ✅ `standard` (变量名，如 `standardOption`) → `aoa` (如 `aoaOption`)
- ✅ CSS 类名：`comparison-standard` → `comparison-aoa`

### 保留不变
- ✅ 函数名保持不变（如 `Step5_StandardFlow` 函数名保留，仅注释更新）
- ✅ `minEthStandardFlow` 等配置项名称保留（这是配置键）
- ✅ CSS 类名中的其他 standard 相关类保持兼容

### 验证
所有修改已成功完成，文件已更新。建议进行以下测试：
1. 检查 TypeScript 编译是否通过
2. 测试 UI 选项卡切换功能
3. 验证 AOA 和 Super 模式的资源检查逻辑
4. 确认所有文案显示正确

---

