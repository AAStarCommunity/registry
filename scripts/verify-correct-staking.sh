#!/bin/bash
source .env

CORRECT_STAKING="0x60Bd54645b0fDabA1114B701Df6f33C4ecE87fEa"
WRONG_STAKING="0x7b0bb7D5a5bf7A5839A6e6B53bDD639865507A69"
MYSBT="0x73E635Fc9eD362b7061495372b6eDFF511D9E18F"

echo "=========================================="
echo "验证正确的 GTokenStaking 配置"
echo "=========================================="
echo ""
echo "shared-config GTokenStaking: $CORRECT_STAKING"
echo "MySBT 当前使用的:            $WRONG_STAKING"
echo "MySBT:                       $MYSBT"
echo ""

# 1. Check what MySBT actually uses
echo "1. 检查 MySBT.GTOKEN_STAKING():"
MYSBT_STAKING=$(cast call $MYSBT "GTOKEN_STAKING()(address)" --rpc-url $SEPOLIA_RPC_URL)
echo "   $MYSBT_STAKING"
echo ""

if [ "${MYSBT_STAKING,,}" = "${CORRECT_STAKING,,}" ]; then
    echo "   ✅ MySBT 使用的是 shared-config 中的正确地址"
else
    echo "   ❌ MySBT 使用的是错误的地址！"
    echo "   期望: $CORRECT_STAKING"
    echo "   实际: $MYSBT_STAKING"
fi
echo ""

# 2. Check correct staking owner
echo "2. 检查正确 GTokenStaking ($CORRECT_STAKING) 的 owner:"
CORRECT_OWNER=$(cast call $CORRECT_STAKING "owner()(address)" --rpc-url $SEPOLIA_RPC_URL)
echo "   $CORRECT_OWNER"
echo ""

# 3. Check MySBT locker config in CORRECT staking
echo "3. 检查 MySBT 在正确 GTokenStaking 中的配置:"
CORRECT_CONFIG=$(cast call $CORRECT_STAKING "getLockerConfig(address)" $MYSBT --rpc-url $SEPOLIA_RPC_URL)
echo "   原始数据前66字符: $(echo $CORRECT_CONFIG | cut -c1-66)"
AUTHORIZED_FIELD=$(echo $CORRECT_CONFIG | cut -c67-130)
echo "   authorized 字段: $AUTHORIZED_FIELD"
if [ "$AUTHORIZED_FIELD" = "0000000000000000000000000000000000000000000000000000000000000000" ]; then
    echo "   ❌ authorized = false (未授权)"
    NEED_CONFIG_CORRECT=true
else
    echo "   ✅ authorized = true (已授权)"
    NEED_CONFIG_CORRECT=false
fi
echo ""

# 4. Check MySBT locker config in WRONG staking (for comparison)
echo "4. 检查 MySBT 在旧 GTokenStaking ($WRONG_STAKING) 中的配置:"
WRONG_CONFIG=$(cast call $WRONG_STAKING "getLockerConfig(address)" $MYSBT --rpc-url $SEPOLIA_RPC_URL)
echo "   原始数据前66字符: $(echo $WRONG_CONFIG | cut -c1-66)"
WRONG_AUTHORIZED=$(echo $WRONG_CONFIG | cut -c67-130)
echo "   authorized 字段: $WRONG_AUTHORIZED"
if [ "$WRONG_AUTHORIZED" = "0000000000000000000000000000000000000000000000000000000000000000" ]; then
    echo "   ❌ authorized = false (未授权)"
else
    echo "   ✅ authorized = true (已授权)"
fi
echo ""

echo "=========================================="
echo "分析结果"
echo "=========================================="
echo ""

if [ "${MYSBT_STAKING,,}" != "${CORRECT_STAKING,,}" ]; then
    echo "❌ 问题 1: MySBT 使用了错误的 GTokenStaking 地址"
    echo ""
    echo "   MySBT 是不可升级合约，GTOKEN_STAKING 是 immutable 变量"
    echo "   无法更改 MySBT 中的地址！"
    echo ""
    echo "   有两个选择:"
    echo "   A. 在 MySBT 当前使用的 GTokenStaking ($MYSBT_STAKING) 中配置 locker"
    echo "   B. 重新部署 MySBT，使用正确的 GTokenStaking 地址"
    echo ""
fi

if [ "$NEED_CONFIG_CORRECT" = true ]; then
    echo "❌ 问题 2: MySBT 在正确的 GTokenStaking 中未授权"
    echo ""
    echo "   即使 MySBT 使用了错误地址，为了将来可能的迁移，"
    echo "   建议也在正确的 GTokenStaking 中配置 MySBT 为 locker"
    echo ""
fi
