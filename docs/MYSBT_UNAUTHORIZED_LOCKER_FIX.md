# MySBT Mint Error - UnauthorizedLocker 根本原因与修复

**创建日期**: 2025-01-05
**问题**: 用户铸造 SBT 时遇到 `UnauthorizedLocker(MySBT地址)` 错误
**状态**: ✅ 根本原因已确认，待 DAO 执行修复

---

## 📊 问题总结

### 错误信息
```
execution reverted (unknown custom error)
data: "0x04d9554400000000000000000000000073e635fc9ed362b7061495372b6edff511d9e18f"
```

### 错误解析

**错误选择器计算**:
```bash
cast sig "UnauthorizedLocker(address)"
# → 0x04d95544  ✅ 完全匹配！
```

- **错误名称**: `UnauthorizedLocker(address caller)`
- **错误选择器**: `0x04d95544`
- **错误参数**: `0x73E635Fc9eD362b7061495372B6eDFF511D9E18F` = **MySBT 合约地址**
- **错误来源**: `GTokenStaking.sol:352`

---

## 🔍 调查过程

### 1. Transaction Trace 分析

通过 `cast call --trace` 获得完整调用栈：

```
用户.mint SBT
  → MySBT.userMint(bbStar, "{}")
    ├─ Registry.isRegisteredCommunity(bbStar) → true  ✅
    ├─ Registry.isPermissionlessMintAllowed(bbStar) → true  ✅
    ├─ MySBT_v2.4.0.sol:354
    │  └─ GTokenStaking.lockStake(user, 0.4 ether, "MySBT")
    │     └─ GTokenStaking.sol:352
    │        └─ ❌ [Revert] UnauthorizedLocker(0x73E635Fc9eD362b7061495372b6eDFF511D9E18F)
```

### 2. 源代码分析

**GTokenStaking.sol lockStake() 函数**:
```solidity
function lockStake(
    address user,
    uint256 amount,
    string memory purpose
) external {
    LockerConfig memory config = lockerConfigs[msg.sender];
    if (!config.authorized) {
        revert UnauthorizedLocker(msg.sender);  // ← Line 352: 错误抛出点
    }

    uint256 available = availableBalance(user);
    if (available < amount) {
        revert InsufficientAvailableBalance(available, amount);
    }

    // Update lock info
    locks[user][msg.sender].amount += amount;
    locks[user][msg.sender].lockedAt = block.timestamp;
    locks[user][msg.sender].purpose = purpose;
    locks[user][msg.sender].beneficiary = msg.sender;

    totalLocked[user] += amount;

    emit StakeLocked(user, msg.sender, amount, purpose);
}
```

**关键检查**: `lockerConfigs[msg.sender].authorized` 必须为 `true`

### 3. 链上配置验证

```bash
# 检查 MySBT 的 locker 配置
cast call 0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69 \
  "getLockerConfig(address)" \
  0x73E635Fc9eD362b7061495372b6eDFF511D9E18F \
  --rpc-url $SEPOLIA_RPC_URL

# 返回全 0 → MySBT 未配置！
# 第一个字段 authorized = 0x0000...0000 = false ❌
```

---

## 🎯 根本原因

### MySBT 未被配置为 GTokenStaking 的授权 Locker

**完整调用链**:
```
用户发起 mint SBT 请求
  → MySBT.userMint(bbStar, "{}")
    ├─ 验证 bbStar 是否注册 ✅
    ├─ 验证 bbStar 允许无权限铸造 ✅
    └─ 调用 GTokenStaking.lockStake(user, 0.4 ether, "MySBT")
       └─ 检查 lockerConfigs[MySBT].authorized
          ├─ 期望: true
          ├─ 实际: false ❌
          └─ 抛出 UnauthorizedLocker(0x73E635Fc9eD362b7061495372b6eDFF511D9E18F)
```

**为什么需要授权**:
1. GTokenStaking 是共享质押池，用户质押 GT 后获得 stGToken shares
2. 多个协议（MySBT、Registry、SuperPaymaster）可以锁定用户的 stGToken
3. 为了安全，只有经过 owner 授权的 locker 才能调用 `lockStake()`
4. MySBT 从未被配置为授权 locker → 调用失败

**设计架构**:
```
GTokenStaking (质押池)
  ├─ Users stake GT → receive stGToken shares
  └─ Authorized Lockers can lock user's stGToken:
     ├─ Registry (30 GT for community registration)
     ├─ SuperPaymaster (paymaster stake)
     └─ MySBT (0.4 GT for SBT membership) ← 缺少此配置！
```

---

## ✅ 修复方案

### 配置 MySBT 为 GTokenStaking 授权的 Locker

#### 执行要求
- **执行账户**: DAO Multisig (`0x411BD567E46C0781248dbB6a9211891C032885e5`)
- **目标合约**: GTokenStaking (`0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69`)
- **操作**: 调用 `configureLocker()` 函数

#### 方法 1: 使用 Etherscan (推荐)

1. 访问 GTokenStaking 合约:
   ```
   https://sepolia.etherscan.io/address/0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69#writeContract
   ```

2. 连接 DAO Multisig 钱包 (`0x411BD567E46C0781248dbB6a9211891C032885e5`)

3. 找到 `configureLocker` 函数，填入参数:

   ```
   locker: 0x73E635Fc9eD362b7061495372b6eDFF511D9E18F
   authorized: true
   feeRateBps: 100                                    // 1% exit fee (100 basis points)
   minExitFee: 10000000000000000                      // 0.01 ether (防止 dust 攻击)
   maxFeePercent: 500                                 // 5% max fee cap
   timeTiers: []                                      // 空数组（不使用时间分层费率）
   tierFees: []                                       // 空数组
   feeRecipient: 0x0000000000000000000000000000000000000000  // 使用默认 treasury
   ```

4. 点击 "Write" 提交交易

#### 方法 2: 使用 Cast 命令行

如果 DAO 私钥已配置在 `.env` 中：

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

#### 验证修复

执行以下命令确认配置成功：

```bash
source .env
cast call 0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69 \
  'getLockerConfig(address)' \
  0x73E635Fc9eD362b7061495372b6eDFF511D9E18F \
  --rpc-url $SEPOLIA_RPC_URL
```

**预期结果**: 返回数据的第一个字段（authorized）应该为非 0 值（true）

---

## 📝 技术细节

### 合约地址清单

| 合约 | 地址 | 说明 |
|------|------|------|
| MySBT | `0x73E635Fc9eD362b7061495372b6eDFF511D9E18F` | SBT 铸造合约 |
| GTokenStaking | `0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69` | GT 质押合约 |
| Registry v2.1.4 | `0xf384c592D5258c91805128291c5D4c069DD30CA6` | 社区注册中心 |
| GToken | `0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc` | 治理代币 |
| DAO Multisig | `0x411BD567E46C0781248dbB6a9211891C032885e5` | DAO 多签钱包 |
| bbStar 社区 | `0xe24b6f321B0140716a2b671ed0D983bb64E7DaFA` | 测试社区 |
| 用户钱包 | `0xF7Bf79AcB7F3702b9DbD397d8140ac9DE6Ce642C` | 尝试 mint 的用户 |

### 相关文件

- `docs/MYSBT_UNAUTHORIZED_LOCKER_FIX.md` - 本文档（根本原因分析）
- `scripts/configure-mysbt-locker.sh` - Locker 配置脚本
- `scripts/simulate-mint.sh` - Mint 模拟脚本
- `scripts/check-mysbt-locker-config.sh` - Locker 配置检查脚本

### GTokenStaking Locker 机制

**LockerConfig 结构体**:
```solidity
struct LockerConfig {
    bool authorized;         // 是否授权锁定用户质押
    uint256 feeRateBps;      // 退出费率（基点，100 = 1%）
    uint256 minExitFee;      // 最低退出费（防止极小额攻击）
    uint256 maxFeePercent;   // 最大费率上限（500 = 5%）
    uint256[] timeTiers;     // 时间分层阈值（可选）
    uint256[] tierFees;      // 各层级费率（可选）
    address feeRecipient;    // 退出费接收地址（0 = 使用默认 treasury）
}
```

**授权 Locker 列表（预期）**:
- ✅ Registry - 社区注册质押（30 GT）
- ✅ SuperPaymaster - Paymaster 质押
- ❌ **MySBT - SBT 会员质押（0.4 GT）← 需要配置**

---

## 🔄 完整修复流程

### 已完成步骤

1. ✅ **MySBT Registry 更新** (用户已完成)
   - MySBT.REGISTRY 已更新为 Registry v2.1.4 (`0xf384c592D5258c91805128291c5D4c069DD30CA6`)
   - 使用 cast 命令手动更新成功

2. ✅ **bbStar 社区注册验证**
   - Registry.isRegisteredCommunity(bbStar) → `true`
   - Registry.isPermissionlessMintAllowed(bbStar) → `true`

3. ✅ **根本原因定位**
   - 错误选择器 `0x04d95544` = `UnauthorizedLocker(address)`
   - MySBT 未在 GTokenStaking 中被授权为 locker

### 待执行步骤

4. ⏳ **配置 MySBT 为授权 Locker** (本文档修复方案)
   - DAO Multisig 调用 `GTokenStaking.configureLocker(MySBT, true, ...)`

5. ⏳ **用户质押 GT 到 GTokenStaking**
   ```solidity
   // 用户需要先质押 GT，获得 stGToken shares
   GToken.approve(GTokenStaking, 0.4 ether)
   GTokenStaking.stake(0.4 ether)
   ```

6. ⏳ **用户成功 mint SBT**
   - 访问 Get SBT 页面
   - 选择 bbStar 社区
   - 点击 "Mint SBT"
   - MySBT 调用 `GTokenStaking.lockStake(user, 0.4 ether, "MySBT")` ✅ 成功

---

## 🔬 调试过程纠正

### 之前的错误假设

**错误假设 1** (已纠正):
> "MySBT 需要在 Registry 中注册为一个社区"

**实际情况**:
- MySBT 是 SBT 铸造合约，**不是**社区
- 用户 mint SBT 时提供的社区参数是 bbStar，不是 MySBT
- Registry.isRegisteredCommunity(MySBT) 返回 false 是正常的

**错误假设 2** (已纠正):
> "用户需要 approve 0.4 GT 给 MySBT，MySBT 通过 transferFrom 转移到 GTokenStaking"

**实际情况**:
- lockStake() 不涉及 token transfer
- 用户需要先直接调用 `GTokenStaking.stake(0.4 ether)` 质押 GT
- 然后 MySBT 才能调用 `lockStake()` 锁定用户已质押的 stGToken shares

### 正确的 Mint SBT 流程

```
准备阶段（用户操作）:
1. GToken.approve(GTokenStaking, 0.4 ether)
2. GTokenStaking.stake(0.4 ether)
   → 用户获得 0.4 stGToken shares

Mint 阶段（前端调用）:
3. MySBT.userMint(bbStar, "{}")
   ├─ 验证 bbStar 是否注册 ✅
   ├─ 验证 bbStar 允许无权限铸造 ✅
   ├─ GTokenStaking.lockStake(user, 0.4 ether, "MySBT") ✅ (需要先修复配置)
   │  └─ 锁定用户的 0.4 stGToken shares
   └─ 铸造 SBT NFT for user
```

---

**修复状态**: 待 DAO 执行 `configureLocker` 交易
**优先级**: 🔴 高 - 阻止所有用户 mint SBT
