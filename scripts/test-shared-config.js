#!/usr/bin/env node

/**
 * Test @aastar/shared-config@0.2.9
 * Fetch contract versions from deployed contracts
 */

import { ethers } from 'ethers';
import { getCoreContracts, getTokenContracts, getTestTokenContracts, getCommunities } from '@aastar/shared-config';

const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// VERSION interface ABI
const VERSION_ABI = [
  'function VERSION() view returns (string)',
  'function VERSION_CODE() view returns (uint256)',
];

async function getContractVersion(address, name) {
  try {
    const contract = new ethers.Contract(address, VERSION_ABI, provider);
    const version = await contract.VERSION();
    const versionCode = await contract.VERSION_CODE();

    return {
      name,
      address,
      version,
      versionCode: versionCode.toString(),
      status: '✅',
    };
  } catch (error) {
    return {
      name,
      address,
      version: 'N/A',
      versionCode: 'N/A',
      status: '❌',
      error: error.message.split('\n')[0],
    };
  }
}

async function main() {
  console.log('🔍 Testing @aastar/shared-config@0.2.9\n');
  console.log('Network: Sepolia');
  console.log('RPC:', RPC_URL);
  console.log('\n' + '='.repeat(80) + '\n');

  // Get contracts from shared-config
  const core = getCoreContracts('sepolia');
  const tokens = getTokenContracts('sepolia');
  const testTokens = getTestTokenContracts('sepolia');
  const communities = getCommunities('sepolia');

  console.log('📦 CORE CONTRACTS\n');

  const coreResults = await Promise.all([
    getContractVersion(core.superPaymasterV2, 'SuperPaymasterV2'),
    getContractVersion(core.registry, 'Registry'),
    getContractVersion(core.gToken, 'GToken'),
    getContractVersion(core.gTokenStaking, 'GTokenStaking'),
    getContractVersion(core.paymasterFactory, 'PaymasterFactory'),
  ]);

  coreResults.forEach(result => {
    console.log(`${result.status} ${result.name}`);
    console.log(`   Address: ${result.address}`);
    console.log(`   Version: ${result.version} (code: ${result.versionCode})`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log();
  });

  console.log('='.repeat(80) + '\n');
  console.log('🪙 TOKEN CONTRACTS\n');

  const tokenResults = await Promise.all([
    getContractVersion(tokens.xPNTsFactory, 'xPNTsFactory'),
    getContractVersion(tokens.mySBT, 'MySBT'),
  ]);

  tokenResults.forEach(result => {
    console.log(`${result.status} ${result.name}`);
    console.log(`   Address: ${result.address}`);
    console.log(`   Version: ${result.version} (code: ${result.versionCode})`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log();
  });

  console.log('='.repeat(80) + '\n');
  console.log('🧪 TEST TOKENS (Development & Testing)\n');

  const testTokenResults = await Promise.all([
    getContractVersion(testTokens.aPNTs, 'aPNTs'),
    getContractVersion(testTokens.bPNTs, 'bPNTs'),
  ]);

  testTokenResults.forEach(result => {
    console.log(`${result.status} ${result.name}`);
    console.log(`   Address: ${result.address}`);
    console.log(`   Version: ${result.version} (code: ${result.versionCode})`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log();
  });

  console.log('='.repeat(80) + '\n');
  console.log('🏘️  REGISTERED COMMUNITIES\n');

  console.log('📍 AAStar Community');
  console.log(`   Owner: ${communities.aastar.owner}`);
  console.log(`   Gas Token: ${communities.aastar.gasToken} (aPNTs)`);
  console.log(`   ENS: ${communities.aastar.ensName}`);
  console.log(`   Stake: ${communities.aastar.stake} GToken`);
  console.log();

  console.log('📍 BuilderDAO Community');
  console.log(`   Owner: ${communities.builderDao.owner}`);
  console.log(`   Gas Token: ${communities.builderDao.gasToken} (bPNTs)`);
  console.log(`   ENS: ${communities.builderDao.ensName}`);
  console.log(`   Stake: ${communities.builderDao.stake} GToken`);
  console.log();

  console.log('='.repeat(80) + '\n');

  // Summary
  const allResults = [...coreResults, ...tokenResults, ...testTokenResults];
  const successCount = allResults.filter(r => r.status === '✅').length;
  const failCount = allResults.filter(r => r.status === '❌').length;

  console.log('📊 SUMMARY\n');
  console.log(`   Total Contracts: ${allResults.length}`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log();

  if (successCount === allResults.length) {
    console.log('🎉 All contracts verified successfully!');
    console.log('✅ @aastar/shared-config@0.2.9 is working correctly!\n');
  } else {
    console.log('⚠️  Some contracts failed verification.');
    console.log('Please check the errors above.\n');
  }
}

main().catch(console.error);
