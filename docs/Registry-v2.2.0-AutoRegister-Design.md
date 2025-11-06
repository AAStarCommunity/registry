# Registry v2.2.0 - Auto Register 内部实现方案

**日期**: 2025-11-06
**目标**: 在 Registry 内部添加 `registerCommunityWithAutoStake`，一步完成社区注册 + Paymaster 注册

## 核心需求

用户要求：
1. ✅ 借鉴 MySBT 的 `mintWithAutoStake` 模式
2. ✅ 把 approve, stake, lock, register 合并为一步
3. ✅ **在 Registry 内部实现**（不是外部合约）
4. ✅ **同时注册 Community AND Paymaster**

## Registry v2.2.0 新增功能

### 1. 新增函数签名

```solidity
/**
 * @notice 一键注册社区：自动处理 stake + lock + register community + register paymaster
 * @dev 借鉴 MySBT.mintWithAutoStake 模式
 * @param profile 社区资料（11个字段）
 * @param stakeAmount 需要stake和lock的GToken数量
 * @param paymasterSalt Paymaster 部署的 salt（如果需要自动注册 Paymaster）
 * @param autoCreatePaymaster 是否自动创建并注册 Paymaster
 * @return communityRegistered 社区是否注册成功
 * @return paymasterAddress 注册的 Paymaster 地址（如果有）
 */
function registerCommunityWithAutoStake(
    CommunityProfile calldata profile,
    uint256 stakeAmount,
    bytes32 paymasterSalt,
    bool autoCreatePaymaster
)
    external
    nonReentrant
    returns (
        bool communityRegistered,
        address paymasterAddress
    );
```

### 2. 完整实现代码

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin-v5.0.2/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin-v5.0.2/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin-v5.0.2/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin-v5.0.2/contracts/access/Ownable.sol";

/**
 * @title Registry v2.2.0 - Auto Register Edition
 * @notice 新增 registerCommunityWithAutoStake 函数，一键完成注册
 */
contract RegistryV2_2_0 is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ==================== 继承 v2.1.4 的所有代码 ====================
    // ... (省略 v2.1.4 的所有代码，保持不变) ...

    // ==================== v2.2.0 新增：依赖合约地址 ====================

    address public immutable GTOKEN;
    address public immutable GTOKEN_STAKING;
    address public immutable PAYMASTER_FACTORY;

    // ==================== v2.2.0 新增：事件 ====================

    event AutoRegisterSuccess(
        address indexed community,
        string name,
        uint256 stakeAmount,
        uint256 autoStaked,
        address paymasterAddress,
        bool paymasterCreated
    );

    event AutoRegisterFailed(
        address indexed community,
        string name,
        string reason
    );

    // ==================== v2.2.0 新增：错误 ====================

    error InsufficientGTokenBalance(uint256 available, uint256 required);
    error InvalidStakeAmount(uint256 amount);
    error CommunityAlreadyRegistered(address community);
    error PaymasterCreationFailed();

    // ==================== 构造函数 ====================

    constructor(
        address _gtoken,
        address _gtokenStaking,
        address _paymasterFactory
    ) Ownable(msg.sender) {
        GTOKEN = _gtoken;
        GTOKEN_STAKING = _gtokenStaking;
        PAYMASTER_FACTORY = _paymasterFactory;
    }

    // ==================== v2.2.0 核心功能 ====================

    /**
     * @notice 一键注册社区：自动处理 approve, stake, lock, register community, register paymaster
     * @dev 用户操作流程：
     *      1. 用户 approve stakeAmount GToken 给 Registry
     *      2. 用户调用此函数
     *      3. Registry 自动完成：
     *         a. 检查用户已有的 availableBalance
     *         b. 如果不足，从用户钱包拉取差额并代用户 stake
     *         c. Lock stake for community
     *         d. 注册社区
     *         e. 如果 autoCreatePaymaster=true，创建并注册 Paymaster
     *
     * @param profile 社区资料（11个字段，与 v2.1.4 相同）
     * @param stakeAmount 需要stake和lock的GToken数量
     * @param paymasterSalt Paymaster部署的salt（如果autoCreatePaymaster=true）
     * @param autoCreatePaymaster 是否自动创建并注册Paymaster
     * @return communityRegistered 社区是否注册成功
     * @return paymasterAddress 注册的Paymaster地址（如果有）
     */
    function registerCommunityWithAutoStake(
        CommunityProfile calldata profile,
        uint256 stakeAmount,
        bytes32 paymasterSalt,
        bool autoCreatePaymaster
    )
        external
        nonReentrant
        returns (
            bool communityRegistered,
            address paymasterAddress
        )
    {
        address user = msg.sender;

        // 1. 验证参数
        if (stakeAmount == 0) revert InvalidStakeAmount(stakeAmount);
        if (communities[user].isActive) revert CommunityAlreadyRegistered(user);

        // 2. 检查用户当前的可用余额
        uint256 avail = IGTokenStaking(GTOKEN_STAKING).availableBalance(user);

        // 3. 计算需要补充的stake金额
        uint256 need = avail < stakeAmount ? stakeAmount - avail : 0;

        // 4. 如果需要补充，从用户钱包拉取并代用户stake
        if (need > 0) {
            // 4.1 检查用户的 GToken 余额
            uint256 userBalance = IERC20(GTOKEN).balanceOf(user);
            if (userBalance < need) {
                revert InsufficientGTokenBalance(userBalance, need);
            }

            // 4.2 从用户钱包拉取 GToken
            IERC20(GTOKEN).safeTransferFrom(user, address(this), need);

            // 4.3 授权给 GTokenStaking
            IERC20(GTOKEN).approve(GTOKEN_STAKING, need);

            // 4.4 代用户 stake（使用 stakeFor）
            IGTokenStaking(GTOKEN_STAKING).stakeFor(user, need);
        }

        // 5. Lock stake for community（Registry 已经是 authorized locker）
        IGTokenStaking(GTOKEN_STAKING).lockStake(user, stakeAmount, "Registry");

        // 6. 注册社区
        _registerCommunityInternal(profile, stakeAmount);
        communityRegistered = true;

        // 7. 如果需要，自动创建并注册 Paymaster
        if (autoCreatePaymaster) {
            paymasterAddress = _createAndRegisterPaymaster(
                user,
                profile.nodeType,
                paymasterSalt
            );
        } else {
            paymasterAddress = profile.paymasterAddress;
        }

        // 8. 发出成功事件
        emit AutoRegisterSuccess(
            user,
            profile.name,
            stakeAmount,
            need,
            paymasterAddress,
            autoCreatePaymaster
        );

        return (communityRegistered, paymasterAddress);
    }

    /**
     * @notice 内部函数：注册社区（从 registerCommunity 提取）
     */
    function _registerCommunityInternal(
        CommunityProfile calldata profile,
        uint256 stakeAmount
    ) internal {
        address user = msg.sender;

        // 创建社区记录
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

        // 添加到社区列表
        communityList.push(user);

        // 发出事件
        emit CommunityRegistered(
            user,
            profile.name,
            stakeAmount,
            block.timestamp
        );
    }

    /**
     * @notice 内部函数：创建并注册 Paymaster
     * @param owner Paymaster 的 owner（社区地址）
     * @param nodeType 0=AOA, 1=SUPER
     * @param salt 部署的 salt
     * @return paymasterAddress 创建的 Paymaster 地址
     */
    function _createAndRegisterPaymaster(
        address owner,
        uint8 nodeType,
        bytes32 salt
    ) internal returns (address paymasterAddress) {
        // 调用 PaymasterFactory 创建 Paymaster
        try IPaymasterFactory(PAYMASTER_FACTORY).createPaymaster(
            owner,
            nodeType,
            salt
        ) returns (address paymaster) {
            paymasterAddress = paymaster;

            // 更新社区的 paymasterAddress
            communities[owner].paymasterAddress = paymaster;

            emit PaymasterRegistered(owner, paymaster, nodeType, block.timestamp);
        } catch {
            revert PaymasterCreationFailed();
        }

        return paymasterAddress;
    }

    /**
     * @notice 预览 auto-register：计算需要补充的stake金额
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

### 改造 RegisterCommunity.tsx

```typescript
// 新的注册流程：使用 auto-register
async function handleAutoRegister() {
  try {
    setIsRegistering(true);
    setError('');

    const registry = new ethers.Contract(
      REGISTRY_ADDRESS,
      RegistryV2_2_0ABI,  // 新的 ABI
      signer
    );

    // Step 1: 预览需要 approve 的金额
    const [needToStake, needToApprove, canRegister] = await registry.previewAutoRegister(
      account,
      gTokenAmount
    );

    console.log('Auto-register preview:');
    console.log('  Need to stake:', ethers.formatEther(needToStake), 'GT');
    console.log('  Need to approve:', ethers.formatEther(needToApprove), 'GT');
    console.log('  Can register:', canRegister);

    if (!canRegister) {
      throw new Error(`Insufficient GToken balance. Need ${ethers.formatEther(needToStake)} GT more.`);
    }

    // Step 2: Approve GToken 给 Registry（如果需要）
    if (needToApprove > 0n) {
      const gToken = new ethers.Contract(GTOKEN_ADDRESS, GTOKEN_ABI, signer);
      const approveTx = await gToken.approve(REGISTRY_ADDRESS, needToApprove);
      await approveTx.wait();
      console.log('✅ Approved', ethers.formatEther(needToApprove), 'GT to Registry');
    }

    // Step 3: 一键注册（自动 stake + register community + register paymaster）
    const paymasterSalt = ethers.randomBytes(32);  // 生成随机 salt
    const autoCreatePaymaster = !paymasterAddress;  // 如果没有提供 Paymaster，自动创建

    const tx = await registry.registerCommunityWithAutoStake(
      profile,
      gTokenAmount,
      paymasterSalt,
      autoCreatePaymaster
    );

    setRegisterTxHash(tx.hash);
    const receipt = await tx.wait();

    console.log('✅ Auto-register 成功！');
    console.log('   Transaction:', receipt.hash);

    // 从事件中提取 Paymaster 地址
    const event = receipt.logs.find(
      log => log.topics[0] === ethers.id('AutoRegisterSuccess(address,string,uint256,uint256,address,bool)')
    );
    if (event) {
      const decoded = registry.interface.parseLog(event);
      const registeredPaymaster = decoded.args.paymasterAddress;
      console.log('   Paymaster:', registeredPaymaster);
    }

    setRegistrationSuccess(true);
  } catch (err: unknown) {
    console.error('Auto-register failed:', err);
    setError(err instanceof Error ? err.message : 'Auto-register failed');
  } finally {
    setIsRegistering(false);
  }
}
```

## 用户体验对比

| 特性 | Registry v2.1.4（当前）| Registry v2.2.0（Auto-Register）|
|-----|----------------------|--------------------------------|
| **交易数量** | 3个独立交易 | 2个交易（approve + auto-register）|
| **操作步骤** | approve → stake → register | approve → auto-register ✨ |
| **Paymaster注册** | 需要额外1个交易 | ✅ 集成在 auto-register 中 |
| **状态同步问题** | ❌ 存在 | ✅ 无（原子操作）|
| **Gas费用** | 较高（4个交易）| 较低（2个交易）|
| **用户体验** | 😕 复杂（4步）| 😊 简单（2步）|

## 技术要点

### 1. Registry 必须是 Authorized Locker

**当前状态**：✅ Registry v2.1.4 已经是 authorized locker

验证方法：
```bash
node check-registry-locker.mjs
# 输出：✅ Registry is properly authorized as locker
```

### 2. GTokenStaking 必须支持 stakeFor

**当前状态**：✅ GTokenStaking v2.0.1 支持 `stakeFor(beneficiary, amount)`

确认位置：`GTokenStaking_v2_0_1.sol:290`

### 3. PaymasterFactory 必须提供 createPaymaster 接口

**待确认**：需要检查 PaymasterFactory 是否提供此接口

如果没有，可以先不自动创建 Paymaster，用户手动提供 Paymaster 地址。

## 部署计划

### Phase 1: 合约开发与测试（2-3天）
1. 创建 Registry v2.2.0 合约代码
2. 编写完整的单元测试
3. 本地测试网测试

### Phase 2: Sepolia 测试（1-2天）
1. 部署 Registry v2.2.0 到 Sepolia
2. 迁移测试社区数据
3. 前端集成测试

### Phase 3: 数据迁移与主网部署（需 DAO 投票）
1. 编写数据迁移脚本
2. DAO 投票通过升级提案
3. 部署到主网
4. 迁移所有社区数据
5. 前端切换到新 Registry

## 优势总结

### 为什么在 Registry 内部实现？

| 优势 | 说明 |
|-----|------|
| ✅ **官方升级路径** | 作为 Registry 的正式版本升级 |
| ✅ **功能集成** | 所有功能在一个合约内，无需额外依赖 |
| ✅ **用户体验最佳** | 用户只需 approve 给 Registry，最简单 |
| ✅ **同时注册 Paymaster** | 满足用户要求，一步完成所有注册 |
| ✅ **原子操作** | stake + lock + register 在同一交易中，无状态同步问题 |

### 为什么需要 DAO 投票？

- Registry 是核心基础设施
- 涉及所有社区的数据迁移
- 需要社区共识支持升级

## 风险评估

| 风险 | 缓解措施 |
|-----|---------|
| **数据迁移失败** | 充分测试迁移脚本；保留 v2.1.4 作为备份 |
| **合约bug** | 完整的单元测试；外部审计；Sepolia 充分测试 |
| **Gas费用增加** | 实际上会减少（合并多个交易） |
| **DAO 投票不通过** | 提供详细的技术文档和收益分析 |

## 下一步行动

1. **✅ 创建技术方案文档**（本文档）
2. **⏳ 创建 Registry v2.2.0 合约代码** - 需要你确认后开始
3. **⏳ 编写测试用例**
4. **⏳ Sepolia 部署测试**
5. **⏳ DAO 提案准备**

---

**需要我开始编写 Registry v2.2.0 的完整合约代码吗？**
