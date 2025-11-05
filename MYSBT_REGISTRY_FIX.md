# MySBT Registry 地址修复指南

## 问题
MySBT 合约使用旧的 Registry 地址，导致无法识别新注册的社区。

## 当前状态
- **MySBT 地址**: `0x73E635Fc9eD362b7061495372B6eDFF511D9E18F`
- **当前 Registry**: `0x787409E0510edc750d6cAd58792D01B9e3f52714` ❌ (旧)
- **目标 Registry**: `0xf384c592D5258c91805128291c5D4c069DD30CA6` ✅ (v2.1.4)
- **DAO Multisig**: `0x411BD567E46C0781248dbB6a9211891C032885e5` 🔐

## 修复方法

### 方法 1: Etherscan (推荐 - 最简单)

1. 使用 **DAO Multisig 账户** (`0x411BD567E46C0781248dbB6a9211891C032885e5`) 连接 MetaMask

2. 访问 MySBT 合约:
   https://sepolia.etherscan.io/address/0x73E635Fc9eD362b7061495372B6eDFF511D9E18F#writeContract

3. 点击 "Connect to Web3" 连接钱包

4. 找到 **setRegistry** 函数

5. 输入参数:
   ```
   registry (address): 0xf384c592D5258c91805128291c5D4c069DD30CA6
   ```

6. 点击 "Write" 并确认交易

### 方法 2: 使用 cast 命令 (需要私钥)

```bash
# 从 .env 加载环境变量
source .env

# 执行更新
cast send 0x73E635Fc9eD362b7061495372B6eDFF511D9E18F \
  'setRegistry(address)' \
  0xf384c592D5258c91805128291c5D4c069DD30CA6 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DAO_PRIVATE_KEY
```

### 方法 3: 快速一键修复 (如果有 .env 配置)

```bash
# 确保 .env 中有以下变量:
# SEPOLIA_RPC_URL=你的RPC地址
# DAO_PRIVATE_KEY=DAO multisig 私钥

bash scripts/fix-mysbt-registry.sh --execute
```

## 验证修复

修复后运行以下命令验证:

```bash
cast call 0x73E635Fc9eD362b7061495372B6eDFF511D9E18F \
  'REGISTRY()(address)' \
  --rpc-url $SEPOLIA_RPC_URL
```

预期输出: `0xf384c592D5258c91805128291c5D4c069DD30CA6`

## 修复后

修复完成后，用户就可以正常铸造 SBT 了。

