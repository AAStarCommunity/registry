/**
 * Test script to verify SBT balance for address
 */
import { ethers } from 'ethers';

const TEST_ADDRESS = '0x57b2e6f08399c276b2c1595825219d29990d0921';
const MYSBT_ADDRESS = '0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C';
const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N';

async function checkBalance() {
  console.log('=== Testing SBT Balance ===');
  console.log('Address:', TEST_ADDRESS);
  console.log('MySBT Contract:', MYSBT_ADDRESS);
  console.log('RPC:', RPC_URL);
  console.log('');

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // MySBT ABI - only balanceOf function
  const sbtAbi = [
    'function balanceOf(address owner) view returns (uint256)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)'
  ];

  const sbtContract = new ethers.Contract(MYSBT_ADDRESS, sbtAbi, provider);

  try {
    console.log('Calling balanceOf...');
    const balance = await sbtContract.balanceOf(TEST_ADDRESS);
    console.log('Raw balance:', balance);
    console.log('Balance as number:', Number(balance));
    console.log('Has SBT:', balance > 0n);

    if (balance > 0n) {
      console.log('\nTrying to get token IDs...');
      for (let i = 0; i < Number(balance); i++) {
        try {
          const tokenId = await sbtContract.tokenOfOwnerByIndex(TEST_ADDRESS, i);
          console.log(`Token ${i}:`, tokenId.toString());
        } catch (e) {
          console.log(`Failed to get token ${i}:`, e.message);
        }
      }
    }
  } catch (error) {
    console.error('Error checking balance:', error);
  }
}

checkBalance().catch(console.error);
