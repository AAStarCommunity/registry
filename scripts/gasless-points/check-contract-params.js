/**
 * Check MySBT contract parameters for GToken requirements
 */
import { ethers } from 'ethers';

const MYSBT_ADDRESS = '0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C';
const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N';

async function checkContractParams() {
  console.log('🔍 Checking MySBT Contract Parameters\n');

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const sbtContract = new ethers.Contract(
    MYSBT_ADDRESS,
    [
      'function mintFee() view returns (uint256)',
      'function minLockAmount() view returns (uint256)',
      'function gToken() view returns (address)'
    ],
    provider
  );

  try {
    console.log('=== GToken Requirements ===\n');

    // Get mintFee
    const mintFee = await sbtContract.mintFee();
    const mintFeeFormatted = ethers.formatEther(mintFee);
    console.log('mintFee:', mintFeeFormatted, 'GT');
    console.log('  (Fee charged when minting)');

    // Get minLockAmount
    const minLockAmount = await sbtContract.minLockAmount();
    const minLockAmountFormatted = ethers.formatEther(minLockAmount);
    console.log('\nminLockAmount:', minLockAmountFormatted, 'GT');
    console.log('  (Minimum amount to lock)');

    // Calculate total
    const total = Number(mintFeeFormatted) + Number(minLockAmountFormatted);
    console.log('\n=== Total Requirements ===');
    console.log('Total GToken needed:', total.toFixed(1), 'GT');
    console.log('  = mintFee + minLockAmount');
    console.log('  =', mintFeeFormatted, '+', minLockAmountFormatted);

    console.log('\n=== Approval Requirements ===');
    console.log('❓ Question: Does allowance need to cover:');
    console.log('   A) Only minLockAmount (', minLockAmountFormatted, 'GT)');
    console.log('   B) Both mintFee + minLockAmount (', total.toFixed(1), 'GT)');
    console.log('\n💡 Recommendation: Approve', total.toFixed(1), 'GT to be safe');

    // Get GToken address for reference
    const gTokenAddr = await sbtContract.gToken();
    console.log('\n=== GToken Address ===');
    console.log('Contract GToken:', gTokenAddr);

  } catch (error) {
    console.error('❌ Error checking contract params:', error.message);
  }
}

checkContractParams().catch(console.error);
