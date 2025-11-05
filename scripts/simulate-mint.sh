#!/bin/bash

# Simulate MySBT userMint process to debug CommunityNotRegistered error
# This script traces the full transaction to identify where the error occurs

source .env

# Contract Addresses (from shared-config)
MYSBT="0x73E635Fc9eD362b7061495372B6eDFF511D9E18F"
REGISTRY="0xf384c592D5258c91805128291c5D4c069DD30CA6"
GTOKEN_STAKING="0x60Bd54645b0fDabA1114B701Df6f33C4ecE87fEa"
GTOKEN="0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc"
BBSTAR="0xe24b6f321B0140716a2b671ed0D983bb64E7DaFA"  # Community to join
USER_WALLET="0xF7Bf79AcB7F3702b9DbD397d8140ac9DE6Ce642C"  # User who wants to mint

echo "=========================================="
echo "MySBT Mint Simulation - Debug Analysis"
echo "=========================================="
echo ""
echo "Contracts:"
echo "  MySBT:          $MYSBT"
echo "  Registry:       $REGISTRY"
echo "  GTokenStaking:  $GTOKEN_STAKING"
echo "  GToken:         $GTOKEN"
echo "  bbStar:         $BBSTAR"
echo "  User:           $USER_WALLET"
echo ""

# Step 1: Verify MySBT's Registry address
echo "=========================================="
echo "Step 1: Verify MySBT's Registry Configuration"
echo "=========================================="
MYSBT_REGISTRY=$(cast call $MYSBT "REGISTRY()(address)" --rpc-url $SEPOLIA_RPC_URL)
echo "MySBT.REGISTRY():           $MYSBT_REGISTRY"
echo "Expected Registry:          $REGISTRY"
if [ "${MYSBT_REGISTRY,,}" = "${REGISTRY,,}" ]; then
  echo "✅ MySBT Registry is correct"
else
  echo "❌ MySBT Registry MISMATCH!"
  exit 1
fi
echo ""

# Step 2: Check bbStar registration
echo "=========================================="
echo "Step 2: Verify bbStar Community Registration"
echo "=========================================="
BBSTAR_REGISTERED=$(cast call $REGISTRY "isRegisteredCommunity(address)(bool)" $BBSTAR --rpc-url $SEPOLIA_RPC_URL)
echo "Registry.isRegisteredCommunity(bbStar): $BBSTAR_REGISTERED"
if [ "$BBSTAR_REGISTERED" = "true" ]; then
  echo "✅ bbStar is registered"
else
  echo "❌ bbStar is NOT registered!"
  exit 1
fi

BBSTAR_PERMISSIONLESS=$(cast call $REGISTRY "isPermissionlessMintAllowed(address)(bool)" $BBSTAR --rpc-url $SEPOLIA_RPC_URL)
echo "Registry.isPermissionlessMintAllowed(bbStar): $BBSTAR_PERMISSIONLESS"
if [ "$BBSTAR_PERMISSIONLESS" = "true" ]; then
  echo "✅ bbStar allows permissionless mint"
else
  echo "❌ bbStar does NOT allow permissionless mint!"
  exit 1
fi
echo ""

# Step 3: Check MySBT registration (User's hypothesis)
echo "=========================================="
echo "Step 3: Check MySBT Registration (User Hypothesis)"
echo "=========================================="
MYSBT_REGISTERED=$(cast call $REGISTRY "isRegisteredCommunity(address)(bool)" $MYSBT --rpc-url $SEPOLIA_RPC_URL)
echo "Registry.isRegisteredCommunity(MySBT): $MYSBT_REGISTERED"
if [ "$MYSBT_REGISTERED" = "true" ]; then
  echo "✅ MySBT is registered as a community"
else
  echo "❌ MySBT is NOT registered as a community!"
  echo "   This might be the issue if GTokenStaking.lockStake() checks caller registration"
fi
echo ""

# Step 4: Check GTokenStaking.REGISTRY
echo "=========================================="
echo "Step 4: Check GTokenStaking Configuration"
echo "=========================================="
# Try to get GTokenStaking's Registry address
GTOKEN_STAKING_REGISTRY=$(cast call $GTOKEN_STAKING "REGISTRY()(address)" --rpc-url $SEPOLIA_RPC_URL 2>/dev/null || echo "N/A")
echo "GTokenStaking.REGISTRY(): $GTOKEN_STAKING_REGISTRY"
if [ "$GTOKEN_STAKING_REGISTRY" != "N/A" ]; then
  if [ "${GTOKEN_STAKING_REGISTRY,,}" = "${REGISTRY,,}" ]; then
    echo "✅ GTokenStaking uses same Registry"
  else
    echo "⚠️  GTokenStaking uses different Registry!"
    echo "   GTokenStaking Registry: $GTOKEN_STAKING_REGISTRY"
    echo "   MySBT Registry:         $REGISTRY"
  fi
else
  echo "ℹ️  GTokenStaking.REGISTRY() function not found (contract may not have public getter)"
fi
echo ""

# Step 5: Simulate userMint call with --trace
echo "=========================================="
echo "Step 5: Simulate userMint Call with Trace"
echo "=========================================="
echo "Calling: MySBT.userMint(bbStar, '{}')"
echo ""
echo "🔍 Attempting simulation (will show detailed trace if it fails)..."
echo ""

# Use cast call to simulate (no actual transaction)
# --trace flag will show the call trace on error
cast call $MYSBT \
  "userMint(address,string)(uint256,bool)" \
  $BBSTAR \
  "{}" \
  --rpc-url $SEPOLIA_RPC_URL \
  --trace \
  2>&1 || true

echo ""
echo "=========================================="
echo "Analysis Complete"
echo "=========================================="
echo ""
echo "If you see 'CommunityNotRegistered(0x73E635Fc...)' error above,"
echo "check the trace to identify which contract function threw it."
echo ""
echo "Common sources:"
echo "  1. Registry.getCommunityProfile() - checks if registeredAt != 0"
echo "  2. MySBT._isValidCommunity() - checks bbStar (but this returns bool, doesn't throw)"
echo "  3. GTokenStaking.lockStake() - might check if caller (MySBT) is registered"
echo ""
