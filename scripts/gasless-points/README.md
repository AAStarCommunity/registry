# Gasless Points Debugging Scripts

This directory contains debugging and diagnostic scripts for the MySBT batch minting system with GToken integration.

## Scripts

### check-allowance.js
检查目标地址的 GToken allowance 状态。
- 验证地址是否授权足够的 GToken 给 MySBT 合约
- 要求: ≥ 0.4 GT (mintFee 0.1 + minLockAmount 0.3)

**Usage:**
```bash
node scripts/gasless-points/check-allowance.js
```

### check-contract-params.js
查询 MySBT 合约的配置参数。
- mintFee: 铸造费用
- minLockAmount: 最小锁定金额
- 计算总 GToken 需求

**Usage:**
```bash
node scripts/gasless-points/check-contract-params.js
```

### debug-mint-error.js
全面诊断 mint 失败的原因。
检查项：
- 目标地址 SBT 状态
- 目标地址 GToken 余额
- Operator 社区注册状态
- Operator GToken 余额
- 合约暂停状态
- mintFee 和 minLockAmount 参数

**Usage:**
```bash
node scripts/gasless-points/debug-mint-error.js
```

### simulate-mint-call.js
模拟 mint 调用以获取 revert 原因。
- 使用 eth_call 进行静态调用
- 检查 hasMinted 状态
- 解码自定义错误

**Usage:**
```bash
node scripts/gasless-points/simulate-mint-call.js
```

### test-sbt-balance.js
测试地址的 SBT 余额检查。
- 验证 balanceOf 调用
- 确认地址是否已持有 SBT

**Usage:**
```bash
node scripts/gasless-points/test-sbt-balance.js
```

## Common Issues Resolved

### Issue: Missing Revert Data
**Symptom:** Transaction fails with "missing revert data" error

**Root Causes:**
1. ❌ Target address has not approved GToken to MySBT contract
2. ❌ Target address GToken balance < 0.4 GT
3. ❌ Target address already has SBT from this community
4. ❌ Operator community not registered

**Solution:** Run `debug-mint-error.js` to identify the specific issue

### Issue: InsufficientGTokenBalance
**Root Cause:** Target address GToken balance < 0.4 GT

**Solution:**
```javascript
// Operator needs to transfer GToken to target address
await gtokenContract.transfer(targetAddress, ethers.parseEther("0.4"))
```

### Issue: Insufficient Allowance
**Root Cause:** Target address has not approved GToken to MySBT

**Solution:**
```javascript
// Target address needs to approve GToken
await gtokenContract.approve(mySBTAddress, ethers.parseEther("0.4"))
```

## Environment

- Network: Sepolia Testnet
- RPC: Private Alchemy RPC (configured in .env)
- MySBT Contract: 0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C
- GToken Contract: From @aastar/shared-config CORE_ADDRESSES.gToken

## Dependencies

All scripts use:
- ethers.js v6
- @aastar/shared-config (for contract addresses and ABIs)
