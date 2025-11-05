#!/bin/bash
# 更新 MySBT 合约的 Registry 地址

set -e

# 合约地址
MYSBT="0x73E635Fc9eD362b7061495372B6eDFF511D9E18F"
NEW_REGISTRY="0xf384c592D5258c91805128291c5D4c069DD30CA6"
RPC_URL="https://rpc.ankr.com/eth_sepolia"

echo "🔧 Checking MySBT Registry Configuration..."
echo ""

# 1. 检查当前 Registry 地址
echo "📍 Checking current Registry address..."
CURRENT_REGISTRY=$(cast call $MYSBT "REGISTRY()(address)" --rpc-url $RPC_URL)
echo "   Current Registry: $CURRENT_REGISTRY"
echo "   Target Registry:  $NEW_REGISTRY"
echo ""

if [ "${CURRENT_REGISTRY,,}" = "${NEW_REGISTRY,,}" ]; then
    echo "✅ Registry address is already correct!"
    exit 0
fi

echo "❌ Registry address MISMATCH detected!"
echo ""

# 2. 检查 DAO Multisig
echo "🔐 Checking authorization..."
DAO_MULTISIG=$(cast call $MYSBT "daoMultisig()(address)" --rpc-url $RPC_URL)
echo "   DAO Multisig: $DAO_MULTISIG"
echo ""

# 3. 提供修复方案
echo "📝 How to Fix:"
echo ""
echo "Option 1: Using cast (需要 DAO multisig 私钥):"
echo "  cast send $MYSBT \\"
echo "    'setRegistry(address)' \\"
echo "    $NEW_REGISTRY \\"
echo "    --rpc-url \$RPC_URL \\"
echo "    --private-key \$DAO_PRIVATE_KEY"
echo ""
echo "Option 2: Using Etherscan (推荐):"
echo "  1. 使用 DAO multisig 账户连接 MetaMask: $DAO_MULTISIG"
echo "  2. 访问: https://sepolia.etherscan.io/address/$MYSBT#writeContract"
echo "  3. 连接钱包"
echo "  4. 调用 setRegistry($NEW_REGISTRY)"
echo ""
echo "Option 3: 使用环境变量运行 (如果你有 .env 文件):"
echo "  source .env && cast send $MYSBT 'setRegistry(address)' $NEW_REGISTRY --rpc-url \$SEPOLIA_RPC_URL --private-key \$DAO_PRIVATE_KEY"

