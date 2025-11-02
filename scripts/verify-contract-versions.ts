/**
 * Verify Contract Versions Script
 *
 * Compares contract versions from @aastar/shared-config
 * with actual on-chain versions fetched via RPC
 */

import { ethers } from 'ethers';
import { getAllV2Contracts, V2_SUMMARY } from '@aastar/shared-config';

// Sepolia RPC URL
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';

// VERSION interface ABI
const VERSION_ABI = [
  'function VERSION() view returns (string)',
  'function VERSION_CODE() view returns (uint256)',
];

interface VersionComparison {
  name: string;
  address: string;
  configVersion: string;
  configVersionCode: number;
  onchainVersion?: string;
  onchainVersionCode?: number;
  match: boolean;
  error?: string;
}

async function main() {
  console.log('='.repeat(80));
  console.log('📋 Contract Version Verification');
  console.log('='.repeat(80));
  console.log();

  // Initialize provider
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  console.log(`🌐 Connected to: ${SEPOLIA_RPC_URL}`);
  console.log();

  // Get all V2 contracts from config
  const contracts = getAllV2Contracts();
  console.log(`📦 Total contracts to verify: ${contracts.length}`);
  console.log(`📊 Summary:`, V2_SUMMARY);
  console.log();

  const results: VersionComparison[] = [];
  let totalMatches = 0;
  let totalMismatches = 0;
  let totalErrors = 0;

  // Verify each contract
  for (const contract of contracts) {
    console.log(`🔍 Verifying: ${contract.name} (${contract.address})`);

    const result: VersionComparison = {
      name: contract.name,
      address: contract.address,
      configVersion: contract.version,
      configVersionCode: contract.versionCode,
      match: false,
    };

    try {
      // Skip if address is empty (not deployed)
      if (!contract.address) {
        result.error = 'Not deployed (empty address)';
        result.match = false;
        totalErrors++;
        results.push(result);
        console.log(`   ⚠️  Not deployed`);
        console.log();
        continue;
      }

      // Create contract instance
      const contractInstance = new ethers.Contract(
        contract.address,
        VERSION_ABI,
        provider
      );

      // Fetch VERSION
      try {
        result.onchainVersion = await contractInstance.VERSION();
      } catch (e) {
        result.error = `VERSION() not found: ${(e as Error).message}`;
      }

      // Fetch VERSION_CODE
      try {
        const versionCode = await contractInstance.VERSION_CODE();
        result.onchainVersionCode = Number(versionCode);
      } catch (e) {
        if (!result.error) {
          result.error = `VERSION_CODE() not found: ${(e as Error).message}`;
        }
      }

      // Compare versions
      if (result.onchainVersion && result.onchainVersionCode !== undefined) {
        const versionMatch = result.onchainVersion === result.configVersion;
        const codeMatch = result.onchainVersionCode === result.configVersionCode;
        result.match = versionMatch && codeMatch;

        if (result.match) {
          console.log(`   ✅ VERSION: "${result.onchainVersion}" (code: ${result.onchainVersionCode})`);
          totalMatches++;
        } else {
          console.log(`   ❌ MISMATCH!`);
          console.log(`      Config:  "${result.configVersion}" (code: ${result.configVersionCode})`);
          console.log(`      Onchain: "${result.onchainVersion}" (code: ${result.onchainVersionCode})`);
          totalMismatches++;
        }
      } else {
        console.log(`   ⚠️  ${result.error}`);
        totalErrors++;
      }

      results.push(result);
      console.log();
    } catch (error) {
      result.error = `Unexpected error: ${(error as Error).message}`;
      result.match = false;
      totalErrors++;
      results.push(result);
      console.log(`   ❌ Error: ${result.error}`);
      console.log();
    }
  }

  // Print summary
  console.log('='.repeat(80));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(80));
  console.log();
  console.log(`Total Contracts: ${results.length}`);
  console.log(`✅ Matches:      ${totalMatches}`);
  console.log(`❌ Mismatches:   ${totalMismatches}`);
  console.log(`⚠️  Errors:       ${totalErrors}`);
  console.log();

  // Print detailed results table
  console.log('='.repeat(80));
  console.log('📋 DETAILED RESULTS');
  console.log('='.repeat(80));
  console.log();

  console.table(
    results.map((r) => ({
      Name: r.name,
      Address: `${r.address.slice(0, 6)}...${r.address.slice(-4)}`,
      'Config Version': r.configVersion,
      'Onchain Version': r.onchainVersion || 'N/A',
      'Config Code': r.configVersionCode,
      'Onchain Code': r.onchainVersionCode || 'N/A',
      Status: r.match ? '✅' : r.error ? '⚠️' : '❌',
      Error: r.error || '-',
    }))
  );

  // Exit with error if there are mismatches
  if (totalMismatches > 0) {
    console.error(`\n❌ ${totalMismatches} version mismatch(es) found!`);
    process.exit(1);
  } else if (totalErrors > 0) {
    console.warn(`\n⚠️  ${totalErrors} contract(s) could not be verified`);
    process.exit(0);
  } else {
    console.log('\n✅ All contract versions match!');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
