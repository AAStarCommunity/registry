# SuperPaymasterV2 与 Registry 流程对比分析

## 执行摘要

基于 SuperPaymasterV2 成功测试流程,当前 registry 的 launch paymaster 流程需要更新以反映实际的 V2 架构和要求。

## 一、当前 Registry 流程（7 步）

### Operator Portal 部署流程
1. **Step 1**: 填写配置信息
2. **Step 2**: 连接钱包
3. **Step 3**: 选择质押选项（EntryPoint）
4. **Step 4**: 部署 Paymaster 合约
5. **Step 5**: 质押到 EntryPoint
6. **Step 6**: 注册到 Registry（Approve GToken + Register）
7. **Step 7**: 完成部署

### 现有独立页面
- Get PNTs
- Get GToken

## 二、SuperPaymasterV2 实际成功流程

### A. Operator 一次性准备

#### 1. 部署 V2 合约（管理员）
```bash
forge script script/DeploySuperPaymasterV2.s.sol
```
**部署内容**：
- SuperPaymasterV2
- Registry
- GToken
- GTokenStaking
- MySBT
- xPNTsFactory
- DVTValidator
- BLSAggregator

#### 2. Step1 - 部署 aPNTs Token（Operator）
```bash
forge script script/v2/Step1_Setup.s.sol
```
**作用**：Operator 部署自己的 aPNTs token（Operator 用来支付 gas 的代币）

#### 3. Step2 - Operator 注册（Operator）
```bash
forge script script/v2/Step2_OperatorRegister.s.sol
```
**关键操作**：
- Operator 注册到 Registry
- **自动创建 xPNTs token**（用户用来支付 gas 的代币）
- xPNTs token 自动添加 SuperPaymaster 到 auto-approved spenders（**无需用户 approve**）

#### 4. Step3 - Operator 充值 aPNTs（Operator）
```bash
forge script script/v2/Step3_OperatorDeposit.s.sol
```
**作用**：Operator 向 SuperPaymaster 充值 aPNTs，用于实际支付 gas 费用

#### 5. EntryPoint 充值（Operator）
```bash
cast send $ENTRY_POINT "depositTo(address)" $SUPER_PAYMASTER_V2 \
  --value 0.1ether
```

### B. 用户准备（SimpleAccount）

#### 1. 获得 GT（GToken）
```bash
cast send $GTOKEN_ADDRESS "mint(address,uint256)" $SIMPLE_ACCOUNT 1ether
```

#### 2. Stake GT 获得 sGToken
```bash
# SimpleAccount.execute() to approve GT
# SimpleAccount.execute() to stake GT
```
**结果**：SimpleAccount 获得 0.4 sGToken

#### 3. Mint SBT
```bash
# SimpleAccount.execute() to approve GT for mint fee
# SimpleAccount.execute() to mintSBT(operator)
```
**要求**：需要持有 sGToken 才能 mint SBT

#### 4. 获得 xPNTs（用户 Gas Token）
```bash
cast send $OPERATOR_XPNTS_TOKEN "mint(address,uint256)" \
  $SIMPLE_ACCOUNT "200000000000000000000"
```

### C. 可重复测试
每次测试消耗 ~153.5 xPNTs，需要定期 mint 补充。

## 三、关键差异分析

### 1. Token 体系完全不同

| 旧版（PaymasterV4） | 新版（V2） | 用途 |
|-------------------|-----------|------|
| PNT | xPNTs | 用户支付 gas |
| - | aPNTs | Operator 支付实际 gas |
| GToken | GToken | 质押获得权益 |
| - | sGToken | Stake GT 后获得，用于验证身份 |

### 2. Pre-Authorization 机制

**V2 创新**：
- xPNTs token 内置 `autoApprovedSpenders` 映射
- xPNTsFactory 部署 xPNTs 时自动添加 SuperPaymaster
- 用户**无需 approve**，直接可以使用 xPNTs 支付 gas

**代码位置**：
- `src/v2/tokens/xPNTsToken.sol:106-119` - allowance() override
- `src/v2/tokens/xPNTsFactory.sol:160-162` - auto-configure

### 3. sGToken 要求

**V2 核心要求**：
- 所有合约检查用户是否持有 **sGToken**（Staked GToken）
- 不是直接检查 GToken，而是检查 GTokenStaking.balanceOf()
- sGToken 需要 **lock**（锁定状态）

### 4. SBT 检查逻辑

**V2 检查对象**：
- 检查 `userOp.sender`（即 SimpleAccount 合约地址）
- **不是检查 owner**，而是检查合约账户本身
- SimpleAccount 必须持有 SBT

## 四、Registry 流程改进建议

### 方案 A：完全遵循用户建议（推荐）

#### 独立页面架构

**1. Get GToken Page**（独立）
- 功能：Mint GToken
- 对象：Operator / User
- 操作：连接钱包 → Mint GT

**2. Stake Page**（独立）
- 功能：Stake GToken 获得 sGToken
- 对象：Operator / User
- 操作：
  - Approve GT to GTokenStaking
  - Stake GT
  - 显示 sGToken 余额
  - 显示 lock 状态

**3. Get SBT Page**（独立）
- 功能：Mint SBT
- 对象：User（SimpleAccount）
- **前置要求**：持有 sGToken
- 操作：
  - 检查 sGToken 余额
  - Approve GT for mint fee
  - MintSBT(operator)
  - 显示 SBT tokenId

**4. Get PNTs Page**（独立）
- 功能：获取 xPNTs（用户）或 aPNTs（operator）
- 对象：Operator / User
- 操作：
  - For Operator: Mint aPNTs
  - For User: Mint xPNTs

#### Launch Paymaster Flow（重新设计为 V2 流程）

**前置准备**：
- ✅ 获得 GToken（跳转到 Get GToken Page）
- ✅ Stake GToken 获得 sGToken（跳转到 Stake Page）

**Step 1: 部署 aPNTs Token**
- 使用 xPNTsFactory 部署 operator 的 aPNTs token
- 显示部署的 aPNTs token 地址

**Step 2: Operator 注册**
- **前置检查**：是否持有 sGToken？
- 调用 Registry.registerOperator()
- **自动创建**：xPNTs token（用户 gas token）
- 显示创建的 xPNTs token 地址
- **说明**：xPNTs 自动支持无 approve 支付

**Step 3: 充值 aPNTs**
- Operator approve aPNTs to SuperPaymaster
- Operator deposit aPNTs to SuperPaymaster
- 显示 deposit 数量

**Step 4: EntryPoint 充值**
- Deposit ETH to EntryPoint for paymaster
- 建议金额：0.1 ETH

**Step 5: 完成**
- 显示摘要：
  - aPNTs address
  - xPNTs address
  - Deposit 状态
  - EntryPoint balance
- **Next Steps**：
  - 用户需要获得 sGToken
  - 用户需要 mint SBT
  - 用户需要获得 xPNTs

### 方案 B：渐进式更新（兼容旧版）

保留现有 7 步流程，但增加 V2 专用流程：

#### 增加 "Launch V2 Paymaster" 选项

**独立的 V2 流程**：
1. 检查前置条件（sGToken）
2. 部署 aPNTs
3. 注册 Operator
4. 充值 aPNTs
5. EntryPoint 充值
6. 完成

**优点**：
- 兼容旧版 PaymasterV4
- 逐步迁移

**缺点**：
- 维护两套流程
- 用户可能混淆

## 五、配置文件更新建议

### 1. `/Volumes/UltraDisk/Dev2/aastar/registry/.env`

**需要添加 V2 合约地址**：

```bash
# V2 Contract Addresses (Sepolia)
SUPER_PAYMASTER_V2_ADDRESS=0xb96d8BC6d771AE5913C8656FAFf8721156AC8141
REGISTRY_ADDRESS=0x6806e4937038e783cA0D3961B7E258A3549A0043
GTOKEN_ADDRESS=0x54Afca294BA9824E6858E9b2d0B9a19C440f6D35
GTOKEN_STAKING_ADDRESS=0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2
XPNTS_FACTORY_ADDRESS=0x356CF363E136b0880C8F48c9224A37171f375595
MYSBT_ADDRESS=0xB330a8A396Da67A1b50903E734750AAC81B0C711
DVT_VALIDATOR_ADDRESS=0x8E03495A45291084A73Cee65B986f34565321fb1
BLS_AGGREGATOR_ADDRESS=0xA7df6789218C5a270D6DF033979698CAB7D7b728

# V2 Test Accounts
SIMPLE_ACCOUNT_B=0x8135c8c3BbF2EdFa19409650527E02B47233a9Ce
OPERATOR_APNTS_TOKEN_ADDRESS=0xe99f6b5a1008862B9467B44B6D688A7c3cBE16BE
OPERATOR_XPNTS_TOKEN_ADDRESS=0x95A71F3C8c25D14ec2F261Ab293635d7f37A55ab
```

### 2. 前端组件配置

**新建文件**：`src/config/v2-contracts.ts`

```typescript
export const V2_CONTRACTS = {
  sepolia: {
    superPaymaster: '0xb96d8BC6d771AE5913C8656FAFf8721156AC8141',
    registry: '0x6806e4937038e783cA0D3961B7E258A3549A0043',
    gtoken: '0x54Afca294BA9824E6858E9b2d0B9a19C440f6D35',
    gtokenStaking: '0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2',
    xpntsFactory: '0x356CF363E136b0880C8F48c9224A37171f375595',
    mysbt: '0xB330a8A396Da67A1b50903E734750AAC81B0C711',
  }
};

export const V2_ABI = {
  // TODO: 添加 ABIs
};
```

## 六、用户体验流程图

### Operator Journey（V2）

```
1. Landing Page
   ↓
2. Get GToken Page（独立）
   - Mint GT
   ↓
3. Stake Page（独立）
   - Approve GT
   - Stake GT → 获得 sGToken
   ↓
4. Launch Paymaster Flow
   Step 1: 部署 aPNTs
   Step 2: 注册 Operator（自动创建 xPNTs）
   Step 3: 充值 aPNTs
   Step 4: EntryPoint 充值
   Step 5: 完成
   ↓
5. 引导用户获取资产
```

### User Journey（V2）

```
1. Landing Page
   ↓
2. Get GToken Page（独立）
   - Mint GT to SimpleAccount
   ↓
3. Stake Page（独立）
   - SimpleAccount.execute() approve GT
   - SimpleAccount.execute() stake GT
   ↓
4. Get SBT Page（独立）
   - 检查 sGToken（前置条件）
   - SimpleAccount.execute() approve GT for fee
   - SimpleAccount.execute() mintSBT(operator)
   ↓
5. Get PNTs Page（独立）
   - Mint xPNTs to SimpleAccount
   ↓
6. Developer Page
   - 测试 gasless 交易
```

## 七、实施优先级

### P0（必须）
- [ ] 添加 V2 合约地址到 `.env`
- [ ] 创建 Stake Page（独立页面）
- [ ] 创建 Get SBT Page（独立页面）
- [ ] 更新 Get GToken Page（显示 sGToken 信息）
- [ ] 更新 Get PNTs Page（区分 aPNTs 和 xPNTs）

### P1（高优先级）
- [ ] 重新设计 Launch Paymaster Flow（V2 流程）
- [ ] 添加前置条件检查（sGToken）
- [ ] 更新文档（USER_GUIDE.md）

### P2（中优先级）
- [ ] 添加 V2 测试脚本集成
- [ ] 显示 auto-approval 状态
- [ ] 添加 gas 消耗计算器

### P3（低优先级）
- [ ] 添加流程可视化
- [ ] 添加历史记录
- [ ] 添加分析面板

## 八、总结

SuperPaymasterV2 引入了全新的 token 体系和 pre-authorization 机制，registry 需要重新设计以反映这些变化。**关键是按照用户建议，将 Get GToken、Stake、Get SBT、Get PNTs 设计为独立页面**，并重新设计 Launch Paymaster 流程以符合 V2 的实际步骤。

### 核心要点

1. **独立页面架构**：Get GToken、Stake、Get SBT、Get PNTs 各自独立
2. **sGToken 是核心**：所有验证都基于 sGToken（staked GToken）
3. **Pre-Authorization**：xPNTs 无需 approve，自动支持
4. **双 Token 体系**：aPNTs（operator）+ xPNTs（user）
5. **SBT 检查对象**：SimpleAccount 合约地址，不是 owner

### 下一步行动

1. 更新 registry `.env` 文件添加 V2 合约地址
2. 创建 V2 合约配置文件
3. 设计并实现独立页面
4. 重新设计 Launch Paymaster 流程
5. 更新用户文档
