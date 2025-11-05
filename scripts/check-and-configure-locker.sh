#!/bin/bash
source .env

ACTUAL_STAKING="0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69"
MYSBT="0x73E635Fc9eD362b7061495372b6eDFF511D9E18F"

echo "=========================================="
echo "MySBT Locker 配置检查与修复"
echo "=========================================="
echo ""
echo "合约地址:"
echo "  MySBT:              $MYSBT"
echo "  GTokenStaking:      $ACTUAL_STAKING"
echo ""

# 1. Check GTokenStaking owner
echo "1. GTokenStaking Owner:"
OWNER=$(cast call $ACTUAL_STAKING "owner()(address)" --rpc-url $SEPOLIA_RPC_URL)
echo "   $OWNER"
echo ""

# 2. Check .env DEPLOYER
echo "2. .env 中的 DEPLOYER_ADDRESS:"
echo "   $DEPLOYER_ADDRESS"
echo ""

# 3. Check if MySBT is already configured as locker
echo "3. 检查 MySBT 当前的 locker 配置:"
LOCKER_CONFIG=$(cast call $ACTUAL_STAKING "getLockerConfig(address)" $MYSBT --rpc-url $SEPOLIA_RPC_URL)
echo "   原始数据: $(echo $LOCKER_CONFIG | cut -c1-66)..."

# Check first field (authorized)
FIRST_FIELD=$(echo $LOCKER_CONFIG | head -c 66)
if [ "$FIRST_FIELD" = "0x00000000000000000000000000000000000000000000000000000000000000" ]; then
    echo "   ❌ authorized = false (MySBT 未授权)"
    NEED_CONFIG=true
else
    echo "   ✅ authorized = true (MySBT 已授权)"
    NEED_CONFIG=false
fi
echo ""

# 4. Check if deployer == owner
if [ "$NEED_CONFIG" = true ]; then
    echo "4. 检查权限:"
    if [ "${DEPLOYER_ADDRESS,,}" = "${OWNER,,}" ]; then
        echo "   ✅ DEPLOYER ($DEPLOYER_ADDRESS) == Owner"
        echo "   ✅ 可以使用 DEPLOYER 配置 MySBT 为 locker"
        echo ""
        
        # Ask user to confirm
        echo "=========================================="
        echo "执行配置 MySBT 为 Authorized Locker"
        echo "=========================================="
        echo ""
        echo "将执行以下命令:"
        echo ""
        echo "cast send $ACTUAL_STAKING \\"
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
        echo "  --private-key \$DEPLOYER_PRIVATE_KEY"
        echo ""
        echo "参数说明:"
        echo "  authorized: true"
        echo "  feeRateBps: 100 (1% 退出费)"
        echo "  minExitFee: 0.01 ether"
        echo "  maxFeePercent: 500 (5% 上限)"
        echo "  timeTiers: [] (不使用时间分层)"
        echo "  tierFees: [] (不使用时间分层)"
        echo "  feeRecipient: address(0) (使用默认 treasury)"
        echo ""
        read -p "是否执行? (y/n): " CONFIRM
        
        if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
            echo ""
            echo "执行中..."
            cast send $ACTUAL_STAKING \
              'configureLocker(address,bool,uint256,uint256,uint256,uint256[],uint256[],address)' \
              $MYSBT \
              true \
              100 \
              10000000000000000 \
              500 \
              '[]' \
              '[]' \
              0x0000000000000000000000000000000000000000 \
              --rpc-url $SEPOLIA_RPC_URL \
              --private-key $DEPLOYER_PRIVATE_KEY
            
            echo ""
            echo "=========================================="
            echo "验证配置"
            echo "=========================================="
            sleep 3
            echo ""
            NEW_CONFIG=$(cast call $ACTUAL_STAKING "getLockerConfig(address)" $MYSBT --rpc-url $SEPOLIA_RPC_URL)
            FIRST_FIELD=$(echo $NEW_CONFIG | head -c 66)
            if [ "$FIRST_FIELD" != "0x00000000000000000000000000000000000000000000000000000000000000" ]; then
                echo "✅ MySBT 已成功配置为 authorized locker!"
            else
                echo "❌ 配置失败，请检查交易"
            fi
        else
            echo "已取消"
        fi
    else
        echo "   ❌ DEPLOYER ($DEPLOYER_ADDRESS) ≠ Owner ($OWNER)"
        echo "   ⚠️  无法使用 DEPLOYER 配置，需要使用 Owner 账户"
        echo ""
        echo "   请使用 Owner 账户 ($OWNER) 手动配置:"
        echo "   1. Etherscan: https://sepolia.etherscan.io/address/$ACTUAL_STAKING#writeContract"
        echo "   2. 连接 Owner 钱包"
        echo "   3. 调用 configureLocker(...)"
    fi
else
    echo "4. ✅ MySBT 已经是 authorized locker，无需配置"
fi

echo ""
