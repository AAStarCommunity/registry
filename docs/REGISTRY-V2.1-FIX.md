# Registry v2.1 Registration Fix

## 🔍 Root Cause Identified

**Problem**: `registerCommunity()` fails with "missing revert data"

**Root Cause**: Registry v2.1 is **not authorized** as a "locker" in GTokenStaking contract.

### Technical Details

When users register to Registry v2.1, the contract calls:

```solidity
GTOKEN_STAKING.lockStake(
    msg.sender,
    stGTokenAmount,
    "Registry community registration"
);
```

This requires Registry v2.1 to be an authorized locker, otherwise `lockStake()` reverts with:

```solidity
revert UnauthorizedLocker(msg.sender);
```

### Verification

```bash
# Check current status
cast call 0x199402b3F213A233e89585957F86A07ED1e1cD67 \
  "getLockerConfig(address)((bool,uint256,uint256[],uint256[],address))" \
  0x3F7E822C7FD54dBF8df29C6EC48E08Ce8AcEBeb3 \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N

# Result: (false, 0, [], [], 0x000...)
#          ^^^^^ authorized = FALSE ❌
```

## ✅ Solution

As the owner of GTokenStaking (`0x411BD567...`), you need to call `configureLocker()` to authorize Registry v2.1.

### Method 1: Using Cast (Recommended)

```bash
cast send 0x199402b3F213A233e89585957F86A07ED1e1cD67 \
  "configureLocker(address,bool,uint256,uint256[],uint256[],address)" \
  0x3F7E822C7FD54dBF8df29C6EC48E08Ce8AcEBeb3 \
  true \
  0 \
  "[]" \
  "[]" \
  0x0000000000000000000000000000000000000000 \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N \
  --private-key $PRIVATE_KEY
```

**Parameters Explained**:
- `0x3F7E822C7FD54dBF8df29C6EC48E08Ce8AcEBeb3`: Registry v2.1 address
- `true`: authorized = true
- `0`: baseExitFee = 0 (no exit fee for registry unlock)
- `[]`: timeTiers = empty (no time-based fees)
- `[]`: tierFees = empty (no tier fees)
- `0x000...`: feeRecipient = zero address (not applicable)

### Method 2: Using Etherscan (No CLI required)

1. Go to GTokenStaking on Sepolia Etherscan:
   https://sepolia.etherscan.io/address/0x199402b3F213A233e89585957F86A07ED1e1cD67#writeContract

2. Connect your wallet (0x411BD567...)

3. Find `configureLocker` function

4. Fill in parameters:
   - `locker`: `0x3F7E822C7FD54dBF8df29C6EC48E08Ce8AcEBeb3`
   - `authorized`: `true`
   - `baseExitFee`: `0`
   - `timeTiers`: `[]`
   - `tierFees`: `[]`
   - `feeRecipient`: `0x0000000000000000000000000000000000000000`

5. Click "Write" and confirm transaction

### Method 3: Using JavaScript (see `authorize-registry-locker.mjs`)

```bash
node authorize-registry-locker.mjs
```

## 📊 After Authorization

Verify the configuration:

```bash
cast call 0x199402b3F213A233e89585957F86A07ED1e1cD67 \
  "getLockerConfig(address)((bool,uint256,uint256[],uint256[],address))" \
  0x3F7E822C7FD54dBF8df29C6EC48E08Ce8AcEBeb3 \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N

# Expected result: (true, 0, [], [], 0x000...)
#                   ^^^^^ authorized = TRUE ✅
```

Then retry community registration - it should succeed!

## 🎯 Summary

| Contract | Address | Role |
|----------|---------|------|
| GTokenStaking | `0x199402b3F213A233e89585957F86A07ED1e1cD67` | Manages stGToken locking |
| Registry v2.1 | `0x3F7E822C7FD54dBF8df29C6EC48E08Ce8AcEBeb3` | Needs locker authorization |
| Your Wallet | `0x411BD567E46C0781248dbB6a9211891C032885e5` | Owner of GTokenStaking ✅ |

**Status**:
- ❌ Registry v2.1 is **NOT** authorized (current state)
- ✅ Run `configureLocker()` to authorize
- ✅ Then registration will work!

## 📝 Why This Happened

The deployment script (`DeployRegistryV2_1.s.sol`) notes this as a required post-deployment step:

```solidity
console.log("=== Next Steps ===");
console.log("1. Add Registry v2.1 as locker in GTokenStaking:");
```

This step was skipped during deployment, causing all registration attempts to fail.

## 🔗 Related Files

- Deployment script: `/Volumes/UltraDisk/Dev2/aastar/SuperPaymaster/script/DeployRegistryV2_1.s.sol`
- Registry source: `/Volumes/UltraDisk/Dev2/aastar/SuperPaymaster/src/paymasters/v2/core/Registry.sol`
- GTokenStaking source: `/Volumes/UltraDisk/Dev2/aastar/SuperPaymaster/src/paymasters/v2/core/GTokenStaking.sol`
- Fix script: `authorize-registry-locker.mjs`
