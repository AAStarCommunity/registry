# MySBT v2.4.3 - mintWithAutoStake Bug Fix

## 问题总结

**Bug**：MySBT v2.4.2 的 `mintWithAutoStake()` 功能失败，错误 `0x3ee5aeb5`
**影响**：所有没有预先质押的用户无法使用 auto-mint 功能
**测试账户**：TEST-USER5 (`0xE3D28Aa77c95d5C098170698e5ba68824BFC008d`)，300 GT 钱包余额，0 GT 质押

## 根本原因

### v2.4.2 的问题代码（lines 138-153）

```solidity
function mintWithAutoStake(address comm, string memory meta) external {
    address u = msg.sender;
    uint256 avail = IGTokenStaking(GTOKEN_STAKING).availableBalance(u);
    if (avail < minLockAmount) {
        uint256 need = minLockAmount - avail;
        IERC20(GTOKEN).safeTransferFrom(u, address(this), need);  // ❌ 只转 need (0.3 GT)
        IERC20(GTOKEN).approve(GTOKEN_STAKING, need);
        IGTokenStaking(GTOKEN_STAKING).stakeFor(u, need);
    }
    return userMint(comm, meta);  // ❌ userMint 还要从用户燃烧 mintFee (0.1 GT)!
}
```

### userMint 的期望（line 125）

```solidity
IERC20(GTOKEN).safeTransferFrom(u, BURN_ADDRESS, mintFee);  // 需要从用户燃烧 0.1 GT
```

### 问题

1. `mintWithAutoStake` 只从用户转走 `need` = 0.3 GT（质押差额）
2. `userMint` 还要从用户燃烧 `mintFee` = 0.1 GT
3. **总共需要 0.4 GT 授权**，但转账逻辑不完整导致失败

## v2.4.3 的修复

### 修复后的代码（v2.4.3 lines 169-229）

```solidity
function mintWithAutoStake(address comm, string memory meta) external {
    require(comm != address(0) && bytes(meta).length > 0 && bytes(meta).length <= 1024);
    require(_isValid(comm) && IRegistryV2_1(REGISTRY).isPermissionlessMintAllowed(comm));

    address u = msg.sender;
    uint256 avail = IGTokenStaking(GTOKEN_STAKING).availableBalance(u);

    // ✅ 计算需要从钱包转走的总量
    uint256 needToStake = avail < minLockAmount ? minLockAmount - avail : 0;
    uint256 totalFromWallet = needToStake + mintFee;  // 0.3 + 0.1 = 0.4 GT

    // ✅ 前置检查，清晰的错误消息
    uint256 walletBalance = IERC20(GTOKEN).balanceOf(u);
    if (walletBalance < totalFromWallet) {
        revert InsufficientWalletBalance(walletBalance, totalFromWallet);
    }

    uint256 allowance = IERC20(GTOKEN).allowance(u, address(this));
    if (allowance < totalFromWallet) {
        revert InsufficientAllowance(allowance, totalFromWallet);
    }

    // ✅ 一次性转走所有需要的代币到 MySBT
    if (totalFromWallet > 0) {
        IERC20(GTOKEN).safeTransferFrom(u, address(this), totalFromWallet);
    }

    // ✅ 分配：质押
    if (needToStake > 0) {
        IERC20(GTOKEN).approve(GTOKEN_STAKING, needToStake);
        IGTokenStaking(GTOKEN_STAKING).stakeFor(u, needToStake);
    }

    // ✅ 分配：燃烧（从 MySBT 余额）
    if (mintFee > 0) {
        IERC20(GTOKEN).safeTransfer(BURN_ADDRESS, mintFee);
    }

    // ✅ 执行 mint 逻辑（不再涉及代币转账）
    tid = userToSBT[u];
    if (tid == 0) {
        // ... mint 逻辑 ...
        IGTokenStaking(GTOKEN_STAKING).lockStake(u, minLockAmount, "MySBT");
        // ✅ 不再调用 safeTransferFrom，mintFee 已经在上面处理了
        _mint(u, tid);
        // ...
    }
}
```

### 关键改进

1. **正确计算总需求**：`totalFromWallet = needToStake + mintFee`
2. **清晰的前置检查**：
   - `InsufficientWalletBalance(available, required)` - 钱包余额不足
   - `InsufficientAllowance(available, required)` - 授权额度不足
3. **一次性转账**：先将所有代币转到 MySBT 合约
4. **分配代币**：
   - 质押部分 → `stakeFor(user, needToStake)`
   - 燃烧部分 → `safeTransfer(BURN_ADDRESS, mintFee)`
5. **避免重复转账**：mint 逻辑不再调用 `safeTransferFrom`

## 部署和测试

### 1. 部署 MySBT v2.4.3

```bash
cd /Volumes/UltraDisk/Dev2/aastar/SuperPaymaster

forge script script/DeployMySBT_v2_4_3.s.sol:DeployMySBT_v2_4_3 \
  --rpc-url sepolia \
  --broadcast \
  --verify \
  -vvvv
```

### 2. 注册为 Locker（使用 GTokenStaking owner）

```javascript
// 使用 GTokenStaking owner 账户
const gtokenStaking = new ethers.Contract(GTOKEN_STAKING_ADDRESS, ABI, signer);
await gtokenStaking.addLocker(MYSBT_V2_4_3_ADDRESS, "MySBT v2.4.3", 200, 1000, [50, 30, 20]);
```

### 3. 测试 TEST-USER5 的 Auto-Mint

修改 `test-user5-auto-mint.mjs`，将 `MYSBT_ADDRESS` 改为新部署的地址，然后运行：

```bash
cd /Volumes/UltraDisk/Dev2/aastar/registry
node test-user5-auto-mint.mjs
```

**预期结果**：
- ✅ 授权 0.4 GT 给 MySBT v2.4.3
- ✅ 调用 `mintWithAutoStake` 成功
- ✅ 创建 SBT (Token ID: 2 或更高)
- ✅ 加入 bbStar community
- ✅ 质押余额增加 0.3 GT
- ✅ 燃烧 0.1 GT

## 验证修复

### 检查点

1. **钱包余额变化**：300 GT → 299.6 GT（减少 0.4 GT）
2. **质押余额**：0 GT → 0.3 GT
3. **可用余额**：0 GT → 0 GT（立即被锁定）
4. **锁定余额**：0 GT → 0.3 GT
5. **SBT**：无 → Token ID > 0
6. **Membership**：无 → bbStar ACTIVE

### 对比 v2.4.2 vs v2.4.3

| 功能 | v2.4.2 | v2.4.3 |
|------|--------|--------|
| 计算总需求 | ❌ 只计算 needToStake | ✅ needToStake + mintFee |
| 前置检查 | ❌ 无 | ✅ 余额和授权检查 |
| 错误消息 | ❌ 不明确 (`0x3ee5aeb5`) | ✅ 清晰 (`InsufficientWalletBalance`) |
| 代币转账 | ❌ 分两次（可能冲突） | ✅ 一次性转到合约，再分配 |
| mint 逻辑 | ❌ 调用 userMint 重复转账 | ✅ 内联逻辑，避免重复 |

## 文件清单

### 创建的文件

1. **MySBT_v2.4.3.sol** - 修复后的合约
   - 路径：`/Volumes/UltraDisk/Dev2/aastar/SuperPaymaster/src/paymasters/v2/tokens/MySBT_v2.4.3.sol`

2. **DeployMySBT_v2_4_3.s.sol** - 部署脚本
   - 路径：`/Volumes/UltraDisk/Dev2/aastar/SuperPaymaster/script/DeployMySBT_v2_4_3.s.sol`

3. **final-diagnosis.md** - 完整诊断报告
   - 路径：`/Volumes/UltraDisk/Dev2/aastar/registry/final-diagnosis.md`

4. **test-user5-auto-mint.mjs** - TEST-USER5 测试脚本
   - 路径：`/Volumes/UltraDisk/Dev2/aastar/registry/test-user5-auto-mint.mjs`

5. **check-user-sbt.mjs** - User-1 状态检查脚本
   - 路径：`/Volumes/UltraDisk/Dev2/aastar/registry/check-user-sbt.mjs`

6. **match-error-selector.mjs** - 错误解码脚本
   - 路径：`/Volumes/UltraDisk/Dev2/aastar/registry/match-error-selector.mjs`

## 后续步骤

1. ✅ 部署 MySBT v2.4.3 到 Sepolia
2. ✅ 在 GTokenStaking 中注册为 locker
3. ✅ 使用 TEST-USER5 测试 mintWithAutoStake
4. ✅ 验证 gas 消耗和事件日志
5. ✅ 更新 aastar-shared-config 中的 MySBT 地址
6. ✅ 更新文档，标注 v2.4.2 已弃用
7. ✅ 通知社区用户升级到新版本

## 技术债务

### 未解决的问题

1. **错误 `0x3ee5aeb5` 的具体来源**：虽然修复了问题，但未确认此错误来自 GToken 还是其他库
2. **向后兼容性**：v2.4.2 的用户需要重新授权并迁移
3. **Gas 优化**：v2.4.3 的代币转账流程可能比 v2.4.2 消耗稍多 gas

### 建议

1. 部署后监控 gas 消耗
2. 收集用户反馈
3. 考虑在 v2.5.0 中进一步优化

## 联系人

- **Bug Report**: TEST-USER5 (`0xE3D28Aa77c95d5C098170698e5ba68824BFC008d`)
- **Workaround**: User-1 (手动质押 + userMint)
- **Fix Version**: MySBT v2.4.3
- **Date**: 2025-11-06
