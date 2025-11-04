/**
 * Test script to verify GToken balance using the same method as frontend
 */

import { ethers } from 'ethers';

// ERC-20 ABI (same as in frontend)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

async function testFrontendBalanceFetch() {
  try {
    console.log('=== Testing Frontend Balance Fetch ===');
    
    // Use the same RPC proxy as frontend
    const provider = new ethers.JsonRpcProvider('http://localhost:3000/api/rpc-proxy');
    
    // GToken address from shared-config
    const GTOKEN_ADDRESS = '0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc';
    const TARGET_ADDRESS = '0x2E9A5648F9dd7E8d70e3CBdA0C8b6Ada71Da4Ec9';
    
    console.log('RPC URL:', 'http://localhost:3000/api/rpc-proxy');
    console.log('GToken Address:', GTOKEN_ADDRESS);
    console.log('Target Address:', TARGET_ADDRESS);
    console.log('');
    
    // Create contract instance (same as frontend)
    const gtokenContract = new ethers.Contract(GTOKEN_ADDRESS, ERC20_ABI, provider);
    
    console.log('Testing contract calls...');
    
    // Test symbol
    try {
      const symbol = await gtokenContract.symbol();
      console.log('✅ Symbol:', symbol);
    } catch (error) {
      console.error('❌ Symbol call failed:', error.message);
    }
    
    // Test decimals
    try {
      const decimals = await gtokenContract.decimals();
      console.log('✅ Decimals:', decimals);
    } catch (error) {
      console.error('❌ Decimals call failed:', error.message);
    }
    
    // Test balance (the main issue)
    try {
      const balance = await gtokenContract.balanceOf(TARGET_ADDRESS);
      const formattedBalance = ethers.formatEther(balance);
      console.log('✅ Balance:', formattedBalance, 'GT');
      console.log('Raw balance:', balance.toString());
    } catch (error) {
      console.error('❌ Balance call failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Overall error:', error);
  }
}

// Run the test
testFrontendBalanceFetch();