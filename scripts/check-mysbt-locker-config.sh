#!/bin/bash
source .env

GTOKEN_STAKING="0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69"
MYSBT="0x73E635Fc9eD362b7061495372b6eDFF511D9E18F"

echo "========================================"
echo "检查 MySBT 在 GTokenStaking 中的 Locker 配置"
echo "========================================"
echo ""
echo "GTokenStaking: $GTOKEN_STAKING"
echo "MySBT:         $MYSBT"
echo ""

# 检查 GTokenStaking owner
echo "1. 检查 GTokenStaking owner..."
OWNER=$(cast call $GTOKEN_STAKING "owner()(address)" --rpc-url $SEPOLIA_RPC_URL 2>&1)
if [ $? -eq 0 ]; then
    echo "   GTokenStaking Owner: $OWNER"
else
    echo "   ❌ 无法获取 owner: $OWNER"
fi
echo ""

# 尝试直接读取 authorized 字段（使用 storage slot）
echo "2. 检查 MySBT 是否被授权为 locker..."
echo "   尝试调用 getLockerConfig()..."
cast call $GTOKEN_STAKING \
  "getLockerConfig(address)" \
  $MYSBT \
  --rpc-url $SEPOLIA_RPC_URL \
  2>&1 || echo "   ⚠️  getLockerConfig() 调用失败"

echo ""
echo "========================================"
echo "修复方案"
echo "========================================"
echo "需要 GTokenStaking owner ($OWNER) 调用："
echo ""
echo "  configureLocker("
echo "    locker: $MYSBT,"
echo "    authorized: true,"
echo "    feeRateBps: 100,          // 1% exit fee"
echo "    minExitFee: 10000000000000000,  // 0.01 ether"
echo "    maxFeePercent: 500,       // 5% max"
echo "    timeTiers: [],"
echo "    tierFees: [],"
echo "    feeRecipient: 0x0000000000000000000000000000000000000000  // use treasury"
echo "  )"
echo ""
