#!/bin/bash
# 修复 MySBT Registry 地址

source .env

MYSBT="0x73E635Fc9eD362b7061495372B6eDFF511D9E18F"
NEW_REGISTRY="0xf384c592D5258c91805128291c5D4c069DD30CA6"

echo "🔧 MySBT Registry 修复工具"
echo "========================================="
echo ""
echo "合约地址:"
echo "  MySBT:        $MYSBT"
echo "  New Registry: $NEW_REGISTRY"
echo ""

# 使用 .env 中的 RPC
RPC="${SEPOLIA_RPC_URL:-https://eth-sepolia.g.alchemy.com/v2/demo}"

echo "📍 检查当前配置..."
CURRENT=$(cast call $MYSBT "REGISTRY()(address)" --rpc-url "$RPC" 2>&1)

if echo "$CURRENT" | grep -q "Error"; then
    echo "❌ RPC 调用失败，请使用以下命令手动检查:"
    echo ""
    echo "cast call $MYSBT 'REGISTRY()(address)' --rpc-url YOUR_RPC_URL"
    echo ""
else
    echo "  当前 Registry: $CURRENT"
    echo ""
    
    if [ "${CURRENT,,}" = "${NEW_REGISTRY,,}" ]; then
        echo "✅ Registry 地址已经正确！"
        exit 0
    fi
    
    echo "❌ 地址不匹配！需要更新"
fi

echo ""
echo "🔐 检查权限..."
DAO=$(cast call $MYSBT "daoMultisig()(address)" --rpc-url "$RPC" 2>&1)
if echo "$DAO" | grep -q "Error"; then
    echo "⚠️  无法获取 DAO 地址"
else
    echo "  DAO Multisig: $DAO"
fi

echo ""
echo "📝 修复方法:"
echo ""
echo "方法 1: 使用 Etherscan (最简单):"
echo "  1. 访问: https://sepolia.etherscan.io/address/$MYSBT#writeContract"
echo "  2. 使用 DAO multisig 连接钱包"
echo "  3. 调用 setRegistry() 函数"
echo "  4. 输入参数: $NEW_REGISTRY"
echo ""
echo "方法 2: 使用 cast (需要私钥):"
echo "  cast send $MYSBT \\"
echo "    'setRegistry(address)' \\"
echo "    $NEW_REGISTRY \\"
echo "    --rpc-url \$YOUR_RPC_URL \\"
echo "    --private-key \$DAO_PRIVATE_KEY"

