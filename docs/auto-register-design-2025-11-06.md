# Registry Auto-Register 设计方案

**日期**: 2025-11-06
**作者**: Claude
**目标**: 借鉴 MySBT `mintWithAutoStake` 模式，实现社区注册的一键操作

## 问题分析

### 当前流程的问题
目前注册社区需要多步操作：
1. **Approve GToken** → GTokenStaking
2. **Stake GToken** → GTokenStaking.stake()
3. **等待状态同步** ⚠️ 容易出现状态不同步问题
4. **Register Community** → Registry.registerCommunity()（内部会lockStake）

**用户痛点**：
- 需要3个独立交易
- 存在状态同步问题（estimateGas 看到旧状态导致 `InsufficientStake` 错误）
- 用户体验差，步骤复杂

### MySBT `mintWithAutoStake` 的成功模式

```solidity
// MySBT_v2.4.3.sol 第147-188行
function mintWithAutoStake(address comm, string memory meta) external {
    // 1. 计算需要的总金额
    uint256 avail = IGTokenStaking(GTOKEN_STAKING).availableBalance(msg.sender);
    uint256 need = avail < minLockAmount ? minLockAmount - avail : 0;
    uint256 total = need + mintFee;  // stake + burn

    // 2. 一次性从用户拉取所有token
    IERC20(GTOKEN).safeTransferFrom(msg.sender, address(this), total);

    // 3. 如果需要补充stake，代用户stake
    if (need > 0) {
        IERC20(GTOKEN).approve(GTOKEN_STAKING, need);
        IGTokenStaking(GTOKEN_STAKING).stakeFor(msg.sender, need);  // 🔑 关键
    }

    // 4. 处理其他费用（burn mintFee）
    IERC20(GTOKEN).safeTransfer(BURN_ADDRESS, mintFee);

    // 5. 执行核心业务逻辑
    IGTokenStaking(GTOKEN_STAKING).lockStake(msg.sender, minLockAmount, "MySBT");
    _mint(msg.sender, tid);
}
```

**核心优势**：
- **单次授权**：用户只需 approve 一次给 MySBT 合约
- **原子操作**：stake + lock + mint 在同一个交易中完成
- **无状态同步问题**：所有操作在同一个区块完成
- **使用 `stakeFor`**：合约代用户执行 stake 操作

## 技术方案

### 方案对比

| 方案 | 优点 | 缺点 | 复杂度 |
|-----|------|------|--------|
| **1. RegistryHelper 合约** | 不影响现有 Registry v2.1.4；可单独部署和升级；支持多种自动化流程 | 需要额外部署合约；用户需要 approve 给新合约 | 中等 |
| **2. Registry v2.2.0** | 功能集成在 Registry 内部；官方升级路径 | 需要迁移现有数据；风险较高；需要 DAO 投票 | 高 |
| **3. 前端 Batch 交易** | 不需要新合约；快速实现 | 仍然是多个交易；状态同步问题依然存在 | 低 |

**推荐方案**：**方案1 - RegistryHelper 合约** ✅

### 架构设计

```
用户 (单次授权)
  ↓ approve GToken
RegistryHelper 合约
  ├→ 1. transferFrom: 拉取用户的 GToken
  ├→ 2. approve & stakeFor: 代用户 stake 到 GTokenStaking
  ├→ 3. lockStake: Registry 会调用（内部）
  └→ 4. registerCommunity: 调用 Registry v2.1.4
       ├→ 注册社区
       └→ （可选）注册 Paymaster
```

### RegistryHelper v1.0.0 接口设计

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin-v5.0.2/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin-v5.0.2/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin-v5.0.2/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RegistryHelper v1.0.0
 * @notice 简化社区注册流程：approve + stake + register 一步完成
 * @dev 借鉴 MySBT.mintWithAutoStake 模式
 */
contract RegistryHelperV1_0_0 is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==================== 常量配置 ====================

    address public immutable GTOKEN;
    address public immutable GTOKEN_STAKING;
    address public immutable REGISTRY;

    string public constant VERSION = "1.0.0";
    uint256 public constant VERSION_CODE = 10000;

    // ==================== 事件 ====================

    event AutoRegisterSuccess(
        address indexed community,
        string name,
        uint256 stakeAmount,
        uint256 autoStaked,
        bool paymasterRegistered
    );

    // ==================== 错误 ====================

    error InsufficientBalance(uint256 available, uint256 required);
    error InvalidStakeAmount(uint256 amount);
    error RegistrationFailed(string reason);

    // ==================== 构造函数 ====================

    constructor(
        address _gtoken,
        address _gtokenStaking,
        address _registry
    ) {
        GTOKEN = _gtoken;
        GTOKEN_STAKING = _gtokenStaking;
        REGISTRY = _registry;
    }

    // ==================== 核心功能 ====================

    /**
     * @notice 一键注册社区：自动处理 stake + lock + register
     * @param profile 社区资料（11个字段）
     * @param stakeAmount 需要stake和lock的GToken数量
     * @return success 是否注册成功
     *
     * @dev 用户操作流程：
     *      1. 用户 approve stakeAmount GToken 给 RegistryHelper
     *      2. 用户调用此函数
     *      3. RegistryHelper 自动完成：
     *         - 检查用户已有的 availableBalance
     *         - 如果不足，拉取差额并代用户 stake
     *         - 调用 Registry.registerCommunity()
     */
    function registerCommunityWithAutoStake(
        IRegistryV2_1.CommunityProfile calldata profile,
        uint256 stakeAmount
    )
        external
        nonReentrant
        returns (bool success)
    {
        if (stakeAmount == 0) revert InvalidStakeAmount(stakeAmount);

        // 1. 检查用户当前的可用余额
        uint256 avail = IGTokenStaking(GTOKEN_STAKING).availableBalance(msg.sender);

        // 2. 计算需要补充的stake金额
        uint256 need = avail < stakeAmount ? stakeAmount - avail : 0;

        // 3. 如果需要补充，从用户钱包拉取并代用户stake
        if (need > 0) {
            // 3.1 从用户钱包拉取 GToken
            IERC20(GTOKEN).safeTransferFrom(msg.sender, address(this), need);

            // 3.2 授权给 GTokenStaking
            IERC20(GTOKEN).approve(GTOKEN_STAKING, need);

            // 3.3 代用户 stake（使用 stakeFor）
            IGTokenStaking(GTOKEN_STAKING).stakeFor(msg.sender, need);
        }

        // 4. 调用 Registry.registerCommunity
        //    Registry 会内部调用 GTokenStaking.lockStake
        try IRegistryV2_1(REGISTRY).registerCommunity(profile, stakeAmount) {
            emit AutoRegisterSuccess(
                profile.community,
                profile.name,
                stakeAmount,
                need,
                profile.paymasterAddress != address(0)
            );
            return true;
        } catch Error(string memory reason) {
            revert RegistrationFailed(reason);
        }
    }

    /**
     * @notice 模拟注册：检查用户是否有足够余额，计算需要补充的金额
     * @param user 用户地址
     * @param stakeAmount 需要stake的数量
     * @return needToStake 需要补充的stake金额
     * @return needToApprove 需要approve给RegistryHelper的金额
     */
    function previewAutoRegister(address user, uint256 stakeAmount)
        external
        view
        returns (
            uint256 needToStake,
            uint256 needToApprove
        )
    {
        uint256 avail = IGTokenStaking(GTOKEN_STAKING).availableBalance(user);
        needToStake = avail < stakeAmount ? stakeAmount - avail : 0;

        uint256 currentAllowance = IERC20(GTOKEN).allowance(user, address(this));
        needToApprove = needToStake > currentAllowance ? needToStake : 0;

        return (needToStake, needToApprove);
    }
}

// ==================== 接口定义 ====================

interface IGTokenStaking {
    function availableBalance(address user) external view returns (uint256);
    function stakeFor(address beneficiary, uint256 amount) external returns (uint256 shares);
    function lockStake(address user, uint256 amount, string memory purpose) external;
}

interface IRegistryV2_1 {
    struct CommunityProfile {
        string name;
        string ensName;
        address xPNTsToken;
        address[] supportedSBTs;
        uint8 nodeType;
        address paymasterAddress;
        address community;
        uint256 registeredAt;
        uint256 lastUpdatedAt;
        bool isActive;
        bool allowPermissionlessMint;
    }

    function registerCommunity(
        CommunityProfile calldata profile,
        uint256 stakeAmount
    ) external;
}
```

## 前端集成

### 改造 RegisterCommunity.tsx

```typescript
// 1. 检测是否部署了 RegistryHelper
const REGISTRY_HELPER_ADDRESS = "0x..."; // 部署后填入

// 2. 用户操作流程简化
async function handleAutoRegister() {
  const helper = new ethers.Contract(
    REGISTRY_HELPER_ADDRESS,
    RegistryHelperABI,
    signer
  );

  // Step 1: 预览需要approve的金额
  const [needToStake, needToApprove] = await helper.previewAutoRegister(
    account,
    gTokenAmount
  );

  console.log('需要补充stake:', ethers.formatEther(needToStake), 'GT');
  console.log('需要approve:', ethers.formatEther(needToApprove), 'GT');

  // Step 2: Approve GToken 给 RegistryHelper（如果需要）
  if (needToApprove > 0n) {
    const gToken = new ethers.Contract(GTOKEN_ADDRESS, GTOKEN_ABI, signer);
    const approveTx = await gToken.approve(REGISTRY_HELPER_ADDRESS, needToApprove);
    await approveTx.wait();
    console.log('✅ Approved');
  }

  // Step 3: 一键注册（自动stake + register）
  const tx = await helper.registerCommunityWithAutoStake(profile, gTokenAmount);
  await tx.wait();
  console.log('✅ 注册成功！');
}
```

## 部署计划

### Phase 1: 合约开发与测试
1. ✅ 完成 RegistryHelper v1.0.0 合约代码
2. 编写完整的单元测试
3. Sepolia 测试网部署和测试
4. 审计合约代码

### Phase 2: 前端集成
1. 添加 RegistryHelper ABI 到 aastar-shared-config
2. 改造 RegisterCommunity.tsx，支持两种模式：
   - **传统模式**：approve → stake → register（保留兼容性）
   - **一键模式**：approve → auto-register ✨ 新功能
3. 添加用户引导UI，说明新功能的优势

### Phase 3: 主网部署
1. Sepolia 测试通过后部署到主网
2. 文档更新
3. 社区公告

## 优势总结

| 特性 | 传统流程 | Auto-Register |
|-----|---------|---------------|
| **交易数量** | 3个独立交易 | 2个交易（approve + register）|
| **状态同步问题** | ❌ 存在 | ✅ 无 |
| **Gas费用** | 较高 | 较低（减少1个交易）|
| **用户体验** | 😕 复杂 | 😊 简单 |
| **错误率** | 较高（状态同步）| 极低（原子操作）|

## 安全考虑

1. **重入攻击防护**：使用 `nonReentrant` 修饰符
2. **权限控制**：RegistryHelper 不需要任何特殊权限，只是代理用户操作
3. **金额验证**：
   - 检查 `stakeAmount > 0`
   - 检查用户 GToken 余额是否充足
   - 检查 allowance 是否充足
4. **失败处理**：使用 try-catch 捕获 Registry.registerCommunity 的错误
5. **无需升级 Registry**：不修改现有已部署的 Registry v2.1.4

## 依赖关系

```
RegistryHelper v1.0.0
  ├── GToken (ERC20)
  ├── GTokenStaking v2.0.1 (需要 stakeFor 函数) ✅
  └── Registry v2.1.4 (registerCommunity 函数) ✅
```

**前置条件检查**：
- ✅ GTokenStaking v2.0.1 支持 `stakeFor(beneficiary, amount)` - 已确认（第290行）
- ✅ Registry v2.1.4 支持 `registerCommunity(profile, stakeAmount)` - 已确认
- ✅ RegistryHelper 需要被授权为 locker - 不需要！因为它不直接调用 lockStake
  - Registry 会代替用户调用 lockStake
  - RegistryHelper 只需要调用 stakeFor 和 registerCommunity

## 下一步行动

1. **创建合约文件**：`RegistryHelper_v1_0_0.sol`
2. **编写测试**：`RegistryHelper.t.sol`
3. **部署脚本**：`DeployRegistryHelper.s.sol`
4. **前端改造**：更新 `RegisterCommunity.tsx`

---

## 附录：与 MySBT 的对比

| 特性 | MySBT `mintWithAutoStake` | RegistryHelper `registerCommunityWithAutoStake` |
|-----|---------------------------|------------------------------------------------|
| **目标** | 一键mint SBT | 一键注册社区 |
| **需要补充** | stake + burn(mintFee) | stake only |
| **核心操作** | lock + mint SBT | lock + register community |
| **是否需要locker权限** | ✅ 是 (MySBT是locker) | ❌ 否 (Registry是locker) |
| **stakeFor调用者** | MySBT合约 | RegistryHelper合约 |
| **lockStake调用者** | MySBT合约 (直接调用) | Registry合约 (内部调用) |

**关键差异**：
- MySBT 自己就是 locker，可以直接调用 `lockStake`
- RegistryHelper **不是** locker，它调用 Registry，由 Registry 内部调用 `lockStake`
- 因此 RegistryHelper **不需要** locker 权限 ✅
