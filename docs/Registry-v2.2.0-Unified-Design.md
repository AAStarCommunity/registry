# Registry v2.2.0 - 统一Auto-Register函数设计

**日期**: 2025-11-06
**版本**: v2.2.0
**核心改进**: 借鉴MySBT `mintWithAutoStake`模式，一步完成 approve → stake → lock → register

## 核心需求

用一个统一的函数处理两种注册场景：
1. **注册社区** (COMMUNITY)
2. **注册Paymaster** (PAYMASTER)

### 统一流程

```
User → registerWithAutoStake(registrationType, ...)
  ↓
1. approve GToken to Registry
2. auto-stake if needed (借鉴MySBT模式)
3. lockStake for user
4. register (community OR paymaster based on type)
```

## 接口设计

### 1. 注册类型枚举

```solidity
enum RegistrationType {
    COMMUNITY,   // 0: 注册社区
    PAYMASTER    // 1: 注册Paymaster
}
```

### 2. 统一函数签名

```solidity
/**
 * @notice 一键注册：自动处理 approve + stake + lock + register
 * @param registrationType 注册类型: COMMUNITY 或 PAYMASTER
 * @param profile 社区资料（注册COMMUNITY时必填，PAYMASTER时忽略）
 * @param paymasterOwner Paymaster所有者（注册PAYMASTER时必填，COMMUNITY时忽略）
 * @param stakeAmount 需要stake和lock的GToken数量
 * @param salt CREATE2 salt（注册PAYMASTER时必填，COMMUNITY时忽略）
 * @return success 是否成功
 * @return registeredAddress 注册的地址（COMMUNITY返回msg.sender，PAYMASTER返回新创建的地址）
 */
function registerWithAutoStake(
    RegistrationType registrationType,
    CommunityProfile memory profile,
    address paymasterOwner,
    uint256 stakeAmount,
    bytes32 salt
) external nonReentrant returns (bool success, address registeredAddress);
```

## 完整实现代码

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin-v5.0.2/contracts/access/Ownable.sol";
import "@openzeppelin-v5.0.2/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin-v5.0.2/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin-v5.0.2/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/Interfaces.sol";

/**
 * @title Registry v2.2.0 - Unified Auto-Register Function
 * @notice 继承自 Registry v2.1.4，新增统一的 auto-register 函数
 */
contract RegistryV2_2_0 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==================== 注册类型枚举 ====================

    enum RegistrationType {
        COMMUNITY,   // 0: 注册社区
        PAYMASTER    // 1: 注册Paymaster
    }

    // ==================== 继承自 v2.1.4 的核心结构 ====================

    enum NodeType {
        PAYMASTER_AOA,
        PAYMASTER_SUPER,
        ANODE,
        KMS
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
        NodeType nodeType;
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

    // ==================== 常量 ====================

    uint256 public constant MAX_SUPPORTED_SBTS = 10;
    uint256 public constant MAX_NAME_LENGTH = 100;
    string public constant VERSION = "2.2.0";
    uint256 public constant VERSION_CODE = 20200;

    // ==================== Storage ====================

    IERC20 public immutable GTOKEN;
    IGTokenStaking public immutable GTOKEN_STAKING;
    address public paymasterFactory;  // PaymasterFactory 地址

    address public oracle;
    address public superPaymasterV2;
    mapping(NodeType => NodeTypeConfig) public nodeTypeConfigs;
    mapping(address => CommunityProfile) public communities;
    mapping(address => CommunityStake) public communityStakes;
    mapping(string => address) public communityByName;
    mapping(string => address) public communityByENS;
    mapping(address => address) public communityBySBT;
    address[] public communityList;

    // ==================== 新增：Paymaster 管理 ====================

    mapping(address => bool) public registeredPaymasters;
    address[] public paymasterList;

    // ==================== 事件 ====================

    event CommunityRegistered(address indexed community, string name, NodeType indexed nodeType, uint256 staked);
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

    event CommunityUpdated(address indexed community, string name);
    event CommunityDeactivated(address indexed community);
    event CommunityReactivated(address indexed community);

    // ==================== 错误 ====================

    error CommunityAlreadyRegistered(address community);
    error CommunityNotRegistered(address community);
    error NameAlreadyTaken(string name);
    error ENSAlreadyTaken(string ensName);
    error InvalidAddress(address addr);
    error InvalidParameter(string message);
    error CommunityNotActive(address community);
    error InsufficientStake(uint256 provided, uint256 required);
    error InsufficientGTokenBalance(uint256 available, uint256 required);
    error UnauthorizedOracle(address caller);
    error NameEmpty();
    error NotFound();
    error InvalidStakeAmount(uint256 amount);
    error PaymasterCreationFailed();

    // ==================== 构造函数 ====================

    constructor(
        address _gtoken,
        address _gtokenStaking,
        address _paymasterFactory
    ) Ownable(msg.sender) {
        if (_gtoken == address(0)) revert InvalidAddress(_gtoken);
        if (_gtokenStaking == address(0)) revert InvalidAddress(_gtokenStaking);

        GTOKEN = IERC20(_gtoken);
        GTOKEN_STAKING = IGTokenStaking(_gtokenStaking);
        paymasterFactory = _paymasterFactory;

        // 初始化 NodeType 配置（继承自 v2.1.4）
        nodeTypeConfigs[NodeType.PAYMASTER_AOA] = NodeTypeConfig(30 ether, 10, 2, 1, 10);
        nodeTypeConfigs[NodeType.PAYMASTER_SUPER] = NodeTypeConfig(50 ether, 10, 2, 1, 10);
        nodeTypeConfigs[NodeType.ANODE] = NodeTypeConfig(20 ether, 15, 1, 1, 5);
        nodeTypeConfigs[NodeType.KMS] = NodeTypeConfig(100 ether, 5, 5, 2, 20);
    }

    // ==================== v2.2.0 核心功能：统一 Auto-Register ====================

    /**
     * @notice 一键注册：approve → stake → lock → register (community OR paymaster)
     * @dev 用户流程：
     *      1. User: approve stakeAmount GToken to Registry
     *      2. User: call this function with appropriate parameters
     *      3. Registry:
     *         a. Check user's availableBalance
     *         b. If insufficient, pull GToken from user and stakeFor(user, need)
     *         c. lockStake(user, stakeAmount, "Registry")
     *         d. Register community OR create paymaster based on registrationType
     *
     * @param registrationType COMMUNITY(0) 或 PAYMASTER(1)
     * @param profile 社区资料（注册COMMUNITY时必填）
     * @param paymasterOwner Paymaster所有者（注册PAYMASTER时必填）
     * @param stakeAmount 需要stake和lock的GToken数量
     * @param salt CREATE2 salt（注册PAYMASTER时必填）
     * @return success 是否成功
     * @return registeredAddress 注册的地址
     */
    function registerWithAutoStake(
        RegistrationType registrationType,
        CommunityProfile memory profile,
        address paymasterOwner,
        uint256 stakeAmount,
        bytes32 salt
    )
        external
        nonReentrant
        returns (bool success, address registeredAddress)
    {
        address user = msg.sender;

        // 1. 验证参数
        if (stakeAmount == 0) revert InvalidStakeAmount(stakeAmount);

        // 根据注册类型验证参数
        if (registrationType == RegistrationType.COMMUNITY) {
            if (communities[user].registeredAt != 0) revert CommunityAlreadyRegistered(user);
            if (bytes(profile.name).length == 0) revert NameEmpty();
            if (bytes(profile.name).length > MAX_NAME_LENGTH) revert InvalidParameter("Name too long");
            if (profile.supportedSBTs.length > MAX_SUPPORTED_SBTS) revert InvalidParameter("Too many SBTs");
        } else if (registrationType == RegistrationType.PAYMASTER) {
            if (paymasterOwner == address(0)) revert InvalidAddress(paymasterOwner);
        }

        // 2. 执行 auto-stake 逻辑（借鉴MySBT模式）
        uint256 autoStaked = _autoStakeForUser(user, stakeAmount);

        // 3. Lock stake
        GTOKEN_STAKING.lockStake(user, stakeAmount, "Registry");

        // 4. 根据类型执行注册
        if (registrationType == RegistrationType.COMMUNITY) {
            // 注册社区
            _registerCommunityInternal(profile, stakeAmount);
            registeredAddress = user;

            emit CommunityAutoRegistered(
                user,
                profile.name,
                profile.nodeType,
                stakeAmount,
                autoStaked,
                block.timestamp
            );
        } else {
            // 创建 Paymaster
            registeredAddress = _createPaymaster(paymasterOwner, uint8(profile.nodeType), salt);
            registeredPaymasters[registeredAddress] = true;
            paymasterList.push(registeredAddress);

            emit PaymasterAutoRegistered(
                paymasterOwner,
                registeredAddress,
                profile.nodeType,
                stakeAmount,
                autoStaked,
                block.timestamp
            );
        }

        return (true, registeredAddress);
    }

    // ==================== 内部辅助函数 ====================

    /**
     * @notice 内部函数：自动为用户stake（借鉴MySBT模式）
     * @param user 用户地址
     * @param stakeAmount 需要的总stake金额
     * @return autoStaked 实际自动stake的金额
     */
    function _autoStakeForUser(address user, uint256 stakeAmount)
        internal
        returns (uint256 autoStaked)
    {
        // 1. 检查用户当前的可用余额
        uint256 avail = GTOKEN_STAKING.availableBalance(user);

        // 2. 计算需要补充的金额
        uint256 need = avail < stakeAmount ? stakeAmount - avail : 0;

        // 3. 如果需要补充，从用户钱包拉取并代用户stake
        if (need > 0) {
            // 3.1 检查用户的 GToken 余额
            uint256 userBalance = GTOKEN.balanceOf(user);
            if (userBalance < need) {
                revert InsufficientGTokenBalance(userBalance, need);
            }

            // 3.2 从用户钱包拉取 GToken
            GTOKEN.safeTransferFrom(user, address(this), need);

            // 3.3 授权给 GTokenStaking
            GTOKEN.approve(address(GTOKEN_STAKING), need);

            // 3.4 代用户 stake（使用 stakeFor）
            GTOKEN_STAKING.stakeFor(user, need);

            autoStaked = need;
        } else {
            autoStaked = 0;
        }

        return autoStaked;
    }

    /**
     * @notice 内部函数：注册社区（从 registerCommunity 提取）
     */
    function _registerCommunityInternal(
        CommunityProfile memory profile,
        uint256 stakeAmount
    ) internal {
        address user = msg.sender;

        NodeTypeConfig memory config = nodeTypeConfigs[profile.nodeType];
        if (stakeAmount < config.minStake) revert InsufficientStake(stakeAmount, config.minStake);

        // Check name uniqueness
        string memory lowercaseName = _toLowercase(profile.name);
        if (communityByName[lowercaseName] != address(0)) revert NameAlreadyTaken(profile.name);

        // Check ENS uniqueness
        if (bytes(profile.ensName).length > 0) {
            if (communityByENS[profile.ensName] != address(0)) revert ENSAlreadyTaken(profile.ensName);
        }

        // Set profile data
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

        // Update indices
        communityByName[lowercaseName] = user;
        if (bytes(profile.ensName).length > 0) {
            communityByENS[profile.ensName] = user;
        }
        for (uint256 i = 0; i < profile.supportedSBTs.length; i++) {
            if (profile.supportedSBTs[i] != address(0)) {
                communityBySBT[profile.supportedSBTs[i]] = user;
            }
        }
        communityList.push(user);

        emit CommunityRegistered(user, profile.name, profile.nodeType, stakeAmount);
    }

    /**
     * @notice 内部函数：创建 Paymaster
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

    /**
     * @notice 内部函数：转小写
     */
    function _toLowercase(string memory str) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(strBytes.length);
        for (uint256 i = 0; i < strBytes.length; i++) {
            if (strBytes[i] >= 0x41 && strBytes[i] <= 0x5A) {
                result[i] = bytes1(uint8(strBytes[i]) + 32);
            } else {
                result[i] = strBytes[i];
            }
        }
        return string(result);
    }

    // ==================== 预览函数 ====================

    /**
     * @notice 预览 auto-register：计算需要补充的金额
     * @param user 用户地址
     * @param stakeAmount 需要stake的数量
     * @return needToStake 需要补充的stake金额
     * @return needToApprove 需要approve给Registry的金额
     * @return canRegister 是否可以注册（余额是否充足）
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

    /**
     * @notice 传统注册方式（保留向后兼容）
     */
    function registerCommunity(
        CommunityProfile memory profile,
        uint256 stGTokenAmount
    ) external nonReentrant {
        address communityAddress = msg.sender;

        if (communities[communityAddress].registeredAt != 0) revert CommunityAlreadyRegistered(communityAddress);
        if (bytes(profile.name).length == 0) revert NameEmpty();
        if (bytes(profile.name).length > MAX_NAME_LENGTH) revert InvalidParameter("Name too long");
        if (profile.supportedSBTs.length > MAX_SUPPORTED_SBTS) revert InvalidParameter("Too many SBTs");

        NodeTypeConfig memory config = nodeTypeConfigs[profile.nodeType];

        // Check stake requirement
        if (stGTokenAmount > 0) {
            if (stGTokenAmount < config.minStake) revert InsufficientStake(stGTokenAmount, config.minStake);
            GTOKEN_STAKING.lockStake(msg.sender, stGTokenAmount, "Registry registration");
        } else {
            uint256 existingLock = GTOKEN_STAKING.getLockedStake(msg.sender, address(this));
            if (existingLock < config.minStake) revert InsufficientStake(existingLock, config.minStake);
        }

        _registerCommunityInternal(profile, stGTokenAmount);
    }

    // ... 其他 v2.1.4 的函数保持不变 ...
    // (updateCommunityProfile, deactivateCommunity, getCommunityProfile, 等等)
}

// ==================== 接口定义 ====================

interface IGTokenStaking {
    function availableBalance(address user) external view returns (uint256);
    function stakeFor(address beneficiary, uint256 amount) external returns (uint256 shares);
    function lockStake(address user, uint256 amount, string memory purpose) external;
    function getLockedStake(address user, address locker) external view returns (uint256);
    function slash(address user, uint256 amount, string memory reason) external returns (uint256);
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

const RegistrationType = {
  COMMUNITY: 0,
  PAYMASTER: 1
};

async function registerCommunityWithAutoStake(profile, gTokenAmount) {
  const registry = new ethers.Contract(REGISTRY_ADDRESS, RegistryV2_2_0ABI, signer);

  // Step 1: 预览需要 approve 的金额
  const [needToStake, needToApprove, canRegister] = await registry.previewAutoRegister(
    account,
    gTokenAmount
  );

  if (!canRegister) {
    throw new Error('Insufficient GToken balance');
  }

  // Step 2: Approve（如果需要）
  if (needToApprove > 0n) {
    const gToken = new ethers.Contract(GTOKEN_ADDRESS, GTOKEN_ABI, signer);
    const approveTx = await gToken.approve(REGISTRY_ADDRESS, needToApprove);
    await approveTx.wait();
    console.log('✅ Approved');
  }

  // Step 3: 一键注册社区
  const tx = await registry.registerWithAutoStake(
    RegistrationType.COMMUNITY,  // 注册类型
    profile,                      // 社区资料
    ethers.ZeroAddress,          // paymasterOwner (unused for COMMUNITY)
    gTokenAmount,                // stake amount
    ethers.ZeroHash              // salt (unused for COMMUNITY)
  );
  const receipt = await tx.wait();

  // 解析返回值
  const [success, registeredAddress] = receipt.logs[0].args;
  console.log('✅ 社区注册成功！');
  console.log('   Address:', registeredAddress);
}
```

### 场景2：注册 Paymaster

```typescript
async function registerPaymasterWithAutoStake(paymasterOwner, nodeType, stakeAmount) {
  const registry = new ethers.Contract(REGISTRY_ADDRESS, RegistryV2_2_0ABI, signer);

  // Step 1: 预览
  const [needToStake, needToApprove, canRegister] = await registry.previewAutoRegister(
    account,
    stakeAmount
  );

  if (!canRegister) {
    throw new Error('Insufficient GToken balance');
  }

  // Step 2: Approve（如果需要）
  if (needToApprove > 0n) {
    const gToken = new ethers.Contract(GTOKEN_ADDRESS, GTOKEN_ABI, signer);
    const approveTx = await gToken.approve(REGISTRY_ADDRESS, needToApprove);
    await approveTx.wait();
  }

  // Step 3: 一键注册 Paymaster
  const paymasterSalt = ethers.randomBytes(32);
  const emptyProfile = {
    name: '',
    ensName: '',
    xPNTsToken: ethers.ZeroAddress,
    supportedSBTs: [],
    nodeType: nodeType,  // 0=AOA, 1=SUPER
    paymasterAddress: ethers.ZeroAddress,
    community: ethers.ZeroAddress,
    registeredAt: 0,
    lastUpdatedAt: 0,
    isActive: false,
    allowPermissionlessMint: false
  };

  const tx = await registry.registerWithAutoStake(
    RegistrationType.PAYMASTER,  // 注册类型
    emptyProfile,                // profile (unused for PAYMASTER)
    paymasterOwner,              // Paymaster owner
    stakeAmount,                 // stake amount
    paymasterSalt                // CREATE2 salt
  );
  const receipt = await tx.wait();

  const [success, paymasterAddress] = receipt.logs[0].args;
  console.log('✅ Paymaster注册成功！');
  console.log('   Address:', paymasterAddress);
}
```

## 使用场景对比

| 场景 | RegistrationType | 必填参数 | 返回值 |
|-----|------------------|---------|--------|
| **注册社区** | COMMUNITY (0) | profile, stakeAmount | (true, msg.sender) |
| **注册Paymaster** | PAYMASTER (1) | paymasterOwner, nodeType, stakeAmount, salt | (true, paymaster address) |

## 优势总结

| 特性 | 说明 |
|-----|------|
| ✅ **代码复用** | approve → stake → lock 逻辑共享 |
| ✅ **接口简洁** | 一个函数处理两种场景 |
| ✅ **灵活性** | 通过枚举类型清晰区分 |
| ✅ **原子操作** | 每个操作都是原子的，无状态同步问题 |
| ✅ **用户友好** | 只需2个交易（approve + register）|
| ✅ **向后兼容** | 保留 `registerCommunity()` 传统接口 |

## 对比 v2.1.4

| 特性 | v2.1.4 | v2.2.0 |
|-----|--------|--------|
| **交易数量** | 3个（approve + stake + register）| 2个（approve + register）|
| **状态同步问题** | ❌ 存在 | ✅ 无 |
| **用户体验** | 😕 复杂 | 😊 简单 |
| **Paymaster注册** | ❌ 不支持 | ✅ 支持 |

---

**下一步**：
1. 创建完整的Solidity合约文件
2. 编写测试用例
3. 部署到Sepolia测试网
4. 更新前端代码
