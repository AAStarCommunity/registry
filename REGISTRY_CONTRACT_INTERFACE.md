# SuperPaymasterRegistry v1.2 合约接口文档

**合约地址**: `0x838da93c815a6E45Aa50429529da9106C0621eF0` (Sepolia)  
**源码位置**: `SuperPaymaster/contracts/src/SuperPaymasterRegistry_v1_2.sol`  
**版本**: v1.2.0

---

## 📋 核心功能概览

SuperPaymasterRegistry 是一个**中心化注册表**,用于管理多个 Paymaster 节点,提供质押(staking)、信誉(reputation)跟踪和路由(routing)功能。

### 主要特性
1. ✅ Paymaster 注册与质押
2. ✅ 动态费率管理
3. ✅ 信誉评分系统
4. ✅ 路由选择算法
5. ✅ Slash 惩罚机制
6. ✅ 竞价(Bidding)系统

---

## 🔧 Operator Portal 核心接口

### 1. 注册 Paymaster

```solidity
function registerPaymaster(
    string calldata _name,
    uint256 _feeRate
) external payable nonReentrant
```

**功能**: 注册新的 Paymaster 并质押 ETH

**参数**:
- `_name`: 社区名称 (不能为空字符串)
- `_feeRate`: 服务费率,单位 basis points (100 = 1%, 最大 10000 = 100%)

**要求**:
- `msg.value >= minStakeAmount` (最低质押量,默认可能是 0.1 ETH)
- 该地址未注册过 Paymaster
- `_feeRate <= 10000`

**返回**:
- 无返回值,成功时触发 `PaymasterRegistered` 事件

**事件**:
```solidity
event PaymasterRegistered(
    address indexed paymaster,
    string name,
    uint256 feeRate,
    uint256 stakedAmount
);
```

**初始状态**:
- `reputation`: 5000 (50%)
- `isActive`: true
- `successCount`: 0
- `totalAttempts`: 0

**UI 实现提示**:
```typescript
// 在 DeployPaymaster.tsx - Step 4
const registerToRegistry = async (
  paymasterAddress: string,
  communityName: string,
  feeRate: number, // 200 = 2%
  stakeAmount: string // "0.1" ETH
) => {
  const registry = new ethers.Contract(
    REGISTRY_ADDRESS,
    REGISTRY_ABI,
    signer
  );
  
  const tx = await registry.registerPaymaster(
    communityName,
    feeRate,
    { value: ethers.parseEther(stakeAmount) }
  );
  
  await tx.wait();
};
```

---

### 2. 增加质押

```solidity
function addStake() external payable nonReentrant
```

**功能**: 向已注册的 Paymaster 增加质押

**参数**:
- 无参数,质押金额通过 `msg.value` 传递

**要求**:
- 必须是已注册的 Paymaster

**事件**:
```solidity
event PaymasterStakeAdded(
    address indexed paymaster,
    uint256 amount,
    uint256 newTotalStake
);
```

---

### 3. 提取质押

```solidity
function withdrawStake(uint256 _amount) external nonReentrant
```

**功能**: 提取部分质押

**参数**:
- `_amount`: 提取金额 (wei)

**要求**:
- 提取后剩余质押 >= `minStakeAmount`

**事件**:
```solidity
event PaymasterStakeWithdrawn(
    address indexed paymaster,
    uint256 amount,
    uint256 remainingStake
);
```

---

### 4. 更新费率

```solidity
function updateFeeRate(uint256 _newFeeRate) external
```

**功能**: 更新 Paymaster 服务费率

**参数**:
- `_newFeeRate`: 新费率 (basis points, 最大 10000)

**要求**:
- 必须是已注册的 Paymaster
- `_newFeeRate <= 10000`

**事件**:
```solidity
event PaymasterFeeRateUpdated(
    address indexed paymaster,
    uint256 oldFeeRate,
    uint256 newFeeRate
);
```

---

### 5. 激活/停用

```solidity
function activate() external
function deactivate() external
```

**功能**: 手动激活或停用 Paymaster

**要求**:
- 必须是已注册的 Paymaster

**事件**:
```solidity
event PaymasterActivated(address indexed paymaster);
event PaymasterDeactivated(address indexed paymaster);
```

---

## 📊 数据结构

### PaymasterInfo

```solidity
struct PaymasterInfo {
    address paymasterAddress;  // Paymaster 合约地址
    string name;               // 社区名称
    uint256 feeRate;           // 费率 (basis points)
    uint256 stakedAmount;      // 已质押金额 (wei)
    uint256 reputation;        // 信誉评分 (0-10000, 5000 = 50%)
    bool isActive;             // 是否激活
    uint256 successCount;      // 成功次数
    uint256 totalAttempts;     // 总尝试次数
    uint256 registeredAt;      // 注册时间戳
    uint256 lastActiveAt;      // 最后活跃时间戳
}
```

---

## 🔍 查询接口 (Phase 3 - Registry Explorer)

### 1. 获取活跃 Paymaster 列表

```solidity
function getActivePaymasters() external view returns (address[] memory activePaymasters)
```

**功能**: 返回所有 `isActive = true` 的 Paymaster 地址列表

**用途**: Registry Explorer 页面显示所有可用的 Paymaster

---

### 2. 获取 Paymaster 详细信息

```solidity
function getPaymasterFullInfo(address _paymaster)
    external
    view
    returns (PaymasterInfo memory info)
```

**功能**: 返回完整的 PaymasterInfo 结构体

**用途**: Paymaster 详情页显示

---

### 3. 获取最佳 Paymaster

```solidity
function getBestPaymaster() external view returns (address paymaster, uint256 feeRate)
```

**功能**: 返回费率最低的活跃 Paymaster

**路由策略**: 按费率从低到高排序

---

### 4. 检查 Paymaster 是否激活

```solidity
function isPaymasterActive(address paymaster) external view returns (bool)
```

**功能**: 快速检查某个 Paymaster 是否激活

---

### 5. 获取注册表统计

```solidity
function getRouterStats()
    external
    view
    returns (
        uint256 totalPaymasters,
        uint256 activePaymasters,
        uint256 totalSuccessfulRoutes,
        uint256 totalRoutes
    )
```

**功能**: 返回全局统计数据

---

## 🎯 管理员功能 (仅 Owner)

### 1. 更新信誉评分

```solidity
function updateReputation(address _paymaster, uint256 _newReputation) external onlyOwner
```

### 2. 记录成功/失败

```solidity
function recordSuccess(address _paymaster) external onlyOwner
function recordFailure(address _paymaster) external onlyOwner
```

### 3. Slash 惩罚

```solidity
function slashPaymaster(address _paymaster, string calldata _reason) external onlyOwner
```

**功能**: 没收部分质押金额 (`slashPercentage` 百分比)

---

## 🚀 Phase 2 实现清单

### Step 4: Registry 注册流程

#### UI 组件需求

**文件**: `registry/src/pages/operator/DeployPaymaster.tsx`

```tsx
// Step 4: 注册到 Registry
function StepRegisterToRegistry({ paymasterAddress, onComplete }) {
  const [communityName, setCommunityName] = useState('');
  const [feeRate, setFeeRate] = useState(200); // 默认 2%
  const [stakeAmount, setStakeAmount] = useState('0.1'); // 最低质押
  const [isRegistering, setIsRegistering] = useState(false);
  
  const handleRegister = async () => {
    try {
      setIsRegistering(true);
      
      // 1. 连接 Registry 合约
      const registry = new ethers.Contract(
        import.meta.env.VITE_REGISTRY_ADDRESS,
        REGISTRY_ABI,
        signer
      );
      
      // 2. 调用 registerPaymaster
      const tx = await registry.registerPaymaster(
        communityName,
        feeRate,
        { value: ethers.parseEther(stakeAmount) }
      );
      
      console.log('Transaction sent:', tx.hash);
      
      // 3. 等待确认
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      // 4. 提取事件
      const event = receipt.logs
        .find(log => log.topics[0] === registry.interface.getEvent('PaymasterRegistered').topicHash);
      
      if (event) {
        toast.success('✅ Paymaster registered successfully!');
        onComplete({ receipt, event });
      }
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error(`Registration failed: ${error.message}`);
    } finally {
      setIsRegistering(false);
    }
  };
  
  return (
    <div className="step-register">
      <h2>Step 4: Register to SuperPaymaster Registry</h2>
      
      <div className="form-group">
        <label>Community Name</label>
        <input
          type="text"
          value={communityName}
          onChange={(e) => setCommunityName(e.target.value)}
          placeholder="e.g., My Community DAO"
        />
      </div>
      
      <div className="form-group">
        <label>Service Fee Rate (basis points)</label>
        <input
          type="number"
          value={feeRate}
          onChange={(e) => setFeeRate(Number(e.target.value))}
          min={0}
          max={10000}
        />
        <span className="hint">
          {feeRate / 100}% (100 = 1%, max 10000 = 100%)
        </span>
      </div>
      
      <div className="form-group">
        <label>Stake Amount (ETH)</label>
        <input
          type="number"
          step="0.01"
          value={stakeAmount}
          onChange={(e) => setStakeAmount(e.target.value)}
          min={0.1}
        />
        <span className="hint">
          Minimum: 0.1 ETH (check contract for exact value)
        </span>
      </div>
      
      <button
        onClick={handleRegister}
        disabled={!communityName || isRegistering}
        className="register-btn"
      >
        {isRegistering ? 'Registering...' : '✅ Register Paymaster'}
      </button>
    </div>
  );
}
```

#### Registry ABI (最小集合)

```typescript
// registry/src/contracts/RegistryABI.ts
export const REGISTRY_ABI = [
  // 注册
  "function registerPaymaster(string calldata _name, uint256 _feeRate) external payable",
  
  // 质押管理
  "function addStake() external payable",
  "function withdrawStake(uint256 _amount) external",
  
  // 配置
  "function updateFeeRate(uint256 _newFeeRate) external",
  "function activate() external",
  "function deactivate() external",
  
  // 查询
  "function getActivePaymasters() external view returns (address[])",
  "function getPaymasterFullInfo(address _paymaster) external view returns (tuple(address paymasterAddress, string name, uint256 feeRate, uint256 stakedAmount, uint256 reputation, bool isActive, uint256 successCount, uint256 totalAttempts, uint256 registeredAt, uint256 lastActiveAt))",
  "function getBestPaymaster() external view returns (address, uint256)",
  "function isPaymasterActive(address paymaster) external view returns (bool)",
  
  // 配置参数
  "function minStakeAmount() external view returns (uint256)",
  "function routerFeeRate() external view returns (uint256)",
  
  // 事件
  "event PaymasterRegistered(address indexed paymaster, string name, uint256 feeRate, uint256 stakedAmount)",
  "event PaymasterStakeAdded(address indexed paymaster, uint256 amount, uint256 newTotalStake)",
  "event PaymasterFeeRateUpdated(address indexed paymaster, uint256 oldFeeRate, uint256 newFeeRate)",
];
```

---

## ⚙️ 配置参数查询

### 查询最低质押要求

```typescript
const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
const minStake = await registry.minStakeAmount();
console.log('Minimum stake:', ethers.formatEther(minStake), 'ETH');
```

**建议**: 在 Step 4 表单加载时查询并显示

---

## 📝 验证检查清单

### 注册前检查
- [ ] 用户已连接 MetaMask
- [ ] 当前网络是 Sepolia
- [ ] 用户 ETH 余额 >= 质押金额
- [ ] 社区名称不为空
- [ ] 费率 <= 10000
- [ ] Paymaster 地址尚未注册

### 注册后验证
- [ ] 交易已确认
- [ ] `PaymasterRegistered` 事件已触发
- [ ] `getPaymasterFullInfo()` 可以查询到数据
- [ ] `isActive` 为 `true`
- [ ] `reputation` 为 5000

---

## 🔗 相关合约地址 (Sepolia)

```typescript
// registry/.env.local
export const CONTRACTS = {
  REGISTRY: "0x838da93c815a6E45Aa50429529da9106C0621eF0",
  PNT_TOKEN: "0xD14E87d8D8B69016Fcc08728c33799bD3F66F180",
  SBT_CONTRACT: "0xBfde68c232F2248114429DDD9a7c3Adbff74bD7f",
  USDT_CONTRACT: "0x14EaC6C3D49AEDff3D59773A7d7bfb50182bCfDc",
  PAYMASTER_V4: "0xBC56D82374c3CdF1234fa67E28AF9d3E31a9D445",
  ENTRY_POINT_V0_7: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
};
```

**说明**: 
- ✅ **不需要部署新 Token**: 直接使用现有的 PNT 和 SBT 合约
- ✅ **Token 管理**: 在 Step 2 使用 `addSBT()` 和 `addGasToken()` 关联现有合约

---

## 📚 参考资料

- **合约源码**: `SuperPaymaster/contracts/src/SuperPaymasterRegistry_v1_2.sol`
- **部署脚本**: `SuperPaymaster/script/` (查找 Registry 部署示例)
- **Etherscan**: https://sepolia.etherscan.io/address/0x838da93c815a6E45Aa50429529da9106C0621eF0

---

**文档版本**: v1.0  
**最后更新**: 2025-10-15  
**下一步**: 实现 Operator Portal Step 4 注册流程
