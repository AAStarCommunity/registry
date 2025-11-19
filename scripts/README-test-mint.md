# MySBT Mint Test Script

测试脚本用于诊断批量mint功能失败的原因。

## 环境变量配置

在 `.env` 文件中添加以下变量：

```bash
# Sepolia RPC URL
VITE_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Community owner private key (用于测试的社区owner私钥)
COMMUNITY_OWNER_PRIVATE_KEY=0x...

# Optional: 目标地址 (如果不设置，默认使用 0x57b2e6f08399c276b2c1595825219d29990d0921)
TEST_TARGET_ADDRESS=0x57b2e6f08399c276b2c1595825219d29990d0921
```

## 运行测试

```bash
npm run test:mint
```

或者直接运行：

```bash
node scripts/test-mint.js
```

## 测试步骤

脚本会依次执行以下检查：

1. ✅ 验证社区是否在Registry中注册
2. ✅ 检查owner的GToken余额
3. ✅ 检查目标地址的SBT余额（是否已经mint过）
4. ✅ 检查目标地址的GToken余额（是否满足0.4 GT要求）
5. ✅ 尝试估算gas（会暴露合约revert原因）
6. ✅ 执行mint交易

## 可能的失败原因

如果gas估算失败，可能是因为：

1. **目标地址已有SBT** - MySBT可能不允许重复mint
2. **社区未注册** - 需要先在Registry中注册
3. **GToken不足** - 目标地址需要至少0.4 GT
4. **权限问题** - 调用者不是注册的社区owner
5. **合约限制** - 合约可能有其他业务逻辑限制

## 添加到package.json

在 `package.json` 的 `scripts` 中添加：

```json
{
  "scripts": {
    "test:mint": "node scripts/test-mint.js"
  }
}
```
