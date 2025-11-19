# Airdrop Mode - Batch SBT Minting Guide

## Overview

Airdrop Mode enables **operator-paid** batch SBT minting where communities can distribute SBTs to users without requiring any user interaction.

## How It Works

### Traditional Mode vs Airdrop Mode

| Feature | Traditional Mode | Airdrop Mode |
|---------|-----------------|--------------|
| Who pays | Users | Operator |
| User approval | Required | Not needed |
| User GToken | Must have 0.4 GT | Not needed |
| User interaction | Multiple steps | Zero |
| Best for | Individual minting | Mass distribution |

## Quick Start

### Step 1: Deploy Updated MySBT Contract

Ensure you're using `MySBT_v2.3.2` with the `airdropMint` function:

```solidity
function airdropMint(address user, string memory metadata)
    external
    returns (uint256 tokenId, bool isNewMint)
```

### Step 2: Prepare Operator Account

```typescript
// Check operator's GToken balance
const requiredGToken = numberOfUsers * 0.4; // GT per user
const operatorBalance = await gToken.balanceOf(operatorAddress);

if (operatorBalance < ethers.parseEther(requiredGToken.toString())) {
  throw new Error(`Need ${requiredGToken} GT`);
}
```

### Step 3: Use Airdrop Service

```typescript
import { BatchContractService } from '@/services/BatchContractService';

const batchService = new BatchContractService();
await batchService.connectWallet();

// Execute airdrop
const result = await batchService.executeBatchAirdrop(
  mySBTAddress,
  targetAddresses,
  metadataJSON,
  (progress) => {
    console.log(`Progress: ${progress.currentIndex}/${progress.totalItems}`);
  }
);

console.log(`Success: ${result.success}`);
console.log(`Total cost: ${result.totalCost} ETH`);
```

## Pre-Check Validation

Before executing airdrop, run pre-checks:

```typescript
import { PreMintCheckService } from '@/services/PreMintCheckService';

const checkService = new PreMintCheckService();

// Run airdrop-specific checks
const checks = await checkService.runAirdropPreChecks(
  operatorAddress,
  targetAddresses,
  mySBTAddress
);

if (!checks.allPassed) {
  console.error('Pre-check failed:');
  checks.checks
    .filter(c => !c.passed)
    .forEach(c => console.error(`- ${c.title}: ${c.description}`));
  return;
}

// Proceed with airdrop
await batchService.executeBatchAirdrop(...);
```

### Pre-Check Items (Airdrop Mode)

1. **Community Registration** ✅
   - Operator must be registered in Registry
   - Community must be active

2. **Operator GToken Balance** ✅
   - Must have: `0.4 GT × number_of_addresses`
   - Checks total cost before starting

3. **SBT Status** ⚠️
   - Identifies addresses with existing SBTs
   - Warning only (not critical)
   - Existing SBT holders get membership added (free)

**Note:** No user-side checks needed!

## Cost Calculation

### Per Address
- **GToken**: 0.4 GT
  - mintFee: 0.1 GT (burned)
  - minLockAmount: 0.3 GT (staked for user)
- **Gas**: ~150,000 gas per mint

### Example: 100 Users
```
GToken Cost: 40 GT
Gas Cost (50 gwei): ~0.75 ETH
Total Fiat ($2000/ETH, $5/GT): ~$1,700
```

## Frontend Integration

### React Component Example

```typescript
import { useState } from 'react';
import { BatchContractService } from '@/services/BatchContractService';
import { PreMintCheckService } from '@/services/PreMintCheckService';

export function AirdropMinter() {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isAirdropping, setIsAirdropping] = useState(false);

  const handleAirdrop = async () => {
    setIsAirdropping(true);

    try {
      // Step 1: Pre-check
      const checkService = new PreMintCheckService();
      const checks = await checkService.runAirdropPreChecks(
        operatorAddress,
        addresses,
        mySBTAddress
      );

      if (!checks.allPassed) {
        alert('Pre-check failed. See console for details.');
        console.error(checks);
        return;
      }

      // Step 2: Execute airdrop
      const batchService = new BatchContractService();
      await batchService.connectWallet();

      const result = await batchService.executeBatchAirdrop(
        mySBTAddress,
        addresses,
        JSON.stringify({
          communityAddress: operatorAddress,
          communityName: 'My DAO',
          nodeType: 'PAYMASTER_SUPER',
          isActive: true
        }),
        (prog) => {
          setProgress((prog.currentIndex / prog.totalItems) * 100);
        }
      );

      if (result.success) {
        alert(`Airdrop successful! Total cost: ${result.totalCost} ETH`);
      } else {
        alert('Some airdrops failed. Check results.');
      }

      console.log('Results:', result.results);

    } catch (error) {
      console.error('Airdrop failed:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsAirdropping(false);
    }
  };

  return (
    <div>
      <h2>Airdrop SBT</h2>
      <textarea
        value={addresses.join('\n')}
        onChange={(e) => setAddresses(e.target.value.split('\n'))}
        placeholder="Enter addresses (one per line)"
        rows={10}
      />
      <button
        onClick={handleAirdrop}
        disabled={isAirdropping || addresses.length === 0}
      >
        {isAirdropping ? `Airdropping... ${progress.toFixed(0)}%` : 'Start Airdrop'}
      </button>
    </div>
  );
}
```

## API Reference

### BatchContractService.executeBatchAirdrop()

```typescript
async executeBatchAirdrop(
  contractAddress: string,
  addresses: string[],
  metadata: string,
  onProgress?: (progress: BatchExecutionProgress) => void
): Promise<BatchMintResult>
```

**Parameters:**
- `contractAddress`: MySBT contract address
- `addresses`: Array of recipient addresses
- `metadata`: JSON string with community info
- `onProgress`: Optional callback for progress updates

**Returns:**
```typescript
interface BatchMintResult {
  success: boolean;
  txHash: string;
  results: Array<{
    address: string;
    success: boolean;
    tokenId?: string;
    error?: string;
  }>;
  totalGasUsed: number;
  gasPrice: string;
  totalCost: string; // in ETH
}
```

### PreMintCheckService.runAirdropPreChecks()

```typescript
async runAirdropPreChecks(
  operatorAddress: string,
  addresses: string[],
  contractAddress: string
): Promise<PreMintCheckResults>
```

**Parameters:**
- `operatorAddress`: Community/operator address
- `addresses`: Target recipient addresses
- `contractAddress`: MySBT contract address

**Returns:**
```typescript
interface PreMintCheckResults {
  allPassed: boolean;
  checks: Array<{
    passed: boolean;
    title: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
    details?: string;
  }>;
  summary: {
    critical: number;
    warnings: number;
    passed: number;
  };
}
```

## Error Handling

### Common Errors

#### "Insufficient GToken"
**Cause:** Operator doesn't have enough GToken

**Solution:**
```typescript
const needed = addresses.length * 0.4;
// Transfer more GToken to operator address
```

#### "Community not registered"
**Cause:** Operator is not registered in Registry

**Solution:**
```bash
# Register community first via Registry contract
```

#### "Airdrop transaction failed"
**Cause:** Individual mint failed (gas, network, etc.)

**Solution:**
- Check gas price and limit
- Retry failed addresses
- Check network status

### Retry Failed Airdrops

```typescript
const failedAddresses = result.results
  .filter(r => !r.success)
  .map(r => r.address);

if (failedAddresses.length > 0) {
  console.log(`Retrying ${failedAddresses.length} failed airdrops...`);

  const retryResult = await batchService.executeBatchAirdrop(
    mySBTAddress,
    failedAddresses,
    metadata,
    onProgress
  );
}
```

## Best Practices

### 1. Batch Size
- **Recommended**: 50-100 addresses per batch
- **Maximum**: 500 addresses (depends on gas limits)
- Split large airdrops into multiple batches

### 2. Gas Management
```typescript
// Check gas price before starting
const gasPrice = await provider.getFeeData();
if (gasPrice.gasPrice > ethers.parseUnits('100', 'gwei')) {
  console.warn('High gas price! Consider waiting.');
}
```

### 3. Progress Monitoring
```typescript
const onProgress = (progress) => {
  // Save progress to database
  saveProgress({
    batchId: currentBatchId,
    completed: progress.currentIndex,
    total: progress.totalItems,
    results: progress.results
  });
};
```

### 4. Transaction Delays
The service automatically adds 1-second delays between transactions to avoid nonce conflicts. For faster processing, consider:
- Parallel execution (advanced)
- Flashbots/private mempools
- Layer 2 solutions

## Security Considerations

### ✅ Protected Operations
- Only registered communities can airdrop
- GToken balance checked before starting
- Each transaction is atomic (fail-safe)

### ⚠️ Important Notes
1. **Operator must approve MySBT contract**
   - Service handles this automatically
   - Approval is for total amount needed

2. **Recipients can burn SBTs**
   - Users can reject airdrops by burning
   - Staked GToken remains with user

3. **No refunds**
   - Once minted, GToken is spent
   - Plan batches carefully

## Monitoring & Analytics

### Track Airdrop Metrics

```typescript
const metrics = {
  totalAddresses: addresses.length,
  successful: result.results.filter(r => r.success).length,
  failed: result.results.filter(r => !r.success).length,
  totalCostGT: addresses.length * 0.4,
  totalCostETH: result.totalCost,
  avgGasPerMint: result.totalGasUsed / addresses.length
};

console.log('Airdrop Metrics:', metrics);
```

### Event Listening

```typescript
// Listen for SBTMinted events
const mySBT = new ethers.Contract(mySBTAddress, MySBTABI, provider);

mySBT.on('SBTMinted', (user, tokenId, community, timestamp) => {
  console.log(`✅ SBT minted: ${user} → tokenId: ${tokenId}`);
});
```

## Migration Checklist

Switching from traditional to airdrop mode:

- [ ] Deploy MySBT_v2.3.2 with airdropMint
- [ ] Update frontend to use executeBatchAirdrop
- [ ] Update pre-checks to use runAirdropPreChecks
- [ ] Test with small batch (3-5 addresses)
- [ ] Prepare sufficient GToken for operator
- [ ] Document airdrop costs for stakeholders
- [ ] Set up monitoring/alerts
- [ ] Train team on new workflow

## FAQ

**Q: Can users reject airdrops?**
A: They receive SBTs automatically but can burn them if unwanted.

**Q: What if operator runs out of GToken mid-batch?**
A: Transactions fail individually. Successful airdrops remain, failed ones can be retried.

**Q: How to airdrop to addresses that already have SBTs?**
A: The function adds membership (no cost). Pre-check shows warning.

**Q: Is approval needed for each batch?**
A: One approval covers the total amount. If insufficient, service re-approves automatically.

**Q: Can I cancel an ongoing airdrop?**
A: No. But you can stop sending new transactions. Already submitted txs will complete.

## Support

For issues or questions:
- GitHub Issues: [AAStarCommunity/registry](https://github.com/AAStarCommunity/registry/issues)
- Contract Repo: [AAStarCommunity/SuperPaymaster](https://github.com/AAStarCommunity/SuperPaymaster)
- Documentation: See `docs/AIRDROP_MINT.md` in SuperPaymaster repo

---

**Version**: 1.0.0
**Last Updated**: 2025-11-19
**Status**: ✅ Production Ready
