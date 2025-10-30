# Migration to @aastar/shared-config

This document describes how the Registry frontend now uses `@aastar/shared-config` for contract address management.

## Changes Made

### 1. Package Installation

```bash
pnpm add @aastar/shared-config@latest
```

### 2. Updated Files

#### `src/config/networkConfig.ts`
- **Before**: All contract addresses hardcoded or from env vars
- **After**: Core contract addresses imported from `@aastar/shared-config`

**Contracts now from shared-config:**
- `paymasterV4` - PaymasterV4_1 (AOA mode)
- `registryV2_1` - Registry v2.1 (node types + slash)
- `gToken` - Governance token (sGT)
- `gTokenStaking` - GTokenStaking contract
- `xPNTsFactory` - xPNTs token factory (unified architecture)
- `mySBT` - MySBT v2.3 (white-label SBT)
- `superPaymasterV2` - SuperPaymaster V2 (AOA+ mode)
- `entryPointV07` - EntryPoint v0.7 (ERC-4337)

**Legacy contracts preserved:**
- `registry` (v1.2) - Kept for backward compatibility
- `registryV2` (v2.0) - Kept for backward compatibility
- `pntToken`, `gasTokenFactory`, `sbtContract`, `usdtContract` - App-specific

### 3. Usage Examples

```typescript
import { getCurrentNetworkConfig } from '@/config/networkConfig';

const config = getCurrentNetworkConfig();

// Core contracts (from shared-config)
const registry = config.contracts.registryV2_1;
const gToken = config.contracts.gToken;
const superPaymaster = config.contracts.superPaymasterV2;

// Legacy contracts (still available)
const oldRegistry = config.contracts.registry;
```

### 4. Direct shared-config Usage

You can also import directly from shared-config:

```typescript
import {
  getSuperPaymasterV2,
  getPaymasterV4,
  getCoreContracts,
  getTxUrl,
  getAddressUrl,
} from '@aastar/shared-config';

// Get specific contract
const superPaymaster = getSuperPaymasterV2('sepolia');

// Get all core contracts
const core = getCoreContracts('sepolia');

// Generate explorer URLs
const txUrl = getTxUrl('sepolia', '0x123...');
const addressUrl = getAddressUrl('sepolia', '0xabc...');
```

## Benefits

### 1. Single Source of Truth
- Contract addresses managed in one place (`@aastar/shared-config`)
- Updates propagate to all projects automatically

### 2. Type Safety
- Full TypeScript support
- Compile-time error detection for address mismatches

### 3. Consistency
- Same contract addresses across registry, SuperPaymaster, and other repos
- No more address drift between projects

### 4. Easy Updates
When new contracts are deployed:
1. Update `@aastar/shared-config`
2. Publish new version
3. Update registry: `pnpm add @aastar/shared-config@latest`
4. Done!

## Environment Variables

The following env vars are now **optional** (defaults from shared-config):

```env
# Optional overrides (rarely needed)
VITE_REGISTRY_V2_1_ADDRESS=...
VITE_GTOKEN_ADDRESS=...
VITE_GTOKEN_STAKING_ADDRESS=...
VITE_XPNTS_FACTORY_ADDRESS=...
VITE_MYSBT_ADDRESS=...
VITE_SUPERPAYMASTER_V2_ADDRESS=...
VITE_PAYMASTER_V4_ADDRESS=...
VITE_ENTRYPOINT_V07_ADDRESS=...
```

## Backward Compatibility

All existing code continues to work! The NetworkConfig interface remains the same:

```typescript
const config = getCurrentNetworkConfig();
config.contracts.paymasterV4 // Still works
config.contracts.registryV2_1 // Now from shared-config
config.contracts.superPaymasterV2 // Now from shared-config
```

## Files Preserved

These config files remain app-specific:

- `src/config/rpc.ts` - RPC proxy configuration
- `src/config/chainlinkFeeds.ts` - Chainlink price feed addresses

## Migration Checklist

- [x] Install `@aastar/shared-config` package
- [x] Update `networkConfig.ts` to use shared-config
- [x] Test dev server runs without errors
- [x] Test all pages load correctly
- [ ] Test contract interactions still work
- [ ] Update deployment documentation

## Testing

To verify the migration worked:

1. **Check dev server**: `pnpm dev` (should start without errors)
2. **Check console**: No contract address warnings
3. **Check UI**: All pages load correctly
4. **Check contracts**: Transactions work as expected

## Rollback Plan

If needed, revert to old configuration:

```bash
git checkout HEAD~ src/config/networkConfig.ts
pnpm remove @aastar/shared-config
```

## Questions?

- Package docs: https://github.com/AAStarCommunity/aastar-shared-config
- Issues: https://github.com/AAStarCommunity/aastar-shared-config/issues
