# Paymaster Stake 流程设计文档

**版本**: v1.0  
**日期**: 2025-10-15  
**目标**: 为 Operator Portal 设计完整的 Paymaster Stake 流程

---

## 📋 目录

1. [核心概念](#核心概念)
2. [Stake 双重机制](#stake-双重机制)
3. [Token 模拟方案](#token-模拟方案)
4. [两种 Stake 方案](#两种-stake-方案)
5. [UI 实现流程](#ui-实现流程)
6. [合约交互接口](#合约交互接口)
7. [用户引导设计](#用户引导设计)

---

## 🔑 核心概念

### SuperPaymaster Registry 性质
- ✅ **去中心化注册表合约** (非中心化)
- 通过智能合约实现无许可注册
- 社区治理委员会负责参数调整

### Stake 的双重含义

#### 1. EntryPoint Stake (ERC-4337 标准要求)
**目的**: Paymaster 向官方 EntryPoint 质押 ETH,获得 Gas 赞助服务资格

**关键术语**:
- **Stake**: 锁定资金,增强信用
- **Deposit**: 存入 ETH,用于支付 Gas

**合约**: 官方 EntryPoint v0.7 (`0x0000000071727De22E5E9d8BAf0edAc6f37da032`)

#### 2. Registry Stake (SuperPaymaster 生态)
**目的**: Paymaster 向 Registry 锁定 sGToken (质押凭证),获得生态信誉和准入资格

**关键术语**:
- **GToken**: 治理 Token (Governance Token)
- **sGToken**: Stake 凭证 Token (通过 Stake 合约质押 GToken 获得)
- **Reputation**: 信誉评分,影响用户选择

**合约**: SuperPaymasterRegistry v1.2 (`0x838da93c815a6E45Aa50429529da9106C0621eF0`)

---

## 🏗️ Stake 双重机制

### 机制 1: EntryPoint Stake & Deposit

```solidity
// EntryPoint v0.7 接口
interface IEntryPoint {
    // Deposit: 存入 ETH 用于支付 Gas
    function depositTo(address account) external payable;
    
    // Stake: 锁定 ETH,增强信用,需要设置解锁延迟
    function addStake(uint32 unstakeDelaySec) external payable;
    
    // 查询 Deposit 余额
    function balanceOf(address account) external view returns (uint256);
    
    // 查询 Stake 信息
    function getDepositInfo(address account) external view returns (
        uint256 deposit,      // Deposit 余额
        bool staked,          // 是否已 Stake
        uint112 stake,        // Stake 金额
        uint32 unstakeDelay,  // 解锁延迟
        uint48 withdrawTime   // 可提取时间
    );
}
```

**Stake vs Deposit 区别**:

| 类型 | 目的 | 可用性 | 提取条件 |
|------|------|--------|----------|
| **Stake** | 信用背书,防止作恶 | 锁定,不可用于支付 | 需等待 unstakeDelay (如 24 小时) |
| **Deposit** | Gas 支付储备金 | 可用于 Gas 支付 | 随时提取 |

**建议金额**:
- Stake: 0.05 - 0.1 ETH (信用背书)
- Deposit: 0.1 - 0.5 ETH (根据预期交易量)

### 机制 2: Registry Stake (sGToken)

```solidity
// SuperPaymasterRegistry v1.2 接口
interface ISuperPaymasterRegistry {
    // 注册 Paymaster,需锁定 sGToken (通过 msg.value 传递 ETH Stake)
    function registerPaymaster(
        string calldata _name,
        uint256 _feeRate
    ) external payable;
    
    // 查询 Paymaster 信息
    function getPaymasterFullInfo(address _paymaster) external view returns (
        address paymasterAddress,
        string name,
        uint256 feeRate,
        uint256 stakedAmount,    // ETH Stake 金额 (目前)
        uint256 reputation,
        bool isActive,
        uint256 successCount,
        uint256 totalAttempts,
        uint256 registeredAt,
        uint256 lastActiveAt
    );
}
```

**当前实现**: Registry 接受 ETH Stake  
**未来扩展**: 需要修改为锁定 sGToken

---

## 🎭 Token 模拟方案 (开发阶段)

### 生产环境 Token 架构

```
用户持有 GToken (治理 Token)
    ↓ Stake 到 Stake 合约
获得 sGToken (质押凭证)
    ↓ 锁定到 Registry 合约
获得生态信誉和准入资格
```

### 当前模拟方案

由于 Stake 合约尚未开发,使用以下 Token 模拟:

| 生产 Token | 模拟 Token | 地址 | 用途 |
|-----------|-----------|------|------|
| **GToken** | (未部署) | - | 治理 Token |
| **sGToken** | **PNT Token** | `0xD14E87d8D8B69016Fcc08728c33799bD3F66F180` | Stake 凭证 (锁定到 Registry) |
| **aPNTs** | **PNT Token** | 同上 | Gas Token (存入到 Paymaster) |

**重要说明**:
- ✅ 所有 Token 都是现有合约,**不需要部署新 Token**
- ✅ PNT Token 同时模拟 sGToken 和 aPNTs (都是 ERC20)
- ✅ SBT 合约: `0xBfde68c232F2248114429DDD9a7c3Adbff74bD7f`

---

## 🚀 两种 Stake 方案

### 方案对比

| 方案 | EntryPoint Stake | EntryPoint Deposit | Registry Stake (sGToken) | Paymaster Deposit (aPNTs) |
|------|-----------------|-------------------|------------------------|--------------------------|
| **方案1: 标准流程** | 0.1 ETH | 适度 ETH (如 0.2 ETH) | 30 PNT | - |
| **方案2: 快速流程** | - | - | 30 PNT | 100 PNT |

### 方案 1: 标准 ERC-4337 流程

**适用场景**: 遵循 ERC-4337 标准,兼容所有 EntryPoint 应用

**流程**:
1. Stake 0.1 ETH 到 EntryPoint (信用背书)
2. Deposit 0.2 ETH 到 EntryPoint (Gas 支付储备)
3. Stake 30 PNT 到 Registry (生态信誉)

**优点**:
- ✅ 完全符合 ERC-4337 标准
- ✅ 信用体系完整
- ✅ 兼容性好

**缺点**:
- ⚠️ 需要较多 ETH 资金
- ⚠️ 步骤较多

**UI 实现**:
```tsx
// Step 3: Stake to EntryPoint
async function stakeToEntryPointStandard() {
  const entryPoint = new ethers.Contract(ENTRY_POINT_ADDRESS, ENTRY_POINT_ABI, signer);
  
  // 3.1: Stake ETH
  const stakeTx = await entryPoint.addStake(
    86400, // unstakeDelaySec = 24 hours
    { value: ethers.parseEther("0.1") }
  );
  await stakeTx.wait();
  
  // 3.2: Deposit ETH
  const depositTx = await entryPoint.depositTo(
    paymasterAddress,
    { value: ethers.parseEther("0.2") }
  );
  await depositTx.wait();
}
```

---

### 方案 2: 快速 Stake 流程 (推荐)

**适用场景**: SuperPaymaster 生态内部使用,简化流程,节省 ETH

**流程**:
1. Stake 30 PNT (sGToken) 到 Registry
2. Deposit 100 PNT (aPNTs) 到 Paymaster

**优点**:
- ✅ 无需额外 ETH (节省资金)
- ✅ 步骤简化
- ✅ 仍可获得生态信誉

**缺点**:
- ⚠️ 仅适用于 SuperPaymaster 生态
- ⚠️ 可能需要后续补充 ETH

**关键设计**: 
- Registry 合约需添加 `sGTokenAddress` 配置
- `registerPaymaster()` 需支持锁定 ERC20 Token (而非 ETH)

**Registry 合约修改建议**:
```solidity
// SuperPaymasterRegistry v1.3 (建议扩展)
contract SuperPaymasterRegistry {
    // 新增: sGToken 合约地址
    address public sGTokenAddress;
    
    // 新增: 设置 sGToken 地址 (仅 Owner)
    function setSGTokenAddress(address _sGToken) external onlyOwner {
        sGTokenAddress = _sGToken;
        emit SGTokenUpdated(_sGToken);
    }
    
    // 修改: registerPaymaster 支持 ERC20 Stake
    function registerPaymaster(
        string calldata _name,
        uint256 _feeRate,
        uint256 _sGTokenAmount  // 新增参数
    ) external nonReentrant {
        require(_sGTokenAmount >= minSGTokenStake, "Insufficient sGToken");
        
        // 转账 sGToken 到 Registry
        IERC20(sGTokenAddress).transferFrom(
            msg.sender,
            address(this),
            _sGTokenAmount
        );
        
        // 注册逻辑...
    }
}
```

**UI 实现**:
```tsx
// Step 3: 快速 Stake 流程
async function stakeQuickFlow() {
  // 3.1: Approve sGToken (PNT)
  const pnt = new ethers.Contract(PNT_ADDRESS, ERC20_ABI, signer);
  const approveTx = await pnt.approve(
    REGISTRY_ADDRESS,
    ethers.parseEther("30")
  );
  await approveTx.wait();
  
  // 3.2: Register with sGToken Stake
  const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
  const registerTx = await registry.registerPaymaster(
    communityName,
    feeRate,
    ethers.parseEther("30")  // sGToken Amount
  );
  await registerTx.wait();
  
  // 3.3: Deposit aPNTs to Paymaster
  const depositTx = await pnt.transfer(
    paymasterAddress,
    ethers.parseEther("100")
  );
  await depositTx.wait();
}
```

---

## 💡 UI 实现流程 (结合原计划)

### 完整的 5 步部署向导

#### **Step 1: 部署 PaymasterV4 合约**
参数 (8 个):
1. `entryPoint`: EntryPoint 地址
2. `owner`: Deployer 地址 (MetaMask 账户)
3. `treasury`: 收款地址 (建议多签)
4. `gasToUSDRate`: Gas 汇率 (4500e18 = $4500/ETH)
5. `pntPriceUSD`: PNT 价格 (0.02e18 = $0.02)
6. `serviceFeeRate`: 服务费 (200 = 2%)
7. `maxGasCostCap`: Gas 上限 (0.01 ETH)
8. `minTokenBalance`: 最小余额 (100 PNT)

#### **Step 2: 配置 Token**
关联现有 Token 合约:
- `addSBT(0xBfde68c232F2248114429DDD9a7c3Adbff74bD7f)` - SBT 合约
- `addGasToken(0xD14E87d8D8B69016Fcc08728c33799bD3F66F180)` - PNT 合约

#### **Step 3: Stake 到 EntryPoint 和 Registry**

**选项 A: 标准流程**
```tsx
<StepStakeStandard paymasterAddress={deployedPaymaster}>
  <h3>Step 3A: 标准 ERC-4337 Stake 流程</h3>
  
  {/* 3.1: EntryPoint Stake */}
  <FormGroup>
    <label>Stake ETH to EntryPoint</label>
    <input type="number" defaultValue="0.1" step="0.01" />
    <button onClick={handleStakeETH}>Stake 0.1 ETH</button>
  </FormGroup>
  
  {/* 3.2: EntryPoint Deposit */}
  <FormGroup>
    <label>Deposit ETH to EntryPoint</label>
    <input type="number" defaultValue="0.2" step="0.05" />
    <button onClick={handleDepositETH}>Deposit ETH</button>
  </FormGroup>
  
  {/* 3.3: Registry Stake (sGToken) */}
  <FormGroup>
    <label>Stake sGToken (PNT) to Registry</label>
    <input type="number" defaultValue="30" disabled />
    <button onClick={handleStakeSGToken}>
      Approve & Stake 30 PNT
    </button>
  </FormGroup>
</StepStakeStandard>
```

**选项 B: 快速流程 (推荐)**
```tsx
<StepStakeQuick paymasterAddress={deployedPaymaster}>
  <h3>Step 3B: 快速 Stake 流程 (节省 ETH)</h3>
  
  <Alert type="info">
    💡 快速流程仅需 PNT Token,无需额外 ETH
  </Alert>
  
  {/* 3.1: Registry Stake (sGToken) */}
  <FormGroup>
    <label>Stake sGToken (PNT) to Registry</label>
    <input type="number" defaultValue="30" min="30" />
    <button onClick={handleStakeSGToken}>
      Approve & Stake PNT
    </button>
  </FormGroup>
  
  {/* 3.2: Paymaster Deposit (aPNTs) */}
  <FormGroup>
    <label>Deposit aPNTs (PNT) to Paymaster</label>
    <input type="number" defaultValue="100" min="0" />
    <button onClick={handleDepositAPNTs}>
      Transfer PNT to Paymaster
    </button>
  </FormGroup>
</StepStakeQuick>
```

#### **Step 4: 注册到 Registry**
```tsx
// 已在 Step 3 中完成 (registerPaymaster 调用)
// 仅需显示确认信息
<StepConfirmRegistration>
  <h3>Step 4: 注册确认</h3>
  <Alert type="success">
    ✅ Paymaster 已成功注册到 SuperPaymaster Registry
  </Alert>
  
  <InfoTable>
    <tr>
      <td>Community Name</td>
      <td>{communityName}</td>
    </tr>
    <tr>
      <td>Fee Rate</td>
      <td>{feeRate / 100}%</td>
    </tr>
    <tr>
      <td>sGToken Staked</td>
      <td>30 PNT</td>
    </tr>
    <tr>
      <td>Initial Reputation</td>
      <td>5000 (50%)</td>
    </tr>
  </InfoTable>
</StepConfirmRegistration>
```

#### **Step 5: 管理 Paymaster**
参考原计划 (`StepManage` 组件)

---

## 🔌 合约交互接口

### EntryPoint 接口

```typescript
// EntryPoint v0.7 ABI (最小集合)
const ENTRY_POINT_ABI = [
  // Deposit 管理
  "function depositTo(address account) external payable",
  "function balanceOf(address account) external view returns (uint256)",
  "function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external",
  
  // Stake 管理
  "function addStake(uint32 unstakeDelaySec) external payable",
  "function unlockStake() external",
  "function withdrawStake(address payable withdrawAddress) external",
  
  // 查询
  "function getDepositInfo(address account) external view returns (uint256 deposit, bool staked, uint112 stake, uint32 unstakeDelay, uint48 withdrawTime)",
];
```

### Registry 接口 (需扩展)

```typescript
// SuperPaymasterRegistry v1.3 ABI (建议扩展)
const REGISTRY_ABI_EXTENDED = [
  // 原有接口
  "function registerPaymaster(string calldata _name, uint256 _feeRate) external payable",
  
  // 新增接口 (方案2 需要)
  "function setSGTokenAddress(address _sGToken) external",
  "function sGTokenAddress() external view returns (address)",
  "function minSGTokenStake() external view returns (uint256)",
  "function registerPaymasterWithSGToken(string calldata _name, uint256 _feeRate, uint256 _sGTokenAmount) external",
  
  // 查询
  "function getPaymasterFullInfo(address _paymaster) external view returns (tuple)",
];
```

### PaymasterV4 接口

```typescript
// PaymasterV4 ABI (已有)
const PAYMASTER_V4_ABI = [
  // Token 管理
  "function addSBT(address sbt) external",
  "function addGasToken(address token) external",
  
  // EntryPoint 管理
  "function addDeposit() external payable",
  "function addStake(uint32 unstakeDelaySec) external payable",
  "function withdrawTo(address payable withdrawAddress, uint256 amount) external",
];
```

---

## 🎨 用户引导设计

### Step 3: 选择 Stake 方案

```tsx
<StepChooseStakeMethod>
  <h2>Step 3: Stake & Deposit</h2>
  
  <div className="method-selector">
    <Card 
      title="方案1: 标准 ERC-4337 流程"
      selected={method === 'standard'}
      onClick={() => setMethod('standard')}
    >
      <ul>
        <li>✅ 完全符合 ERC-4337 标准</li>
        <li>✅ 最高信用评级</li>
        <li>⚠️ 需要 0.3 ETH + 30 PNT</li>
      </ul>
      <strong>适合: 长期运营,高信用需求</strong>
    </Card>
    
    <Card 
      title="方案2: 快速 Stake 流程 (推荐)"
      selected={method === 'quick'}
      onClick={() => setMethod('quick')}
      recommended
    >
      <ul>
        <li>✅ 无需额外 ETH</li>
        <li>✅ 步骤简化</li>
        <li>⚠️ 仅需 130 PNT</li>
      </ul>
      <strong>适合: 快速启动,节省资金</strong>
    </Card>
  </div>
  
  {method === 'standard' && <StepStakeStandard />}
  {method === 'quick' && <StepStakeQuick />}
</StepChooseStakeMethod>
```

### 参数预设推荐

| 参数 | 方案1 (标准) | 方案2 (快速) | 说明 |
|------|-------------|-------------|------|
| EntryPoint Stake | 0.1 ETH | - | 信用背书 |
| EntryPoint Deposit | 0.2 ETH | - | Gas 储备 |
| Registry Stake (sGToken) | 30 PNT | 30 PNT | 最低准入 |
| Paymaster Deposit (aPNTs) | - | 100 PNT | Gas Token 储备 |
| **总成本** | 0.3 ETH + 30 PNT | 130 PNT | - |

---

## 📝 实现检查清单

### Phase 2.1: 标准流程实现

- [ ] **Step 3A: 标准 Stake 流程**
  - [ ] EntryPoint Stake UI
  - [ ] EntryPoint Deposit UI
  - [ ] Registry sGToken Stake UI
  - [ ] 状态查询与显示

### Phase 2.2: 快速流程实现 (需合约升级)

- [ ] **Registry 合约升级**
  - [ ] 添加 `sGTokenAddress` 配置
  - [ ] 添加 `setSGTokenAddress()` setter
  - [ ] 修改 `registerPaymaster()` 支持 ERC20

- [ ] **Step 3B: 快速 Stake 流程**
  - [ ] sGToken Approve & Stake UI
  - [ ] aPNTs Transfer UI
  - [ ] 余额查询与验证

### Phase 2.3: 用户体验优化

- [ ] **方案选择器**
  - [ ] 两种方案对比卡片
  - [ ] 成本计算器
  - [ ] 推荐逻辑

- [ ] **余额检查**
  - [ ] ETH 余额验证
  - [ ] PNT 余额验证
  - [ ] 不足时引导获取

- [ ] **进度追踪**
  - [ ] 每个交易的状态显示
  - [ ] 错误处理与重试
  - [ ] 成功确认与跳转

---

## 🚧 当前限制与未来扩展

### 当前限制 (v1.0)

1. **Registry 合约**: 仅支持 ETH Stake,需升级为支持 sGToken
2. **Token 模拟**: PNT Token 同时模拟 sGToken 和 aPNTs
3. **Stake 合约**: 未部署,直接使用 PNT 替代

### 未来扩展 (v2.0)

1. **部署 Stake 合约**
   - 用户 stake GToken → 获得 sGToken
   - sGToken 锁定到 Registry

2. **Registry 支持 sGToken**
   - `registerPaymaster()` 接受 ERC20
   - 独立的 sGToken 配置

3. **多 Token 支持**
   - 真实的 aPNTs 合约
   - 多种 Gas Token 选择

---

## 📚 参考文档

- **ERC-4337 规范**: https://eips.ethereum.org/EIPS/eip-4337
- **EntryPoint 合约**: https://github.com/eth-infinitism/account-abstraction
- **Stake 机制文档**: `/projects/docs/Stake.md`
- **Registry 合约**: `SuperPaymaster/contracts/src/SuperPaymasterRegistry_v1_2.sol`

---

**文档版本**: v1.0  
**最后更新**: 2025-10-15  
**下一步**: 实现 Step 3 Stake UI + Registry 合约升级
