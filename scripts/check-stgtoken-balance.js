#!/usr/bin/env node
/**
 * stGToken Balance Diagnostic Tool
 *
 * Checks user's stGToken balance on both old and new GTokenStaking contracts
 */

const { ethers } = require('ethers');

const USER_ADDRESS = '0x411BD567E46C0781248dbB6a9211891C032885e5';

const OLD_GTOKEN_STAKING = '0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2'; // V1 (deprecated)
const NEW_GTOKEN_STAKING = '0x199402b3F213A233e89585957F86A07ED1e1cD67'; // V2 (current)

const GTOKEN_STAKING_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function getStakeInfo(address account) view returns (uint256 stakedAmount, uint256 shares, uint256 stakedAt, uint256 unstakeRequestedAt)',
];

async function checkBalance() {
  console.log('🔍 Checking stGToken balances for:', USER_ADDRESS);
  console.log('');

  // Use backend RPC from environment or fallback to public RPC
  const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  console.log('📡 Using RPC:', rpcUrl.replace(/\/v2\/.*/, '/v2/***'));
  console.log('');

  // Check old contract (V1)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 Old GTokenStaking V1 (deprecated)');
  console.log('   Address:', OLD_GTOKEN_STAKING);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const oldContract = new ethers.Contract(OLD_GTOKEN_STAKING, GTOKEN_STAKING_ABI, provider);

    const oldBalance = await oldContract.balanceOf(USER_ADDRESS);
    console.log('💰 stGToken Balance:', ethers.formatEther(oldBalance), 'stGT');

    const oldStakeInfo = await oldContract.getStakeInfo(USER_ADDRESS);
    console.log('📊 Stake Info:');
    console.log('   - Staked Amount:', ethers.formatEther(oldStakeInfo[0]), 'GT');
    console.log('   - Shares:', ethers.formatEther(oldStakeInfo[1]));
    console.log('   - Staked At:', oldStakeInfo[2] > 0n ? new Date(Number(oldStakeInfo[2]) * 1000).toLocaleString() : 'Never');
    console.log('   - Unstake Requested:', oldStakeInfo[3] > 0n ? new Date(Number(oldStakeInfo[3]) * 1000).toLocaleString() : 'No');

    if (oldBalance > 0n) {
      console.log('⚠️  WARNING: You have funds on the OLD contract!');
      console.log('   You need to unstake from old contract and re-stake to new contract.');
    }
  } catch (error) {
    console.log('❌ Error checking old contract:', error.message);
  }

  console.log('');

  // Check new contract (V2)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 New GTokenStaking V2 (current)');
  console.log('   Address:', NEW_GTOKEN_STAKING);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const newContract = new ethers.Contract(NEW_GTOKEN_STAKING, GTOKEN_STAKING_ABI, provider);

    const newBalance = await newContract.balanceOf(USER_ADDRESS);
    console.log('💰 stGToken Balance:', ethers.formatEther(newBalance), 'stGT');

    const newStakeInfo = await newContract.getStakeInfo(USER_ADDRESS);
    console.log('📊 Stake Info:');
    console.log('   - Staked Amount:', ethers.formatEther(newStakeInfo[0]), 'GT');
    console.log('   - Shares:', ethers.formatEther(newStakeInfo[1]));
    console.log('   - Staked At:', newStakeInfo[2] > 0n ? new Date(Number(newStakeInfo[2]) * 1000).toLocaleString() : 'Never');
    console.log('   - Unstake Requested:', newStakeInfo[3] > 0n ? new Date(Number(newStakeInfo[3]) * 1000).toLocaleString() : 'No');

    if (newBalance >= ethers.parseEther('50')) {
      console.log('✅ You have enough stGToken to register!');
    } else {
      console.log('❌ Insufficient stGToken for registration (need 50.0 stGT)');
    }
  } catch (error) {
    console.log('❌ Error checking new contract:', error.message);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Summary & Next Steps');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('If you have funds on OLD contract:');
  console.log('  1. Go to GetGToken page (http://localhost:5173/get-gtoken)');
  console.log('  2. Click "Unstake" to withdraw from old contract');
  console.log('  3. Wait for cooldown period (if any)');
  console.log('  4. Stake to NEW contract');
  console.log('');
  console.log('If you have NO funds on either contract:');
  console.log('  1. Make sure you have GToken (you mentioned 510 GT balance)');
  console.log('  2. Go to Deploy Wizard Step 4');
  console.log('  3. Stake at least 50 GT to get stGToken');
  console.log('');
  console.log('Etherscan Links:');
  console.log('  - Old Contract:', `https://sepolia.etherscan.io/address/${OLD_GTOKEN_STAKING}`);
  console.log('  - New Contract:', `https://sepolia.etherscan.io/address/${NEW_GTOKEN_STAKING}`);
  console.log('  - Your Address:', `https://sepolia.etherscan.io/address/${USER_ADDRESS}`);
}

checkBalance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
