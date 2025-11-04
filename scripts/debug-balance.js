/**
 * Debug script to check GToken balance for a specific address
 */

import { ethers } from 'ethers';

// ERC-20 ABI
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

async function checkGTokenBalance() {
  try {
    // Configuration for Sepolia testnet - using public RPC
    const RPC_URL = 'https://ethereum-sepolia.blockpi.network/v1/rpc/public';
    const GTOKEN_ADDRESS = '0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc'; // Correct GToken address from shared-config
    const TARGET_ADDRESS = '0x2E9A5648F9dd7E8d70e3CBdA0C8b6Ada71Da4Ec9';

    console.log('=== GToken Balance Check ===');
    console.log('Network: Sepolia Testnet');
    console.log('GToken Contract:', GTOKEN_ADDRESS);
    console.log('Target Address:', TARGET_ADDRESS);
    console.log('');

    // Create provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // Create contract instance
    const gtokenContract = new ethers.Contract(GTOKEN_ADDRESS, ERC20_ABI, provider);

    // Check if contract exists
    try {
      const symbol = await gtokenContract.symbol();
      const decimals = await gtokenContract.decimals();
      console.log('✅ Contract found');
      console.log('Token Symbol:', symbol);
      console.log('Token Decimals:', decimals);
    } catch (error) {
      console.error('❌ Contract not found or not accessible:', error.message);
      return;
    }

    // Get balance
    const balance = await gtokenContract.balanceOf(TARGET_ADDRESS);
    const formattedBalance = ethers.formatEther(balance);

    console.log('');
    console.log('=== Balance Results ===');
    console.log('Raw Balance:', balance.toString());
    console.log('Formatted Balance:', formattedBalance);

    if (balance === 0n) {
      console.log('⚠️  Balance is 0 - This could mean:');
      console.log('   1. Address has no GToken');
      console.log('   2. Wrong contract address');
      console.log('   3. Mint transaction failed');
      console.log('   4. Network mismatch');
    } else {
      console.log('✅ Balance found:', formattedBalance);
    }

  } catch (error) {
    console.error('❌ Error checking balance:', error);
  }
}

// Run the check
checkGTokenBalance();