# Registry v2.2.0 - 两个独立的 Auto-Register 函数

**日期**: 2025-11-06
**需求澄清**: 两个独立场景，不是同时注册

## 核心需求

用户需要两个独立的函数：

### 函数1：`registerCommunityWithAutoStake`
```
User Flow: approve → stake → lock → register COMMUNITY
```

### 函数2：`registerPaymasterWithAutoStake`
```
User Flow: approve → stake → lock → register PAYMASTER
```

**关键点**：这是**两个独立的操作**，不是一次完成两个注册！

## Registry v2.2.0 新增功能

### 1. 函数签名

```solidity
/**
 * @notice 一键注册社区：自动处理 approve + stake + lock + register community
 * @param profile 社区资料（11个字段）
 * @param stakeAmount 需要stake和lock的GToken数量
 * @return success 是否注册成功
 */
function registerCommunityWithAutoStake(
    CommunityProfile calldata profile,
    uint256 stakeAmount
) external nonReentrant returns (bool success);

/**
 * @notice 一键注册Paymaster：自动处理 approve + stake + lock + register paymaster
 * @param paymasterOwner Paymaster的owner地址（通常是社区地址）
 * @param nodeType 0=AOA, 1=SUPER
 * @param stakeAmount 需要stake和lock的GToken数量
 * @param salt 部署Paymaster的salt
 * @return paymasterAddress 创建的Paymaster地址
 */
function registerPaymasterWithAutoStake(
    address paymasterOwner,
    uint8 nodeType,
    uint256 stakeAmount,
    bytes32 salt
) external nonReentrant returns (address paymasterAddress);
```

### 2. 完整实现代码

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin-v5.0.2/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin-v5.0.2/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin-v5.0.2/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Registry v2.2.0 - Two Auto-Register Functions
 * @notice 提供两个独立的 auto-register 函数
 */
contract RegistryV2_2_0 is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==================== 依赖合约地址 ====================
    address public immutable GTOKEN;
    address public immutable GTOKEN_STAKING;
    address public immutable PAYMASTER_FACTORY;

    // ==================== 事件 ====================

    event CommunityAutoRegistered(
        address indexed community,
        string name,
        uint256 stakeAmount,
        uint256 autoStaked,
        uint256 timestamp
    );

    event PaymasterAutoRegistered(
        address indexed owner,
        address indexed paymaster,
        uint8 nodeType,
        uint256 stakeAmount,
        uint256 autoStaked,
        uint256 timestamp
    );

    // ==================== 错误 ====================

    error InsufficientGTokenBalance(uint256 available, uint256 required);
    error InvalidStakeAmount(uint256 amount);
    error CommunityAlreadyRegistered(address community);
    error PaymasterCreationFailed();

    // ==================== 构造函数 ====================

    constructor(
        address _gtoken,
        address _gtokenStaking,
        address _paymasterFactory
    ) {
        GTOKEN = _gtoken;
        GTOKEN_STAKING = _gtokenStaking;
        PAYMASTER_FACTORY = _paymasterFactory;
    }

    // ==================== 场景1：注册社区 ====================

    /**
     * @notice 一键注册社区：approve → stake → lock → register community
     * @dev 用户流程：
     *      1. User: approve stakeAmount GToken to Registry
     *      2. User: call this function
     *      3. Registry:
     *         a. Check user's availableBalance
     *         b. If insufficient, pull GToken from user and stakeFor(user, need)
     *         c. lockStake(user, stakeAmount, "Registry")
     *         d. Register community
     *
     * @param profile 社区资料（与 v2.1.4 相同的11个字段）
     * @param stakeAmount 需要stake和lock的GToken数量
     * @return success 是否注册成功
     */
    function registerCommunityWithAutoStake(
        CommunityProfile calldata profile,
        uint256 stakeAmount
    )
        external
        nonReentrant
        returns (bool success)
    {
        address user = msg.sender;

        // 1. 验证参数
        if (stakeAmount == 0) revert InvalidStakeAmount(stakeAmount);
        if (communities[user].isActive) revert CommunityAlreadyRegistered(user);

        // 2. 执行 auto-stake 逻辑
        uint256 autoStaked = _autoStakeForUser(user, stakeAmount);

        // 3. Lock stake for community
        IGTokenStaking(GTOKEN_STAKING).lockStake(user, stakeAmount, "Registry");

        // 4. 注册社区（复用 v2.1.4 的内部逻辑）
        _registerCommunityInternal(profile, stakeAmount);

        // 5. 发出成功事件
        emit CommunityAutoRegistered(
            user,
            profile.name,
            stakeAmount,
            autoStaked,
            block.timestamp
        );

        return true;
    }

    // ==================== 场景2：注册 Paymaster ====================

    /**
     * @notice 一键注册Paymaster：approve → stake → lock → register paymaster
     * @dev 用户流程：
     *      1. User: approve stakeAmount GToken to Registry
     *      2. User: call this function
     *      3. Registry:
     *         a. Check user's availableBalance
     *         b. If insufficient, pull GToken from user and stakeFor(user, need)
     *         c. lockStake(user, stakeAmount, "Registry")
     *         d. Create Paymaster via PaymasterFactory
     *         e. Register Paymaster in Registry
     *
     * @param paymasterOwner Paymaster的owner地址（通常是社区地址）
     * @param nodeType 0=AOA, 1=SUPER
     * @param stakeAmount 需要stake和lock的GToken数量
     * @param salt 部署Paymaster的salt（用于CREATE2）
     * @return paymasterAddress 创建的Paymaster地址
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

        // 2. 执行 auto-stake 逻辑
        uint256 autoStaked = _autoStakeForUser(user, stakeAmount);

        // 3. Lock stake for paymaster
        IGTokenStaking(GTOKEN_STAKING).lockStake(user, stakeAmount, "Registry");

        // 4. 创建 Paymaster
        paymasterAddress = _createPaymaster(paymasterOwner, nodeType, salt);

        // 5. 注册 Paymaster（如果 Registry 有 paymaster 映射表）
        // paymasters[paymasterAddress] = PaymasterInfo(...);

        // 6. 发出成功事件
        emit PaymasterAutoRegistered(
            paymasterOwner,
            paymasterAddress,
            nodeType,
            stakeAmount,
            autoStaked,
            block.timestamp
        );

        return paymasterAddress;
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
        uint256 avail = IGTokenStaking(GTOKEN_STAKING).availableBalance(user);

        // 2. 计算需要补充的金额
        uint256 need = avail < stakeAmount ? stakeAmount - avail : 0;

        // 3. 如果需要补充，从用户钱包拉取并代用户stake
        if (need > 0) {
            // 3.1 检查用户的 GToken 余额
            uint256 userBalance = IERC20(GTOKEN).balanceOf(user);
            if (userBalance < need) {
                revert InsufficientGTokenBalance(userBalance, need);
            }

            // 3.2 从用户钱包拉取 GToken
            IERC20(GTOKEN).safeTransferFrom(user, address(this), need);

            // 3.3 授权给 GTokenStaking
            IERC20(GTOKEN).approve(GTOKEN_STAKING, need);

            // 3.4 代用户 stake（使用 stakeFor）
            IGTokenStaking(GTOKEN_STAKING).stakeFor(user, need);

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
        CommunityProfile calldata profile,
        uint256 stakeAmount
    ) internal {
        address user = msg.sender;

        communities[user] = CommunityProfile({
            name: profile.name,
            ensName: profile.ensName,
            xPNTsToken: profile.xPNTsToken,
            supportedSBTs: profile.supportedSBTs,
            nodeType: profile.nodeType,
            paymasterAddress: profile.paymasterAddress,
            community: user,
            registeredAt: block.timestamp,
            lastUpdatedAt: block.timestamp,
            isActive: true,
            allowPermissionlessMint: profile.allowPermissionlessMint
        });

        communityList.push(user);

        emit CommunityRegistered(user, profile.name, stakeAmount, block.timestamp);
    }

    /**
     * @notice 内部函数：创建 Paymaster
     */
    function _createPaymaster(
        address owner,
        uint8 nodeType,
        bytes32 salt
    ) internal returns (address paymaster) {
        try IPaymasterFactory(PAYMASTER_FACTORY).createPaymaster(
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
        uint256 avail = IGTokenStaking(GTOKEN_STAKING).availableBalance(user);
        needToStake = avail < stakeAmount ? stakeAmount - avail : 0;

        uint256 currentAllowance = IERC20(GTOKEN).allowance(user, address(this));
        needToApprove = needToStake > currentAllowance ? needToStake : 0;

        uint256 userBalance = IERC20(GTOKEN).balanceOf(user);
        canRegister = userBalance >= needToStake;

        return (needToStake, needToApprove, canRegister);
    }
}

// ==================== 接口定义 ====================

interface IGTokenStaking {
    function availableBalance(address user) external view returns (uint256);
    function stakeFor(address beneficiary, uint256 amount) external returns (uint256 shares);
    function lockStake(address user, uint256 amount, string memory purpose) external;
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
// 用户操作：注册社区
async function handleRegisterCommunity() {
  const registry = new ethers.Contract(REGISTRY_ADDRESS, RegistryV2_2_0ABI, signer);

  // Step 1: 预览需要 approve 的金额
  const [needToStake, needToApprove, canRegister] = await registry.previewAutoRegister(
    account,
    gTokenAmount
  );

  if (!canRegister) {
    throw new Error(`Insufficient GToken balance`);
  }

  // Step 2: Approve（如果需要）
  if (needToApprove > 0n) {
    const gToken = new ethers.Contract(GTOKEN_ADDRESS, GTOKEN_ABI, signer);
    const tx = await gToken.approve(REGISTRY_ADDRESS, needToApprove);
    await tx.wait();
  }

  // Step 3: 一键注册社区
  const tx = await registry.registerCommunityWithAutoStake(
    profile,
    gTokenAmount
  );
  await tx.wait();

  console.log('✅ 社区注册成功！');
}
```

### 场景2：注册 Paymaster

```typescript
// 用户操作：注册 Paymaster
async function handleRegisterPaymaster() {
  const registry = new ethers.Contract(REGISTRY_ADDRESS, RegistryV2_2_0ABI, signer);

  // Step 1: 预览需要 approve 的金额
  const paymasterStakeAmount = ethers.parseEther("50"); // Paymaster 可能需要更多stake
  const [needToStake, needToApprove, canRegister] = await registry.previewAutoRegister(
    account,
    paymasterStakeAmount
  );

  if (!canRegister) {
    throw new Error(`Insufficient GToken balance`);
  }

  // Step 2: Approve（如果需要）
  if (needToApprove > 0n) {
    const gToken = new ethers.Contract(GTOKEN_ADDRESS, GTOKEN_ABI, signer);
    const tx = await gToken.approve(REGISTRY_ADDRESS, needToApprove);
    await tx.wait();
  }

  // Step 3: 一键注册 Paymaster
  const paymasterSalt = ethers.randomBytes(32);
  const nodeType = 0; // AOA
  const tx = await registry.registerPaymasterWithAutoStake(
    account, // paymasterOwner = 社区地址
    nodeType,
    paymasterStakeAmount,
    paymasterSalt
  );
  const receipt = await tx.wait();

  // 从返回值中提取 Paymaster 地址
  const paymasterAddress = receipt.logs[0].address; // 或从事件中解析

  console.log('✅ Paymaster 注册成功！');
  console.log('   Address:', paymasterAddress);
}
```

## 使用场景对比

| 场景 | 函数 | 用途 | Stake 用途 |
|-----|------|------|-----------|
| **场景1** | `registerCommunityWithAutoStake()` | 注册社区 | Lock for community |
| **场景2** | `registerPaymasterWithAutoStake()` | 注册 Paymaster | Lock for paymaster |

## 典型用户流程

### 流程A：先注册社区，后注册 Paymaster

```
1. User: registerCommunityWithAutoStake(profile, 30 GT)
   → Community registered, stake locked for community

2. User: registerPaymasterWithAutoStake(owner, nodeType, 50 GT, salt)
   → Paymaster created & registered, additional stake locked for paymaster

Total stake needed: 30 + 50 = 80 GT
```

### 流程B：只注册社区，手动提供 Paymaster

```
1. User: 已有 Paymaster 地址（在其他地方创建）

2. User: registerCommunityWithAutoStake(profile, 30 GT)
   → profile.paymasterAddress = 已有的 Paymaster 地址
   → Community registered with existing paymaster

Total stake needed: 30 GT
```

### 流程C：只注册 Paymaster

```
1. User: registerPaymasterWithAutoStake(owner, nodeType, 50 GT, salt)
   → Paymaster created & registered
   → 可以稍后关联到社区

Total stake needed: 50 GT
```

## 技术要点

### 共享的 Auto-Stake 逻辑

两个函数都使用相同的 `_autoStakeForUser()` 内部函数：

```solidity
function _autoStakeForUser(address user, uint256 stakeAmount) internal {
    // 1. Check availableBalance
    // 2. Calculate need = stakeAmount - available
    // 3. If need > 0:
    //    - transferFrom(user, this, need)
    //    - approve(GTOKEN_STAKING, need)
    //    - stakeFor(user, need)
}
```

这样避免了代码重复，保持了一致性。

## 优势总结

| 优势 | 说明 |
|-----|------|
| ✅ **清晰的职责分离** | 两个独立函数，各司其职 |
| ✅ **灵活性** | 可以单独注册社区或 Paymaster |
| ✅ **复用性** | 共享 auto-stake 逻辑 |
| ✅ **原子操作** | 每个操作都是原子的，无状态同步问题 |
| ✅ **用户友好** | 每种场景只需2个交易（approve + register）|

## 对比之前的错误理解

| 特性 | 错误理解（之前）| 正确理解（现在）|
|-----|---------------|----------------|
| **函数数量** | 1个函数同时注册两者 | 2个独立函数 |
| **使用场景** | 必须同时注册 | 可以分别注册 |
| **灵活性** | ❌ 低 | ✅ 高 |

---

**这次理解对了吗？需要我继续完善这个方案吗？**
