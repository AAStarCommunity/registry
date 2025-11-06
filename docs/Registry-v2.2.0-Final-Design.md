# Registry v2.2.0 - 最终设计方案

**日期**: 2025-11-06
**版本**: v2.2.0
**改进**: 基于用户反馈，采用两个独立函数，避免参数冗余

## 用户反馈的问题

### 问题1：NodeType配置
- 不同NodeType有不同的minStake要求
- 需要自动检查和验证
- ✅ 已有`nodeTypeConfigs`配置，会自动验证

### 问题2：参数冗余
- 统一函数导致不相关参数需要传入Zero值
- 代码不优雅，容易出错
- ✅ 改用两个独立函数解决

## 最终设计：两个独立函数

### 函数1：注册社区

```solidity
/**
 * @notice 一键注册社区：approve → stake → lock → register community
 * @param profile 社区资料（包含nodeType字段）
 * @param stakeAmount 需要stake和lock的GToken数量
 * @return success 是否成功
 *
 * @dev 流程：
 *      1. 检查user的availableBalance
 *      2. 如果不足，自动从user钱包拉取并stake
 *      3. lockStake(user, stakeAmount)
 *      4. 验证stakeAmount >= nodeTypeConfigs[profile.nodeType].minStake
 *      5. 注册社区
 */
function registerCommunityWithAutoStake(
    CommunityProfile memory profile,
    uint256 stakeAmount
) external nonReentrant returns (bool success);
```

### 函数2：注册Paymaster

```solidity
/**
 * @notice 一键注册Paymaster：approve → stake → lock → create paymaster
 * @param paymasterOwner Paymaster的owner地址（通常是社区地址）
 * @param nodeType 节点类型：0=PAYMASTER_AOA(30 GT), 1=PAYMASTER_SUPER(50 GT)
 * @param stakeAmount 需要stake和lock的GToken数量
 * @param salt CREATE2 salt（确保地址唯一性）
 * @return paymasterAddress 创建的Paymaster地址
 *
 * @dev 流程：
 *      1. 检查user的availableBalance
 *      2. 如果不足，自动从user钱包拉取并stake
 *      3. lockStake(user, stakeAmount)
 *      4. 验证stakeAmount >= nodeTypeConfigs[NodeType(nodeType)].minStake
 *      5. 通过PaymasterFactory创建Paymaster
 */
function registerPaymasterWithAutoStake(
    address paymasterOwner,
    uint8 nodeType,
    uint256 stakeAmount,
    bytes32 salt
) external nonReentrant returns (address paymasterAddress);
```

## 完整实现

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin-v5.0.2/contracts/access/Ownable.sol";
import "@openzeppelin-v5.0.2/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin-v5.0.2/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin-v5.0.2/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Registry v2.2.0 - Two Independent Auto-Register Functions
 * @notice 继承自 Registry v2.1.4，新增两个auto-register函数
 */
contract RegistryV2_2_0 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==================== 继承自 v2.1.4 ====================

    enum NodeType {
        PAYMASTER_AOA,      // 0: 30 GT
        PAYMASTER_SUPER,    // 1: 50 GT
        ANODE,              // 2: 20 GT (计算节点)
        KMS                 // 3: 100 GT (密钥管理)
    }

    struct NodeTypeConfig {
        uint256 minStake;
        uint256 slashThreshold;
        uint256 slashBase;
        uint256 slashIncrement;
        uint256 slashMax;
    }

    struct CommunityProfile {
        string name;
        string ensName;
        address xPNTsToken;
        address[] supportedSBTs;
        NodeType nodeType;         // 🔑 这里指定节点类型
        address paymasterAddress;
        address community;
        uint256 registeredAt;
        uint256 lastUpdatedAt;
        bool isActive;
        bool allowPermissionlessMint;
    }

    struct CommunityStake {
        uint256 stGTokenLocked;
        uint256 failureCount;
        uint256 lastFailureTime;
        uint256 totalSlashed;
        bool isActive;
    }

    // ==================== Storage ====================

    string public constant VERSION = "2.2.0";
    uint256 public constant VERSION_CODE = 20200;

    IERC20 public immutable GTOKEN;
    IGTokenStaking public immutable GTOKEN_STAKING;
    address public paymasterFactory;

    mapping(NodeType => NodeTypeConfig) public nodeTypeConfigs;
    mapping(address => CommunityProfile) public communities;
    mapping(address => CommunityStake) public communityStakes;
    mapping(string => address) public communityByName;
    mapping(string => address) public communityByENS;
    address[] public communityList;

    // Paymaster管理
    mapping(address => bool) public registeredPaymasters;
    address[] public paymasterList;

    // ==================== 事件 ====================

    event CommunityAutoRegistered(
        address indexed community,
        string name,
        NodeType indexed nodeType,
        uint256 stakeAmount,
        uint256 autoStaked,
        uint256 timestamp
    );

    event PaymasterAutoRegistered(
        address indexed owner,
        address indexed paymaster,
        NodeType indexed nodeType,
        uint256 stakeAmount,
        uint256 autoStaked,
        uint256 timestamp
    );

    // ==================== 错误 ====================

    error InsufficientStake(uint256 provided, uint256 required);
    error InsufficientGTokenBalance(uint256 available, uint256 required);
    error InvalidStakeAmount(uint256 amount);
    error InvalidNodeType(uint8 nodeType);
    error CommunityAlreadyRegistered(address community);
    error PaymasterCreationFailed();
    error InvalidAddress(address addr);

    // ==================== 构造函数 ====================

    constructor(
        address _gtoken,
        address _gtokenStaking,
        address _paymasterFactory
    ) Ownable(msg.sender) {
        GTOKEN = IERC20(_gtoken);
        GTOKEN_STAKING = IGTokenStaking(_gtokenStaking);
        paymasterFactory = _paymasterFactory;

        // 初始化NodeType配置
        nodeTypeConfigs[NodeType.PAYMASTER_AOA] = NodeTypeConfig({
            minStake: 30 ether,
            slashThreshold: 10,
            slashBase: 2,
            slashIncrement: 1,
            slashMax: 10
        });

        nodeTypeConfigs[NodeType.PAYMASTER_SUPER] = NodeTypeConfig({
            minStake: 50 ether,
            slashThreshold: 10,
            slashBase: 2,
            slashIncrement: 1,
            slashMax: 10
        });

        nodeTypeConfigs[NodeType.ANODE] = NodeTypeConfig({
            minStake: 20 ether,
            slashThreshold: 15,
            slashBase: 1,
            slashIncrement: 1,
            slashMax: 5
        });

        nodeTypeConfigs[NodeType.KMS] = NodeTypeConfig({
            minStake: 100 ether,
            slashThreshold: 5,
            slashBase: 5,
            slashIncrement: 2,
            slashMax: 20
        });
    }

    // ==================== 核心功能1：注册社区 ====================

    /**
     * @notice 一键注册社区：approve → stake → lock → register community
     */
    function registerCommunityWithAutoStake(
        CommunityProfile memory profile,
        uint256 stakeAmount
    )
        external
        nonReentrant
        returns (bool success)
    {
        address user = msg.sender;

        // 1. 基础验证
        if (stakeAmount == 0) revert InvalidStakeAmount(stakeAmount);
        if (communities[user].registeredAt != 0) revert CommunityAlreadyRegistered(user);

        // 2. 验证stakeAmount是否满足该NodeType的最低要求
        NodeTypeConfig memory config = nodeTypeConfigs[profile.nodeType];
        if (stakeAmount < config.minStake) {
            revert InsufficientStake(stakeAmount, config.minStake);
        }

        // 3. 自动stake（借鉴MySBT模式）
        uint256 autoStaked = _autoStakeForUser(user, stakeAmount);

        // 4. Lock stake
        GTOKEN_STAKING.lockStake(user, stakeAmount, "Registry");

        // 5. 注册社区（复用内部逻辑）
        _registerCommunityInternal(profile, stakeAmount);

        // 6. 发出事件
        emit CommunityAutoRegistered(
            user,
            profile.name,
            profile.nodeType,
            stakeAmount,
            autoStaked,
            block.timestamp
        );

        return true;
    }

    // ==================== 核心功能2：注册Paymaster ====================

    /**
     * @notice 一键注册Paymaster：approve → stake → lock → create paymaster
     */
    function registerPaymasterWithAutoStake(
        address paymasterOwner,
        uint8 nodeType,
        uint256 stakeAmount,
        bytes32 salt
    )
        external
        nonReentrant
        returns (address paymasterAddress)
    {
        address user = msg.sender;

        // 1. 验证参数
        if (stakeAmount == 0) revert InvalidStakeAmount(stakeAmount);
        if (paymasterOwner == address(0)) revert InvalidAddress(paymasterOwner);

        // 验证nodeType有效性（只允许PAYMASTER_AOA和PAYMASTER_SUPER）
        if (nodeType != uint8(NodeType.PAYMASTER_AOA) &&
            nodeType != uint8(NodeType.PAYMASTER_SUPER)) {
            revert InvalidNodeType(nodeType);
        }

        // 2. 验证stakeAmount是否满足该NodeType的最低要求
        NodeTypeConfig memory config = nodeTypeConfigs[NodeType(nodeType)];
        if (stakeAmount < config.minStake) {
            revert InsufficientStake(stakeAmount, config.minStake);
        }

        // 3. 自动stake
        uint256 autoStaked = _autoStakeForUser(user, stakeAmount);

        // 4. Lock stake
        GTOKEN_STAKING.lockStake(user, stakeAmount, "Registry");

        // 5. 创建Paymaster
        paymasterAddress = _createPaymaster(paymasterOwner, nodeType, salt);
        registeredPaymasters[paymasterAddress] = true;
        paymasterList.push(paymasterAddress);

        // 6. 发出事件
        emit PaymasterAutoRegistered(
            paymasterOwner,
            paymasterAddress,
            NodeType(nodeType),
            stakeAmount,
            autoStaked,
            block.timestamp
        );

        return paymasterAddress;
    }

    // ==================== 内部辅助函数 ====================

    /**
     * @notice 内部函数：自动为用户stake（借鉴MySBT模式）
     */
    function _autoStakeForUser(address user, uint256 stakeAmount)
        internal
        returns (uint256 autoStaked)
    {
        // 1. 检查用户当前可用余额
        uint256 avail = GTOKEN_STAKING.availableBalance(user);

        // 2. 计算需要补充的金额
        uint256 need = avail < stakeAmount ? stakeAmount - avail : 0;

        // 3. 如果需要补充，从用户钱包拉取并代用户stake
        if (need > 0) {
            uint256 userBalance = GTOKEN.balanceOf(user);
            if (userBalance < need) {
                revert InsufficientGTokenBalance(userBalance, need);
            }

            // 从用户钱包拉取
            GTOKEN.safeTransferFrom(user, address(this), need);

            // 授权给GTokenStaking
            GTOKEN.approve(address(GTOKEN_STAKING), need);

            // 代用户stake
            GTOKEN_STAKING.stakeFor(user, need);

            autoStaked = need;
        } else {
            autoStaked = 0;
        }

        return autoStaked;
    }

    /**
     * @notice 内部函数：注册社区
     */
    function _registerCommunityInternal(
        CommunityProfile memory profile,
        uint256 stakeAmount
    ) internal {
        address user = msg.sender;

        // 设置profile数据
        profile.community = user;
        profile.registeredAt = block.timestamp;
        profile.lastUpdatedAt = block.timestamp;
        profile.isActive = true;
        profile.allowPermissionlessMint = true;

        communities[user] = profile;
        communityStakes[user] = CommunityStake({
            stGTokenLocked: stakeAmount,
            failureCount: 0,
            lastFailureTime: 0,
            totalSlashed: 0,
            isActive: true
        });

        communityList.push(user);
    }

    /**
     * @notice 内部函数：创建Paymaster
     */
    function _createPaymaster(
        address owner,
        uint8 nodeType,
        bytes32 salt
    ) internal returns (address paymaster) {
        if (paymasterFactory == address(0)) revert InvalidAddress(paymasterFactory);

        try IPaymasterFactory(paymasterFactory).createPaymaster(
            owner,
            nodeType,
            salt
        ) returns (address _paymaster) {
            return _paymaster;
        } catch {
            revert PaymasterCreationFailed();
        }
    }

    // ==================== 预览函数 ====================

    /**
     * @notice 预览auto-register：计算需要补充的金额
     */
    function previewAutoRegister(address user, uint256 stakeAmount)
        external
        view
        returns (
            uint256 needToStake,
            uint256 needToApprove,
            bool canRegister
        )
    {
        uint256 avail = GTOKEN_STAKING.availableBalance(user);
        needToStake = avail < stakeAmount ? stakeAmount - avail : 0;

        uint256 currentAllowance = GTOKEN.allowance(user, address(this));
        needToApprove = needToStake > currentAllowance ? needToStake : 0;

        uint256 userBalance = GTOKEN.balanceOf(user);
        canRegister = userBalance >= needToStake;

        return (needToStake, needToApprove, canRegister);
    }

    // ==================== v2.1.4 兼容函数 ====================
    // ... 保留其他函数 ...
}

// ==================== 接口定义 ====================

interface IGTokenStaking {
    function availableBalance(address user) external view returns (uint256);
    function stakeFor(address beneficiary, uint256 amount) external returns (uint256 shares);
    function lockStake(address user, uint256 amount, string memory purpose) external;
    function getLockedStake(address user, address locker) external view returns (uint256);
}

interface IPaymasterFactory {
    function createPaymaster(
        address owner,
        uint8 nodeType,
        bytes32 salt
    ) external returns (address paymaster);
}
```

## 前端集成

### 场景1：注册社区

```typescript
import { ethers } from 'ethers';

async function registerCommunity(profile, gTokenAmount) {
  const registry = new ethers.Contract(REGISTRY_ADDRESS, RegistryV2_2_0ABI, signer);

  // Step 1: 预览需要approve的金额
  const [needToStake, needToApprove, canRegister] =
    await registry.previewAutoRegister(account, gTokenAmount);

  if (!canRegister) {
    throw new Error('Insufficient GToken balance');
  }

  // Step 2: Approve（如果需要）
  if (needToApprove > 0n) {
    const gToken = new ethers.Contract(GTOKEN_ADDRESS, GTOKEN_ABI, signer);
    const tx = await gToken.approve(REGISTRY_ADDRESS, needToApprove);
    await tx.wait();
    console.log('✅ Approved');
  }

  // Step 3: 一键注册社区（无冗余参数！）
  const tx = await registry.registerCommunityWithAutoStake(
    profile,      // 社区资料（包含nodeType）
    gTokenAmount  // stake数量
  );
  await tx.wait();

  console.log('✅ 社区注册成功！');
}
```

### 场景2：注册Paymaster

```typescript
async function registerPaymaster(paymasterOwner, nodeType, stakeAmount) {
  const registry = new ethers.Contract(REGISTRY_ADDRESS, RegistryV2_2_0ABI, signer);

  // Step 1: 预览
  const [needToStake, needToApprove, canRegister] =
    await registry.previewAutoRegister(account, stakeAmount);

  if (!canRegister) {
    throw new Error('Insufficient GToken balance');
  }

  // Step 2: Approve（如果需要）
  if (needToApprove > 0n) {
    const gToken = new ethers.Contract(GTOKEN_ADDRESS, GTOKEN_ABI, signer);
    const tx = await gToken.approve(REGISTRY_ADDRESS, needToApprove);
    await tx.wait();
  }

  // Step 3: 一键注册Paymaster（无冗余参数！）
  const paymasterSalt = ethers.randomBytes(32);
  const tx = await registry.registerPaymasterWithAutoStake(
    paymasterOwner,  // Paymaster owner
    nodeType,        // 0=AOA, 1=SUPER
    stakeAmount,     // stake数量
    paymasterSalt    // CREATE2 salt
  );
  const receipt = await tx.wait();

  // 从事件中获取Paymaster地址
  const event = receipt.logs.find(log =>
    log.topics[0] === registry.interface.getEvent('PaymasterAutoRegistered').topicHash
  );
  const paymasterAddress = event.args.paymaster;

  console.log('✅ Paymaster注册成功！');
  console.log('   Address:', paymasterAddress);
}
```

## NodeType配置说明

| NodeType | 值 | minStake | 用途 | 可用于 |
|----------|---|----------|------|--------|
| `PAYMASTER_AOA` | 0 | 30 GT | 独立Paymaster | Community & Paymaster |
| `PAYMASTER_SUPER` | 1 | 50 GT | SuperPaymaster共享模式 | Community & Paymaster |
| `ANODE` | 2 | 20 GT | 计算节点 | Community only |
| `KMS` | 3 | 100 GT | 密钥管理服务 | Community only |

### 自动验证机制

```solidity
// 注册社区时自动检查
NodeTypeConfig memory config = nodeTypeConfigs[profile.nodeType];
if (stakeAmount < config.minStake) {
    revert InsufficientStake(stakeAmount, config.minStake);
}
```

## 对比改进前后

| 特性 | 统一函数设计（之前）| 独立函数设计（现在）|
|-----|-----------------|-------------------|
| **参数冗余** | ❌ 需要传入Zero值 | ✅ 无冗余参数 |
| **类型安全** | ⚠️ 运行时检查 | ✅ 编译时检查 |
| **代码可读性** | 😕 较差 | 😊 优秀 |
| **Gas消耗** | 略高（检查分支）| 略低 |
| **扩展性** | ⚠️ 需要修改现有函数 | ✅ 可独立添加新函数 |

## 优势总结

✅ **无参数冗余**：每个函数只接收必要参数
✅ **类型安全**：编译时检查参数类型
✅ **自动验证**：根据NodeType自动检查minStake
✅ **代码清晰**：每个函数职责单一
✅ **易于扩展**：未来添加新注册类型时，新增函数即可

## 未来扩展

如果需要支持其他注册类型（例如：注册ANODE、注册KMS），只需添加新函数：

```solidity
function registerANodeWithAutoStake(
    ANodeProfile memory profile,
    uint256 stakeAmount
) external returns (bool success) {
    // 实现ANODE注册逻辑
}

function registerKMSWithAutoStake(
    KMSProfile memory profile,
    uint256 stakeAmount
) external returns (bool success) {
    // 实现KMS注册逻辑
}
```

---

**这个设计解决了你提出的两个问题：**
1. ✅ NodeType配置自动验证，每个类型有独立的minStake
2. ✅ 无参数冗余，每个函数只接收必要参数
