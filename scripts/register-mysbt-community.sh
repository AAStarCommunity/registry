#!/bin/bash

# Register MySBT as a Special Community in Registry v2.1.4
# This script helps the DAO Multisig register MySBT as a global community

source .env

REGISTRY="0xf384c592D5258c91805128291c5D4c069DD30CA6"
MYSBT="0x73E635Fc9eD362b7061495372b6eDFF511D9E18F"
DAO_MULTISIG="0x411BD567E46C0781248dbB6a9211891C032885e5"

echo "======================================"
echo "MySBT Global Community Registration"
echo "======================================"
echo ""
echo "Registry v2.1.4: $REGISTRY"
echo "MySBT Address:   $MYSBT"
echo "DAO Multisig:    $DAO_MULTISIG"
echo ""

# Check current status
echo "Checking MySBT registration status..."
IS_REGISTERED=$(cast call $REGISTRY "isRegisteredCommunity(address)(bool)" $MYSBT --rpc-url $SEPOLIA_RPC_URL)
echo "Is MySBT registered: $IS_REGISTERED"
echo ""

if [ "$IS_REGISTERED" = "true" ]; then
    echo "✅ MySBT is already registered as a community!"
    exit 0
fi

echo "❌ MySBT is NOT registered. Registration required."
echo ""

# Check DAO GToken balance
echo "Checking DAO GToken balance..."
GTOKEN="0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc"
BALANCE=$(cast call $GTOKEN "balanceOf(address)(uint256)" $DAO_MULTISIG --rpc-url $SEPOLIA_RPC_URL)
BALANCE_ETH=$(cast --to-unit $BALANCE ether)
echo "DAO GToken Balance: $BALANCE_ETH GT"
echo "Required: 30 GT"
echo ""

# Prepare registerCommunity calldata
# struct CommunityConfig {
#   string name;                      // "MySBT Global"
#   string ensName;                   // ""
#   address xPNTsToken;               // address(0) - no xPNTs needed
#   address[] supportedSBTs;          // []
#   NodeType nodeType;                // 0 (NORMAL)
#   address paymasterAddress;         // address(0)
#   address community;                // MySBT address
#   uint256 registeredAt;             // 0 (will be set by contract)
#   uint256 lastUpdatedAt;            // 0 (will be set by contract)
#   bool isActive;                    // true
#   bool allowPermissionlessMint;     // true
# }

echo "======================================"
echo "Registration Parameters"
echo "======================================"
echo "Community Name: MySBT Global"
echo "Community Address: $MYSBT"
echo "xPNTs Token: 0x0000000000000000000000000000000000000000 (none)"
echo "Paymaster: 0x0000000000000000000000000000000000000000 (none)"
echo "Node Type: 0 (NORMAL)"
echo "Is Active: true"
echo "Allow Permissionless Mint: true"
echo "Stake Amount: 30 GToken"
echo ""

echo "======================================"
echo "Method 1: Use Etherscan (Recommended)"
echo "======================================"
echo "1. Visit: https://sepolia.etherscan.io/address/$REGISTRY#writeContract"
echo "2. Connect wallet with DAO Multisig: $DAO_MULTISIG"
echo "3. Find function: registerCommunity"
echo "4. Fill in parameters:"
echo "   config:"
echo "     name: \"MySBT Global\""
echo "     ensName: \"\""
echo "     xPNTsToken: 0x0000000000000000000000000000000000000000"
echo "     supportedSBTs: []"
echo "     nodeType: 0"
echo "     paymasterAddress: 0x0000000000000000000000000000000000000000"
echo "     community: $MYSBT"
echo "     registeredAt: 0"
echo "     lastUpdatedAt: 0"
echo "     isActive: true"
echo "     allowPermissionlessMint: true"
echo "   stGTokenAmount: 30000000000000000000 (30 GT in wei)"
echo ""

echo "======================================"
echo "Method 2: Use Cast Command"
echo "======================================"
echo "# Approve GToken first (if not approved)"
echo "cast send $GTOKEN \\"
echo "  'approve(address,uint256)' \\"
echo "  $REGISTRY \\"
echo "  30000000000000000000 \\"
echo "  --rpc-url \$SEPOLIA_RPC_URL \\"
echo "  --private-key \$DAO_PRIVATE_KEY"
echo ""
echo "# Register MySBT community"
echo "cast send $REGISTRY \\"
echo "  'registerCommunity((string,string,address,address[],uint8,address,address,uint256,uint256,bool,bool),uint256)' \\"
echo "  '(\"MySBT Global\",\"\",0x0000000000000000000000000000000000000000,[],0,0x0000000000000000000000000000000000000000,$MYSBT,0,0,true,true)' \\"
echo "  30000000000000000000 \\"
echo "  --rpc-url \$SEPOLIA_RPC_URL \\"
echo "  --private-key \$DAO_PRIVATE_KEY"
echo ""

echo "======================================"
echo "Verification After Registration"
echo "======================================"
echo "cast call $REGISTRY \\"
echo "  'isRegisteredCommunity(address)(bool)' \\"
echo "  $MYSBT \\"
echo "  --rpc-url \$SEPOLIA_RPC_URL"
echo ""
echo "Expected result: true"
echo ""
