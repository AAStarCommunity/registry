# MySBT 社区注册问题修复指南

## 问题分析

用户尝试铸造 SBT 时遇到错误：
```
execution reverted (unknown custom error)
data: "0x04d9554400000000000000000000000073e635fc9ed362b7061495372b6edff511d9e18f"
```

### 错误解析

- **错误选择器**: `0x04d95544` → `CommunityNotRegistered(address)`
- **错误参数地址**: `0x73e635fc9ed362b7061495372b6edff511d9e18f` → **MySBT 合约地址本身**

### 关键发现

错误参数不是社区地址（`0xe24b6f321B0140716a2b671ed0D983bb64E7DaFA` bbStar），而是 **MySBT 合约本身的地址**！

这意味着 **MySBT 合约需要在 Registry v2.1.4 中注册为一个"社区"**。

### 完整链上验证结果 (2025-01-05)

```bash
# 1. ✅ 验证 MySBT 指向的 Registry 地址
cast call 0x73E635Fc9eD362b7061495372b6eDFF511D9E18F \
  "REGISTRY()(address)" \
  --rpc-url $SEPOLIA_RPC_URL
# 结果: 0xf384c592D5258c91805128291c5D4c069DD30CA6 ✅ (正确指向新 Registry v2.1.4)

# 2. ✅ 验证 bbStar 在新 Registry 中已注册
cast call 0xf384c592D5258c91805128291c5D4c069DD30CA6 \
  "isRegisteredCommunity(address)(bool)" \
  0xe24b6f321B0140716a2b671ed0D983bb64E7DaFA \
  --rpc-url $SEPOLIA_RPC_URL
# 结果: true ✅ (bbStar 已正确注册)

# 3. ✅ 验证 bbStar 允许无权限铸造
cast call 0xf384c592D5258c91805128291c5D4c069DD30CA6 \
  "isPermissionlessMintAllowed(address)(bool)" \
  0xe24b6f321B0140716a2b671ed0D983bb64E7DaFA \
  --rpc-url $SEPOLIA_RPC_URL
# 结果: true ✅ (bbStar 允许无权限铸造)

# 4. ❌ 关键发现：MySBT 本身未在 Registry 中注册
cast call 0xf384c592D5258c91805128291c5D4c069DD30CA6 \
  "isRegisteredCommunity(address)(bool)" \
  0x73E635Fc9eD362b7061495372b6eDFF511D9E18F \
  --rpc-url $SEPOLIA_RPC_URL
# 结果: false ❌ (这是问题根源！)
```

### 根本原因确认

根据源代码分析（MySBT_v2.4.0.sol）和链上验证：

1. **MySBT.userMint()** 在首次铸造时会将 **MySBT 合约本身** 作为"全局社区"或"默认社区"
2. 这种设计允许用户首次铸造 SBT 时有一个初始归属，之后再加入具体社区（如 bbStar）
3. **旧 Registry 中可能已注册 MySBT 作为特殊社区**
4. **新 Registry v2.1.4 部署后未迁移此配置** → 导致错误

## 修复方案（推荐：立即执行）

### 在 Registry v2.1.4 中注册 MySBT 为全局社区

这是旧系统的预期设计，新 Registry 部署后遗漏了此配置。

#### 执行要求
- **执行账户**: DAO Multisig (`0x411BD567E46C0781248dbB6a9211891C032885e5`)
- **GToken 质押**: 30 GToken
- **合约**: Registry v2.1.4 (`0xf384c592D5258c91805128291c5D4c069DD30CA6`)

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

**相关合约地址：**
- MySBT: `0x73E635Fc9eD362b7061495372B6eDFF511D9E18F`
- Registry v2.1.4: `0xf384c592D5258c91805128291c5D4c069DD30CA6`
- DAO Multisig: `0x411BD567E46C0781248dbB6a9211891C032885e5`
- bbStar 社区: `0xe24b6f321B0140716a2b671ed0D983bb64E7DaFA`
