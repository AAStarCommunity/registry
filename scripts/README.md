# Registry Scripts

Utility scripts for managing and debugging the registry application.

## Admin Scripts (`admin/`)

Production-ready administrative scripts:

### `approve-new-mysbt.js`
Approve NEW MySBT contract to spend Deployer's GToken.

**Usage:**
```bash
node scripts/admin/approve-new-mysbt.js
```

**Prerequisites:**
- Deployer private key in env or hardcoded
- Sufficient GToken balance

**What it does:**
- Approves NEW MySBT (0xc364A68Abd38a6428513abE519dEEA410803BB5A) to spend 1000 GT
- Shows current allowance before and after

### `authorize-new-mysbt-locker.js`
Authorize NEW MySBT as a locker in GTokenStaking contract.

**Usage:**
```bash
node scripts/admin/authorize-new-mysbt-locker.js
```

**Prerequisites:**
- GTokenStaking owner private key (deployer)
- Must be run by GTokenStaking owner

**What it does:**
- Verifies ownership
- Checks current locker authorization status
- Calls `configureLocker()` to authorize NEW MySBT
- Verifies the change

## Debug Scripts (`debug/`)

Diagnostic and testing scripts:

### `diagnose-dao.js`
Comprehensive diagnostic for DAO configuration.

**Usage:**
```bash
node scripts/debug/diagnose-dao.js
```

**What it checks:**
1. DAO registration status
2. GToken balance (needs >= 0.4 GT)
3. GToken approval to NEW MySBT (needs >= 0.4 GT)
4. MySBT locker authorization status
5. MySBT GTokenStaking address configuration

**Output:**
- Detailed status for each check
- Summary with actionable recommendations
- Troubleshooting tips

### `test-airdrop-mint.js`
Test airdropMint function with actual contract calls.

**Usage:**
```bash
node scripts/debug/test-airdrop-mint.js
```

**What it does:**
- Loads MySBT ABI
- Attempts to call `airdropMint()` for a test user
- Shows detailed error information if it fails
- Decodes custom errors (like UnauthorizedLocker)

## Contract Addresses (Sepolia)

- **NEW MySBT**: `0xc364A68Abd38a6428513abE519dEEA410803BB5A` (v2.4.4)
- **GToken**: `0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc`
- **GTokenStaking**: `0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0`
- **Registry**: `0x49245E1f3c2dD99b3884ffeD410d0605Cf4dC696`
- **DAO**: `0xF7Bf79AcB7F3702b9DbD397d8140ac9DE6Ce642C`

## Common Issues

### UnauthorizedLocker Error
**Symptom:** `Error: 0x04d95544` when calling airdropMint

**Solution:** Run `authorize-new-mysbt-locker.js` to authorize MySBT as locker

### Insufficient Allowance
**Symptom:** Transaction fails with "insufficient allowance" or "ERC20: transfer amount exceeds allowance"

**Solution:** Run `approve-new-mysbt.js` to approve GToken spending

### Not Registered
**Symptom:** airdropMint fails with "not registered" error

**Solution:** Ensure the caller address is registered as a community in Registry

## Troubleshooting Workflow

1. **Run diagnostic:**
   ```bash
   node scripts/debug/diagnose-dao.js
   ```

2. **Fix issues based on diagnostic output:**
   - If not registered → Register DAO as community
   - If insufficient balance → Transfer GToken to DAO
   - If insufficient allowance → Run `approve-new-mysbt.js`
   - If locker not authorized → Run `authorize-new-mysbt-locker.js`

3. **Test airdrop:**
   ```bash
   node scripts/debug/test-airdrop-mint.js
   ```

4. **If still failing:**
   - Check browser cache (hard refresh with Ctrl+Shift+R)
   - Verify frontend is using correct contract addresses
   - Ensure ABI is up to date
   - Check MetaMask is connected to correct account
