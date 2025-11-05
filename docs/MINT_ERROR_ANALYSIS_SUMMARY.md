# MySBT Mint Error 完整分析总结

**日期**: 2025-01-05
**错误**: 用户 mint SBT 失败，错误 `0x04d95544`

---

## ✅ 错误确认

### 1. 错误选择器验证
```bash
cast sig "UnauthorizedLocker(address)"
# → 0x04d95544  ✅ 完全匹配！
```

**结论**: 错误是 **`UnauthorizedLocker(address)`**，来自 `GTokenStaking.sol:352`

### 2. MySBT Locker 配置检查
```bash
cast call 0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69 \
  "getLockerConfig(address)" \
  0x73E635Fc9eD362b7061495372b6eDFF511D9E18F \
  --rpc-url $SEPOLIA_RPC_URL

# 返回数据解析：
# 第1个32字节：0x0000...0020 = 偏移量
# 第2个32字节：0x0000...0000 = authorized = FALSE ❌
```

**结论**: **MySBT 未被授权为 GTokenStaking 的 locker**

---

## 📊 合约配置状态

| 项目 | 地址 | 状态 |
|------|------|------|
| **MySBT** | `0x73E635Fc9eD362b7061495372b6eDFF511D9E18F` | ✅ 已部署 |
| **MySBT 使用的 GTokenStaking** | `0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69` | ⚠️  旧版本 |
| **shared-config 中的 GTokenStaking** | `0x60Bd54645b0fDabA1114B701Df6f33C4ecE87fEa` | ⚠️  不一致 |
| **GTokenStaking Owner** | `0x411BD567E46C0781248dbB6a9211891C032885e5` | DAO Multisig |
| **Registry v2.1.4** | `0xf384c592D5258c91805128291c5D4c069DD30CA6` | ✅ 已更新 |

---

## 🎯 问题确认

### 问题 1: MySBT 未被授权为 Locker
**原因**: GTokenStaking 的 `lockerConfigs[MySBT].authorized = false`

**调用链**:
```
用户.mint SBT
  → MySBT.userMint(bbStar, "{}")
    ├─ Registry.isRegisteredCommunity(bbStar) ✅ → true
    ├─ Registry.isPermissionlessMintAllowed(bbStar) ✅ → true
    └─ GTokenStaking.lockStake(user, 0.4 ether, "MySBT")
       └─ if (!lockerConfigs[MySBT].authorized) ❌
          → revert UnauthorizedLocker(0x73E635Fc9eD362b7061495372b6eDFF511D9E18F)
```

### 问题 2: GTokenStaking 地址不一致
- **MySBT 实际使用**: `0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69`
- **shared-config 记录**: `0x60Bd54645b0fDabA1114B701Df6f33C4ecE87fEa`

---

## ✅ 修复方案

### 方案 1: 配置 MySBT 为 Authorized Locker (必须)

**执行账户**: DAO Multisig (`0x411BD567E46C0781248dbB6a9211891C032885e5`)

**方法 A: 使用 Etherscan**
1. 访问: https://sepolia.etherscan.io/address/0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69#writeContract
2. 连接 DAO Multisig 钱包
3. 调用 `configureLocker` 函数，参数:
   ```
   locker: 0x73E635Fc9eD362b7061495372b6eDFF511D9E18F
   authorized: true
   feeRateBps: 100 (1% 退出费)
   minExitFee: 10000000000000000 (0.01 ether)
   maxFeePercent: 500 (5% 上限)
   timeTiers: []
   tierFees: []
   feeRecipient: 0x0000000000000000000000000000000000000000
   ```

**方法 B: 使用 Cast 命令**
```bash
source .env

cast send 0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69 \
  'configureLocker(address,bool,uint256,uint256,uint256,uint256[],uint256[],address)' \
  0x73E635Fc9eD362b7061495372b6eDFF511D9E18F \
  true \
  100 \
  10000000000000000 \
  500 \
  '[]' \
  '[]' \
  0x0000000000000000000000000000000000000000 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DAO_PRIVATE_KEY
```

**验证**:
```bash
cast call 0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69 \
  'getLockerConfig(address)' \
  0x73E635Fc9eD362b7061495372b6eDFF511D9E18F \
  --rpc-url $SEPOLIA_RPC_URL

# 预期: 第2个32字节 != 0x0000...0000 (authorized = true)
```

### 方案 2: 更新 shared-config (建议)

**问题**: `aastar-shared-config/src/contract-addresses.ts` 中的 GTokenStaking 地址不正确

**修复**:
```typescript
// 当前（错误）:
export const CORE_ADDRESSES = {
  gTokenStaking: '0x60Bd54645b0fDabA1114B701Df6f33C4ecE87fEa',  // ❌ 不一致
}

// 应改为:
export const CORE_ADDRESSES = {
  gTokenStaking: '0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69',  // ✅ MySBT 实际使用
}
```

---

## 📝 完整修复流程

1. ✅ **已完成**: MySBT.REGISTRY 更新为 Registry v2.1.4
2. ⏳ **待执行**: DAO Multisig 配置 MySBT 为 GTokenStaking authorized locker
3. ⏳ **待执行**: 更新 shared-config 中的 GTokenStaking 地址
4. ⏳ **用户操作**: 用户需要先质押 GT 到 GTokenStaking:
   ```solidity
   GToken.approve(GTokenStaking, 0.4 ether)
   GTokenStaking.stake(0.4 ether)
   ```
5. ⏳ **最终测试**: 用户成功 mint SBT

---

## 相关文件

- `docs/MYSBT_UNAUTHORIZED_LOCKER_FIX.md` - 详细修复指南
- `scripts/configure-mysbt-locker.sh` - 配置脚本（需要 DAO 私钥）
- `scripts/simulate-mint.sh` - Mint 模拟脚本
- `scripts/check-and-configure-locker.sh` - 配置检查脚本

---

**优先级**: 🔴 高 - 阻止所有用户 mint SBT
**执行者**: DAO Multisig (`0x411BD567E46C0781248dbB6a9211891C032885e5`)
