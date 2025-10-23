# Registry Launch Paymaster 优化方案

**日期**: 2025-10-23
**版本**: v1.0
**状态**: 🎯 精准优化方案

---

## 📊 现有实现分析

### ✅ 已完成的功能（非常完善！）

**架构**：
```
DeployWizard.tsx (主向导)
├── Step 1: ConfigForm (配置表单) ✅
├── Step 2: WalletCheck (钱包检查) ✅
├── Step 3: StakeOption (选择方案) ✅
│   ├── Standard Flow (标准流程) ✅
│   └── Fast Flow (快速流程) ✅
├── Step 4: ResourcePrep (资源准备) ✅
├── Step 5: StakeEntryPoint (EntryPoint Stake) ✅
├── Step 6: RegisterRegistry (注册到 Registry) ✅
└── Step 7: Complete (完成管理) ✅
```

**支持的页面**：
- ✅ GetGToken.tsx
- ✅ GetPNTs.tsx
- ✅ ManagePaymasterFull.tsx
- ✅ 完整的 7-step wizard

---

## 🔍 Gap 分析

### 当前实现 vs 用户需求

| 项目 | 当前实现 | 用户需求 | 是否匹配 |
|------|---------|---------|---------|
| **模式1（ETH Stake）** | Standard Flow | 模式1：ETH Stake | ✅ **完全匹配** |
| | - ETH + GToken | - ETH + GToken | |
| | - 部署 PaymasterV4 | - 部署 PaymasterV4 | |
| | - Stake/Deposit ETH 到 EntryPoint | - Stake/Deposit ETH 到 EntryPoint | |
| | | | |
| **模式2（Super Mode）** | Fast Flow | 模式2：GToken Super | ⚠️ **需要调整** |
| | - ETH + GToken + PNTs | - 少量 ETH（gas only） | |
| | - 部署 PaymasterV4（?) | - **不部署**合约 | |
| | - Stake/Deposit EntryPoint（?) | - Stake GToken + Lock sGToken | |
| | | - Deposit aPNTs 到 SuperPaymasterV2 | |
| | | - 注册到 SuperPaymasterV2（operator） | |

**结论**：
- **Standard Flow** = **模式1** ✅ 已完美实现
- **Fast Flow** 需要重构为 **Super Mode（模式2）**

---

## 🎯 精准优化方案

### 优化策略：**最小改动原则**

不重新开发，只需调整：
1. **重命名** Fast Flow → Super Mode
2. **调整** Fast Flow 的逻辑以支持 SuperPaymasterV2
3. **保留** 所有现有组件和样式
4. **复用** 已有的 WalletCheck、ResourcePrep 等组件

---

## 📝 具体优化清单

### 🔧 修改 1: 重命名和调整 StakeOptionCard

**文件**: `src/pages/operator/deploy-v2/components/StakeOptionCard.tsx`

#### 修改 createStandardFlowOption（轻微调整）

```typescript
export function createStandardFlowOption(...): StakeOption {
  return {
    type: "standard",
    title: "模式1：ETH Stake（PaymasterV4）",  // 更新标题
    subtitle: "部署自己的 PaymasterV4 合约，Stake ETH 到 EntryPoint",
    requirements: [
      {
        label: "ETH（部署 + Stake + Deposit）",
        value: `需要 ≥ ${config.requirements.minEthStandardFlow} ETH`,
        met: ethBalance >= minEth,
      },
      // GToken requirement 可选（用于 Registry reputation）
    ],
    steps: [
      "部署 PaymasterV4 合约",
      "Stake ETH 到 EntryPoint",
      "Deposit ETH 到 EntryPoint（gas pool）",
      "注册到 Registry（自动路由）",
      "完成！开始接收 gas 赞助请求",
    ],
    benefits: [
      "✅ 完全符合 ERC-4337 标准",
      "✅ 独立控制 Paymaster",
      "✅ 无需链下服务器签名",
      "✅ 可自定义收费规则",
      "✅ 后续自行补充 ETH",
    ],
    warnings: [
      "需要管理 ETH 资金池",
      "Gas 成本在 L1 较高（建议部署到 L2）",
    ],
    suitable: [
      "有一定 ETH 余额的社区",
      "希望独立控制的 operator",
      "偏好传统模式的团队",
    ],
  };
}
```

#### 修改 createFastFlowOption → createSuperModeOption（重要！）

```typescript
// 重命名：createFastFlowOption → createSuperModeOption
export function createSuperModeOption(
  walletStatus: WalletStatus,
  config: ReturnType<typeof getCurrentNetworkConfig>
): StakeOption {
  const ethBalance = parseFloat(walletStatus.ethBalance);
  const gTokenBalance = parseFloat(walletStatus.gTokenBalance);
  const apntsBalance = parseFloat(walletStatus.apntsBalance); // 改为 aPNTs

  // Super Mode 只需要少量 ETH 用于 gas
  const minEth = 0.1; // 仅用于 gas
  const minGToken = 100; // Stake + Lock
  const minAPNTs = 1000; // Deposit 到 SuperPaymasterV2

  return {
    type: "super",  // 改为 "super"
    title: "模式2：GToken Super Mode",  // 更新
    subtitle: "三秒钟启动 Paymaster - 无需部署合约和服务器",
    recommended: allResourcesMet,
    badge: "推荐",  // 改为"推荐"
    requirements: [
      {
        label: "ETH（仅 gas）",
        value: `需要 ≥ ${minEth} ETH（当前: ${walletStatus.ethBalance} ETH）`,
        met: ethBalance >= minEth,
      },
      {
        label: "GToken（Stake + Lock）",
        value: `需要 ≥ ${minGToken} GToken（当前: ${walletStatus.gTokenBalance} GToken）`,
        met: gTokenBalance >= minGToken,
      },
      {
        label: "aPNTs（Gas Backing）",
        value: `需要 ≥ ${minAPNTs} aPNTs（当前: ${walletStatus.apntsBalance} aPNTs）`,
        met: apntsBalance >= minAPNTs,
      },
    ],
    steps: [
      "Stake GToken → 获得 sGToken",
      "注册到 SuperPaymasterV2（自动 lock sGToken）",
      "Deposit aPNTs 到 SuperPaymasterV2",
      "部署 xPNTs Token（社区 gas token）",
      "完成！三秒钟启动 Paymaster",
    ],
    benefits: [
      "⚡ **零部署成本** - 无需部署 Paymaster 合约",
      "⚡ **零服务器** - 无需链下签名服务",
      "⚡ **三秒启动** - 最快的 launch 方式",
      "✅ 共享 SuperPaymasterV2 合约",
      "✅ 统一的 Reputation 系统",
      "✅ aPNTs 作为协议收入来源",
      "✅ 自动注册到 Registry 路由",
    ],
    warnings: [
      "依赖 SuperPaymasterV2 合约",
      "需要购买/获取 aPNTs",
      "sGToken 锁定期（最低 30 个）",
    ],
    suitable: [
      "希望快速启动的新社区",
      "资源有限但有 GToken 的团队",
      "偏好简单运维的 operator",
      "已有 AAStar 生态资源的社区",
    ],
  };
}
```

#### 更新 type 定义

```typescript
// 修改
export type StakeOptionType = "standard" | "super"; // 改为 "super"
```

---

### 🔧 修改 2: 更新 DeployWizard.tsx

**文件**: `src/pages/operator/DeployWizard.tsx`

#### 更新 DeployConfig interface

```typescript
export interface DeployConfig {
  // ... 现有字段

  // Step 3: Stake option
  stakeOption?: 'standard' | 'super'; // 改为 'super'

  // Super Mode specific (新增)
  sGTokenLocked?: string;
  apntsDeposited?: string;
  xPNTsTokenAddress?: string;
  operatorRegistered?: boolean;
}
```

#### 更新 Step 3 调用

```typescript
// Line 156-162
const handleStep3Complete = (option: 'standard' | 'super') => {  // 改为 'super'
  setConfig({
    ...config,
    stakeOption: option,
  });
  handleNext();
};
```

---

### 🔧 修改 3: 调整 Step5_StakeEntryPoint.tsx

**文件**: `src/pages/operator/deploy-v2/steps/Step5_StakeEntryPoint.tsx`

这一步需要根据 stakeOption 分流：

```typescript
export const Step5_StakeEntryPoint: React.FC<Step5Props> = ({
  paymasterAddress,
  walletStatus,
  selectedOption,  // 'standard' | 'super'
  onNext,
  onBack,
}) => {
  if (selectedOption === 'standard') {
    // 模式1: Stake ETH 到 EntryPoint（现有逻辑）
    return <StakeETHToEntryPoint ... />;
  } else {
    // 模式2: Stake GToken + Register to SuperPaymasterV2（新逻辑）
    return <StakeToSuperPaymaster ... />;
  }
};
```

需要创建新组件：`StakeToSuperPaymaster.tsx`

---

### 🔧 修改 4: 创建 StakeToSuperPaymaster 组件

**新文件**: `src/pages/operator/deploy-v2/steps/components/StakeToSuperPaymaster.tsx`

```typescript
/**
 * Super Mode Stake Flow
 *
 * Steps:
 * 1. Stake GToken → sGToken
 * 2. Register to SuperPaymasterV2 (auto lock sGToken)
 * 3. Deposit aPNTs to SuperPaymasterV2
 * 4. Deploy xPNTs token (via factory)
 */
export const StakeToSuperPaymaster: React.FC<Props> = ({ ... }) => {
  const [currentSubStep, setCurrentSubStep] = useState(1);

  // Sub-step 1: Stake GToken
  const stakeGToken = async () => {
    // 1. Approve GToken to GTokenStaking
    await gtoken.approve(gTokenStaking, amount);

    // 2. Stake GToken
    await gTokenStaking.stake(amount);
  };

  // Sub-step 2: Register to SuperPaymasterV2
  const registerOperator = async () => {
    // SuperPaymasterV2.registerOperator(
    //   sGTokenAmount,
    //   supportedSBTs,
    //   xPNTsName,
    //   xPNTsSymbol,
    //   treasury,
    //   exchangeRate
    // )
    // 内部会：lock sGToken + 部署 xPNTs
  };

  // Sub-step 3: Deposit aPNTs
  const depositAPNTs = async () => {
    // 1. Approve aPNTs to SuperPaymasterV2
    await apnts.approve(superPaymasterV2, amount);

    // 2. Deposit
    await superPaymasterV2.depositAPNTs(amount);
  };

  return (
    <div className="stake-super-mode">
      <h2>🚀 Super Mode Stake</h2>

      {/* Sub-step progress */}
      <div className="sub-steps">
        <SubStep
          number={1}
          title="Stake GToken"
          active={currentSubStep === 1}
          onExecute={stakeGToken}
        />
        <SubStep
          number={2}
          title="Register Operator"
          active={currentSubStep === 2}
          onExecute={registerOperator}
        />
        <SubStep
          number={3}
          title="Deposit aPNTs"
          active={currentSubStep === 3}
          onExecute={depositAPNTs}
        />
      </div>

      {/* Buttons */}
      <div className="actions">
        <button onClick={onBack}>← 返回</button>
        <button onClick={handleComplete}>完成 →</button>
      </div>
    </div>
  );
};
```

---

### 🔧 修改 5: 调整 WalletChecker

**文件**: `src/pages/operator/deploy-v2/utils/walletChecker.ts`

添加 aPNTs 余额检查：

```typescript
export interface WalletStatus {
  connected: boolean;
  address: string;
  ethBalance: string;
  gTokenBalance: string;
  pntsBalance: string;
  apntsBalance: string; // 新增
  // ...
}

export async function checkWalletStatus(config: {
  requiredETH: string;
  requiredGToken: string;
  requiredPNTs: string;
  requiredAPNTs: string; // 新增
  gTokenAddress?: string;
  pntAddress?: string;
  apntsAddress?: string; // 新增
}): Promise<WalletStatus> {
  // ... 现有逻辑

  // 新增：获取 aPNTs 余额
  const apntsBalance = apntsAddress
    ? await getTokenBalance(address, apntsAddress)
    : '0';

  return {
    // ...
    apntsBalance,
  };
}
```

---

## 📋 完整修改清单

### P0（必须 - 核心功能）

#### 文件修改

- [ ] **StakeOptionCard.tsx**
  - [ ] 重命名 `createFastFlowOption` → `createSuperModeOption`
  - [ ] 更新 `type: "super"`
  - [ ] 调整 requirements（ETH for gas only, GToken, aPNTs）
  - [ ] 更新 steps、benefits、warnings

- [ ] **DeployWizard.tsx**
  - [ ] 更新 `stakeOption` type: `'standard' | 'super'`
  - [ ] 添加 Super Mode 相关字段到 DeployConfig

- [ ] **Step3_StakeOption.tsx**
  - [ ] 调用 `createSuperModeOption` 而非 `createFastFlowOption`

- [ ] **Step5_StakeEntryPoint.tsx**
  - [ ] 添加分流逻辑（standard vs super）
  - [ ] Import 和调用 `StakeToSuperPaymaster` 组件

- [ ] **walletChecker.ts**
  - [ ] 添加 `apntsBalance` 字段
  - [ ] 实现 aPNTs 余额查询

#### 新建文件

- [ ] **StakeToSuperPaymaster.tsx**（核心新组件）
  - [ ] Sub-step 1: Stake GToken
  - [ ] Sub-step 2: Register to SuperPaymasterV2
  - [ ] Sub-step 3: Deposit aPNTs
  - [ ] Sub-step 4: Display results

### P1（高优先级 - 完善）

- [ ] **Step4_ResourcePrep.tsx**
  - [ ] 更新资源准备逻辑（区分 standard vs super）
  - [ ] 添加 aPNTs 获取引导

- [ ] **Step6_RegisterRegistry.tsx**
  - [ ] Super Mode: 注册 SuperPaymasterV2 到 Registry（一次性，owner 操作）
  - [ ] Standard Mode: 注册 PaymasterV4 到 Registry

- [ ] **Step7_Complete.tsx**
  - [ ] 显示不同模式的完成信息
  - [ ] Super Mode: 显示 operator address、xPNTs address
  - [ ] 引导到 demo.aastar.io 测试

### P2（中优先级 - 优化）

- [ ] **GetGToken.tsx** & **GetPNTs.tsx**
  - [ ] 检查是否需要更新（可能已经完善）
  - [ ] 添加 "获取 aPNTs" 链接

- [ ] **ManagePaymasterFull.tsx**
  - [ ] 支持管理 Super Mode operator
  - [ ] 显示 aPNTs 余额、sGToken locked 等

- [ ] **错误处理和用户反馈**
  - [ ] 添加交易失败重试逻辑
  - [ ] 改进加载状态显示
  - [ ] 添加交易确认链接（Etherscan）

---

## 🎨 UI/UX 保持一致

**重要原则**：
- ✅ 保持现有的 CSS 样式
- ✅ 复用所有现有组件（ChecklistItem、WalletStatus 等）
- ✅ 保持 step wizard 的整体流程
- ✅ 只调整文字和逻辑，不重新设计 UI

**命名约定**：
- "模式1：ETH Stake" 或简称 "Standard"
- "模式2：GToken Super" 或简称 "Super Mode"

---

## 🧪 测试计划

### 测试场景1：模式1（Standard - ETH Stake）

1. 连接钱包（有 0.2 ETH）
2. 选择 "Standard Flow"
3. 部署 PaymasterV4
4. Stake ETH 到 EntryPoint
5. Deposit ETH 到 EntryPoint
6. 注册到 Registry
7. 验证可以接收 gas 赞助请求

### 测试场景2：模式2（Super Mode）

1. 连接钱包（有 0.1 ETH + 100 GToken + 1000 aPNTs）
2. 选择 "Super Mode"
3. Stake GToken → sGToken
4. Register to SuperPaymasterV2（auto lock sGToken + deploy xPNTs）
5. Deposit aPNTs
6. 验证 operator 注册成功
7. 验证可以通过 SuperPaymasterV2 接收 gas 赞助请求

---

## 📊 影响评估

### ✅ 向后兼容性：完美

- **Standard Flow 保持不变** - 现有模式1用户不受影响
- **新增 Super Mode** - 不破坏现有功能
- **共享组件** - WalletCheck、ResourcePrep 等复用

### 🎯 工作量评估

| 任务 | 预估时间 | 优先级 |
|------|---------|--------|
| 重命名和调整 StakeOptionCard | 1小时 | P0 |
| 更新 DeployWizard 和 Step3 | 30分钟 | P0 |
| 创建 StakeToSuperPaymaster 组件 | 3小时 | P0 |
| 调整 Step5 分流逻辑 | 1小时 | P0 |
| 更新 walletChecker（aPNTs） | 1小时 | P0 |
| 完善 Step4/Step6/Step7 | 2小时 | P1 |
| 测试和优化 | 2小时 | P1 |
| **总计** | **~10小时** | |

### 🚀 预期效果

**用户体验**：
- ✅ 清晰的两种模式选择
- ✅ 智能推荐（根据钱包余额）
- ✅ 完整的 7-step wizard 流程
- ✅ 统一的 UI/UX 体验

**技术架构**：
- ✅ 完全符合用户需求
- ✅ 最小改动原则
- ✅ 代码复用最大化
- ✅ 易于维护和扩展

---

## 📝 总结

### ✅ 现有实现非常完善

**已完成**：
- ✅ 完整的 7-step wizard
- ✅ 模式1（Standard Flow）已完美实现
- ✅ 精美的 UI 组件和样式
- ✅ WalletCheck、ResourcePrep 等工具组件

### 🎯 需要的精准优化

**核心改动**（仅 3 个文件 + 1 个新文件）：
1. **StakeOptionCard.tsx** - 重命名 Fast → Super
2. **Step5_StakeEntryPoint.tsx** - 添加分流
3. **walletChecker.ts** - 添加 aPNTs
4. **StakeToSuperPaymaster.tsx** - 新建（核心组件）

**其他调整**（微调即可）：
- DeployWizard.tsx - 类型更新
- Step3/4/6/7 - 文字和逻辑微调

### 🚀 实施建议

1. **先实施 P0 任务**（核心功能，~6小时）
2. **测试两种模式**（确保都能正常工作）
3. **再实施 P1/P2**（完善和优化，~4小时）

---

**文档版本**: v1.0
**创建时间**: 2025-10-23
**作者**: Claude Code
**状态**: ✅ 准备实施
