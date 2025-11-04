#!/usr/bin/env node
/**
 * Authorize Registry v2.1 as Locker in GTokenStaking
 *
 * This is a required setup step before anyone can register communities to Registry v2.1.
 * Registry needs to lock user's stGToken during registration, which requires locker authorization.
 */

import { ethers } from 'ethers';

const GTOKEN_STAKING_ADDRESS = '0x199402b3F213A233e89585957F86A07ED1e1cD67';
const REGISTRY_V2_1_ADDRESS = '0x3F7E822C7FD54dBF8df29C6EC48E08Ce8AcEBeb3';
const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N';

const GTOKEN_STAKING_ABI = [
  'function configureLocker(address locker, bool authorized, uint256 baseExitFee, uint256[] timeTiers, uint256[] tierFees, address feeRecipient) external',
  'function getLockerConfig(address locker) view returns (bool authorized, uint256 baseExitFee, uint256[] timeTiers, uint256[] tierFees, address feeRecipient)',
  'function owner() view returns (address)',
];

async function main() {
  console.log('🔧 Authorizing Registry v2.1 as GTokenStaking Locker');
  console.log('');
  console.log('Contracts:');
  console.log('  GTokenStaking:', GTOKEN_STAKING_ADDRESS);
  console.log('  Registry v2.1:', REGISTRY_V2_1_ADDRESS);
  console.log('');

  // Connect to wallet (MetaMask)
  if (typeof window === 'undefined' || !window.ethereum) {
    console.error('❌ Error: This script must be run in a browser with MetaMask installed');
    console.log('');
    console.log('Alternative: Use cast directly:');
    console.log('');
    console.log('cast send', GTOKEN_STAKING_ADDRESS, '"configureLocker(address,bool,uint256,uint256[],uint256[],address)" \\');
    console.log('  ', REGISTRY_V2_1_ADDRESS, '\\');
    console.log('  ', 'true', '\\');
    console.log('  ', '0', '\\');
    console.log('  ', '"[]"', '\\');
    console.log('  ', '"[]"', '\\');
    console.log('  ', '0x0000000000000000000000000000000000000000', '\\');
    console.log('  ', '--rpc-url $SEPOLIA_RPC_URL', '\\');
    console.log('  ', '--private-key $PRIVATE_KEY');
    return;
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const userAddress = await signer.getAddress();

  console.log('User Address:', userAddress);
  console.log('');

  const gTokenStaking = new ethers.Contract(GTOKEN_STAKING_ADDRESS, GTOKEN_STAKING_ABI, provider);

  // Check owner
  const owner = await gTokenStaking.owner();
  console.log('GTokenStaking Owner:', owner);

  if (owner.toLowerCase() !== userAddress.toLowerCase()) {
    console.error('❌ Error: You are not the owner of GTokenStaking');
    console.log('   Owner:', owner);
    console.log('   You:', userAddress);
    return;
  }
  console.log('✅ You are the owner');
  console.log('');

  // Check current config
  console.log('🔍 Checking current locker status...');
  const currentConfig = await gTokenStaking.getLockerConfig(REGISTRY_V2_1_ADDRESS);
  console.log('   Authorized:', currentConfig.authorized);

  if (currentConfig.authorized) {
    console.log('✅ Registry v2.1 is already authorized as locker!');
    return;
  }
  console.log('');

  // Configure locker
  console.log('📝 Authorizing Registry v2.1...');
  const gTokenStakingSigner = gTokenStaking.connect(signer);

  const tx = await gTokenStakingSigner.configureLocker(
    REGISTRY_V2_1_ADDRESS,  // locker address
    true,                   // authorized = true
    0,                      // baseExitFee = 0 (no exit fee for registry unlock)
    [],                     // timeTiers = [] (no time-based fees)
    [],                     // tierFees = [] (no tier fees)
    ethers.ZeroAddress      // feeRecipient = 0x0 (not applicable)
  );

  console.log('📤 Transaction sent:', tx.hash);
  console.log('⏳ Waiting for confirmation...');

  const receipt = await tx.wait();
  console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
  console.log('');

  // Verify
  console.log('🔍 Verifying configuration...');
  const newConfig = await gTokenStaking.getLockerConfig(REGISTRY_V2_1_ADDRESS);
  console.log('   Authorized:', newConfig.authorized);
  console.log('   Base Exit Fee:', newConfig.baseExitFee.toString());
  console.log('   Fee Recipient:', newConfig.feeRecipient);
  console.log('');

  if (newConfig.authorized) {
    console.log('🎉 Success! Registry v2.1 is now authorized as locker');
    console.log('');
    console.log('You can now register communities to Registry v2.1!');
  } else {
    console.error('❌ Failed to authorize Registry v2.1');
  }
}

// Run if called directly (browser context)
if (typeof window !== 'undefined') {
  main().catch(console.error);
} else {
  console.log('=== Authorize Registry v2.1 as Locker ===');
  console.log('');
  console.log('Method 1: Use cast (command line)');
  console.log('');
  console.log('cast send', GTOKEN_STAKING_ADDRESS, '"configureLocker(address,bool,uint256,uint256[],uint256[],address)" \\');
  console.log('  ', REGISTRY_V2_1_ADDRESS, '\\');
  console.log('  ', 'true', '\\');
  console.log('  ', '0', '\\');
  console.log('  ', '"[]"', '\\');
  console.log('  ', '"[]"', '\\');
  console.log('  ', '0x0000000000000000000000000000000000000000', '\\');
  console.log('  ', '--rpc-url https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N', '\\');
  console.log('  ', '--private-key $PRIVATE_KEY');
  console.log('');
  console.log('Method 2: Import this script in browser console or run in browser environment');
}

export { main };
