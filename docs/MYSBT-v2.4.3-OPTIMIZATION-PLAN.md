# MySBT v2.4.3 合约大小优化方案

## 当前状况
- 合约大小: 24,776 字节
- 限制: 24,576 字节
- 需要减少: 200字节

## 优化策略

### 1. 移除自定义错误 (减少 ~80字节)
```solidity
// 删除:
error InsufficientWalletBalance(uint256 available, uint256 required);
error InsufficientAllowance(uint256 available, uint256 required);

// 替换为 require:
require(IERC20(GTOKEN).balanceOf(u) >= totalFromWallet, "E");
require(IERC20(GTOKEN).allowance(u, address(this)) >= totalFromWallet, "E");
```

### 2. 简化 mintWithAutoStake (减少 ~60字节)
```solidity
// 优化前:
uint256 walletBalance = IERC20(GTOKEN).balanceOf(u);
if (walletBalance < totalFromWallet) {
    revert InsufficientWalletBalance(walletBalance, totalFromWallet);
}

// 优化后:
require(IERC20(GTOKEN).balanceOf(u) >= totalFromWallet, "E");
```

### 3. 移除不必要的 if 检查 (减少 ~40字节)
```solidity
// totalFromWallet = needToStake + mintFee, mintFee > 0 时必然 > 0
// 移除:
if (totalFromWallet > 0) {
    IERC20(GTOKEN).safeTransferFrom(u, address(this), totalFromWallet);
}
// 改为:
IERC20(GTOKEN).safeTransferFrom(u, address(this), totalFromWallet);

// needToStake 可能为 0，保留检查
if (needToStake > 0) {
    IERC20(GTOKEN).approve(GTOKEN_STAKING, needToStake);
    IGTokenStaking(GTOKEN_STAKING).stakeFor(u, needToStake);
}

// mintFee 是常量，优化为直接调用
IERC20(GTOKEN).safeTransfer(BURN_ADDRESS, mintFee);
```

### 4. 使用 unchecked (减少 ~20字节)
```solidity
// 优化前:
uint256 needToStake = avail < minLockAmount ? minLockAmount - avail : 0;

// 优化后:
uint256 needToStake;
unchecked {
    needToStake = avail < minLockAmount ? minLockAmount - avail : 0;
}
```

### 5. 合并变量声明 (减少 ~20字节)
```solidity
// 优化前:
address u = msg.sender;
uint256 avail = IGTokenStaking(GTOKEN_STAKING).availableBalance(u);
uint256 needToStake = ...;
uint256 totalFromWallet = ...;

// 优化后: 移除中间变量
uint256 avail = IGTokenStaking(GTOKEN_STAKING).availableBalance(msg.sender);
uint256 needToStake = avail < minLockAmount ? minLockAmount - avail : 0;
```

## 预计效果
总计减少: 80 + 60 + 40 + 20 + 20 = **220 字节**

新大小: 24,776 - 220 = **24,556 字节** ✅ (在限制内)

## 实施步骤
1. 编辑 MySBT_v2.4.3.sol 应用以上优化
2. 重新编译检查大小
3. 测试 mintWithAutoStake 功能
4. 部署到 Sepolia
5. 配置为 GTokenStaking locker
6. 使用 TEST-USER5 测试

