#!/bin/bash

# 配置 MySBT 为 GTokenStaking 授权的 Locker
# 这是修复 "UnauthorizedLocker" 错误的必要步骤

source .env

GTOKEN_STAKING="0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69"
MYSBT="0x73E635Fc9eD362b7061495372b6eDFF511D9E18F"
DAO_MULTISIG="0x411BD567E46C0781248dbB6a9211891C032885e5"

echo "========================================"
echo "配置 MySBT 为 GTokenStaking Authorized Locker"
echo "========================================"
echo ""
echo "GTokenStaking: $GTOKEN_STAKING"
echo "MySBT:         $MYSBT"
echo "DAO Multisig:  $DAO_MULTISIG"
echo ""

# 检查当前配置
echo "检查当前 MySBT locker 配置..."
CURRENT_CONFIG=$(cast call $GTOKEN_STAKING "getLockerConfig(address)" $MYSBT --rpc-url $SEPOLIA_RPC_URL 2>&1)
echo "当前配置（原始数据）:"
echo "$CURRENT_CONFIG" | head -1
echo ""

# 检查第一个字段（authorized）是否为 true
if echo "$CURRENT_CONFIG" | grep -q "^0x00000000000000000000000000000000000000000000000000000000000000000000"; then
    echo "❌ MySBT 当前未被授权 (authorized = false)"
else
    echo "✅ MySBT 已被授权"
    exit 0
fi

echo ""
echo "========================================"
echo "修复方案"
echo "========================================"
echo ""

echo "需要 DAO Multisig ($DAO_MULTISIG) 调用："
echo ""
echo "方法 1: 使用 Etherscan (推荐)"
echo "------------------------------------"
echo "1. 访问: https://sepolia.etherscan.io/address/$GTOKEN_STAKING#writeContract"
echo "2. 连接 DAO Multisig 钱包"
echo "3. 找到 'configureLocker' 函数"
echo "4. 填入参数:"
echo ""
echo "   locker: $MYSBT"
echo "   authorized: true"
echo "   feeRateBps: 100                    // 1% exit fee (100 basis points)"
echo "   minExitFee: 10000000000000000      // 0.01 ether (防止dust攻击)"
echo "   maxFeePercent: 500                 // 5% max fee cap"
echo "   timeTiers: []                      // 空数组（不使用时间分层费率）"
echo "   tierFees: []                       // 空数组"
echo "   feeRecipient: 0x0000000000000000000000000000000000000000  // 使用默认 treasury"
echo ""
echo "5. 点击 'Write' 提交交易"
echo ""

echo "方法 2: 使用 Cast 命令行"
echo "------------------------------------"
echo "如果 DAO 私钥已配置在 .env 中："
echo ""
echo "cast send $GTOKEN_STAKING \\"
echo "  'configureLocker(address,bool,uint256,uint256,uint256,uint256[],uint256[],address)' \\"
echo "  $MYSBT \\"
echo "  true \\"
echo "  100 \\"
echo "  10000000000000000 \\"
echo "  500 \\"
echo "  '[]' \\"
echo "  '[]' \\"
echo "  0x0000000000000000000000000000000000000000 \\"
echo "  --rpc-url \$SEPOLIA_RPC_URL \\"
echo "  --private-key \$DAO_PRIVATE_KEY"
echo ""

echo "========================================"
echo "验证修复"
echo "========================================"
echo ""
echo "执行以下命令确认配置成功："
echo ""
echo "cast call $GTOKEN_STAKING \\"
echo "  'getLockerConfig(address)' \\"
echo "  $MYSBT \\"
echo "  --rpc-url \$SEPOLIA_RPC_URL"
echo ""
echo "预期结果: 第一个字段（authorized）应该为 true（非0值）"
echo ""

echo "========================================"
echo "完整修复流程"
echo "========================================"
echo ""
echo "1. ✅ 已完成：MySBT.REGISTRY 更新为 Registry v2.1.4"
echo "2. 🔄 待执行：配置 MySBT 为 GTokenStaking authorized locker (本步骤)"
echo "3. ⏳ 之后：用户需要先质押 GT 到 GTokenStaking"
echo "4. ⏳ 最后：用户才能成功 mint SBT"
echo ""
