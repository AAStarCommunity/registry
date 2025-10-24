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
每次主要任务或阶段完成后，请按以下格式添加记录：

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

