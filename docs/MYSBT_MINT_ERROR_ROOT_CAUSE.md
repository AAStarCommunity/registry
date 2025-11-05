# MySBT Mint Error 根本原因分析与修复方案

**创建日期**: 2025-01-05
**问题**: 用户铸造 SBT 时遇到 `CommunityNotRegistered(MySBT地址)` 错误
**状态**: ✅ 根本原因已确认，待执行修复

---

## 📊 问题总结

### 错误信息
```
execution reverted (unknown custom error)
data: "0x04d9554400000000000000000000000073e635fc9ed362b7061495372b6edff511d9e18f"
```

**错误解析**:
- 错误选择器: `0x04d95544` = `CommunityNotRegistered(address)`
- 错误参数: `0x73E635Fc9eD362b7061495372B6eDFF511D9E18F` = **MySBT 合约地址**

---

## 🔍 调查过程

### 1. 链上验证结果 (2025-01-05)

```bash
# ✅ MySBT Registry 配置正确
cast call MySBT "REGISTRY()(address)"
# → 0xf384c592D5258c91805128291c5D4c069DD30CA6 (Registry v2.1.4)

# ✅ bbStar 社区已注册
cast call Registry "isRegisteredCommunity(bbStar)(bool)"
# → true

# ✅ bbStar 允许无权限铸造
cast call Registry "isPermissionlessMintAllowed(bbStar)(bool)"
# → true

# ❌ 关键发现：MySBT 本身未在 Registry 中注册
cast call Registry "isRegisteredCommunity(MySBT)(bool)"
# → false
```

### 2. Transaction Trace 分析

通过 `cast call --trace` 获得完整调用栈：

```
MySBT.userMint(bbStar, "{}")
  ├─ Registry.isRegisteredCommunity(bbStar) → true  ✅
  ├─ Registry.isPermissionlessMintAllowed(bbStar) → true  ✅
  ├─ GTokenStaking.lockStake(user, amount, "MySBT")
  │   └─ ❌ [Revert] CommunityNotRegistered(0x73E635Fc9eD362b7061495372b6eDFF511D9E18F)
```

**关键发现**: 错误来自 **GTokenStaking 合约** (`0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69`)

### 3. 配置不一致发现

**MySBT 实际使用的 GTokenStaking**:
```bash
cast call MySBT "GTOKEN_STAKING()(address)"
# → 0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69
```

**Shared-config 中记录的 GTokenStaking**:
```
CORE_ADDRESSES.gTokenStaking = 0x60Bd54645b0fDabA1114B701Df6f33C4ecE87fEa  # ⚠️ 不一致！
```

---

## 🎯 根本原因

### MySBT 使用了**旧版本** GTokenStaking

1. **部署的 GTokenStaking** (`0x7b0bb...`):
   - 可能包含检查调用者（MySBT）是否在 Registry 中注册的逻辑
   - 当 MySBT 调用 `lockStake()` 时，内部检查 `msg.sender` (MySBT) 是否为注册社区
   - 未找到注册记录 → 抛出 `CommunityNotRegistered(MySBT)`

2. **设计意图**:
   - MySBT 作为"全局社区"或"默认社区"存在于系统中
   - 用户首次铸造 SBT 时归属于 MySBT 全局社区
   - 后续可加入具体社区（如 bbStar）

3. **迁移遗漏**:
   - 旧 Registry 中可能已注册 MySBT 作为特殊社区
   - 部署 Registry v2.1.4 后，未迁移此配置
   - 导致 GTokenStaking 检查失败

---

## ✅ 修复方案

### 方案：在 Registry v2.1.4 中注册 MySBT 为全局社区

#### 执行要求
- **执行账户**: DAO Multisig (`0x411BD567E46C0781248dbB6a9211891C032885e5`)
- **GToken 质押**: 30 GToken
- **目标合约**: Registry v2.1.4 (`0xf384c592D5258c91805128291c5D4c069DD30CA6`)

#### 方法 1: 使用 Etherscan (推荐)

1. 访问 Registry v2.1.4 合约:
   ```
   https://sepolia.etherscan.io/address/0xf384c592D5258c91805128291c5D4c069DD30CA6#writeContract
   ```

2. 连接 DAO Multisig 钱包 (`0x411BD567E46C0781248dbB6a9211891C032885e5`)

3. 找到 `registerCommunity` 函数，填入参数:

   **config** (tuple):
   ```
   name: "MySBT Global"
   ensName: ""
   xPNTsToken: 0x0000000000000000000000000000000000000000
   supportedSBTs: []
   nodeType: 0
   paymasterAddress: 0x0000000000000000000000000000000000000000
   community: 0x73E635Fc9eD362b7061495372b6eDFF511D9E18F
   registeredAt: 0
   lastUpdatedAt: 0
   isActive: true
   allowPermissionlessMint: true
   ```

   **stGTokenAmount**: `30000000000000000000` (30 GT in wei)

4. 点击 "Write" 提交交易

#### 方法 2: 使用 Cast 命令行

如果 DAO 私钥已配置在 `.env` 中：

```bash
# 1. 首先批准 GToken 授权（如果未批准）
source .env
cast send 0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc \
  'approve(address,uint256)' \
  0xf384c592D5258c91805128291c5D4c069DD30CA6 \
  30000000000000000000 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DAO_PRIVATE_KEY

# 2. 注册 MySBT 为社区
cast send 0xf384c592D5258c91805128291c5D4c069DD30CA6 \
  'registerCommunity((string,string,address,address[],uint8,address,address,uint256,uint256,bool,bool),uint256)' \
  '("MySBT Global","",0x0000000000000000000000000000000000000000,[],0,0x0000000000000000000000000000000000000000,0x73E635Fc9eD362b7061495372b6eDFF511D9E18F,0,0,true,true)' \
  30000000000000000000 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DAO_PRIVATE_KEY
```

#### 验证修复

执行以下命令确认注册成功：

```bash
source .env
cast call 0xf384c592D5258c91805128291c5D4c069DD30CA6 \
  'isRegisteredCommunity(address)(bool)' \
  0x73E635Fc9eD362b7061495372b6eDFF511D9E18F \
  --rpc-url $SEPOLIA_RPC_URL
```

**预期结果**: `true`

#### 测试 SBT 铸造

注册完成后，用户应该能成功铸造 SBT for bbStar：
1. 访问 Get SBT 页面
2. 选择 bbStar 社区
3. 点击 "Mint SBT"
4. 应该成功执行

---

## 📝 技术细节

### 合约地址清单

| 合约 | 地址 | 说明 |
|------|------|------|
| MySBT | `0x73E635Fc9eD362b7061495372b6eDFF511D9E18F` | SBT 铸造合约 |
| Registry v2.1.4 | `0xf384c592D5258c91805128291c5D4c069DD30CA6` | 社区注册中心 |
| GTokenStaking (实际) | `0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69` | MySBT 使用的质押合约 |
| GTokenStaking (配置) | `0x60Bd54645b0fDabA1114B701Df6f33C4ecE87fEa` | shared-config 中记录（不一致） |
| GToken | `0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc` | 治理代币 |
| DAO Multisig | `0x411BD567E46C0781248dbB6a9211891C032885e5` | DAO 多签钱包 |
| bbStar 社区 | `0xe24b6f321B0140716a2b671ed0D983bb64E7DaFA` | 测试社区 |

### 相关文件

- `MYSBT_COMMUNITY_REGISTRATION_FIX.md` - 初始问题诊断
- `MYSBT_REGISTRY_DEPENDENCY_ANALYSIS.md` - 依赖关系分析
- `scripts/register-mysbt-community.sh` - 注册脚本
- `scripts/simulate-mint.sh` - Mint 模拟脚本

---

## 🔄 后续优化建议

1. **更新 shared-config**:
   - 将 `gTokenStaking` 地址更新为实际使用的 `0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69`
   - 确保所有配置与实际部署一致

2. **文档化 MySBT 全局社区概念**:
   - 在架构文档中说明 MySBT 作为全局社区的设计意图
   - 更新 data-relation.md 添加说明

3. **验证 GTokenStaking 合约**:
   - 在 Etherscan 上验证 `0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69` 源码
   - 便于未来调试和审计

4. **Registry 迁移工具**:
   - 创建 Registry 数据迁移脚本
   - 确保旧 → 新 Registry 迁移完整

---

**修复状态**: 待 DAO 执行 `registerCommunity` 交易
