/**
 * Check GToken allowance for the problematic address
 */
import { ethers } from 'ethers';
import { CORE_ADDRESSES } from '@aastar/shared-config';

const TARGET_ADDRESS = '0x556c22d9d81c43a864caf3e524aa2fded5948650';
const MYSBT_ADDRESS = '0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C';
const GTOKEN_ADDRESS = CORE_ADDRESSES.gToken;
const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N';

async function checkAllowance() {
  console.log('🔍 Checking GToken Allowance\n');

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const gtokenContract = new ethers.Contract(
    GTOKEN_ADDRESS,
    [
      'function balanceOf(address) view returns (uint256)',
      'function allowance(address owner, address spender) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ],
    provider
  );

  try {
    // Get decimals
    let decimals = 18;
    try {
      decimals = await gtokenContract.decimals();
      console.log('GToken decimals:', decimals);
    } catch (e) {
      console.log('Using default decimals: 18');
    }

    // Check balance
    const balance = await gtokenContract.balanceOf(TARGET_ADDRESS);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log(`\n✅ Target GToken balance: ${balanceFormatted} GT`);
    console.log(`   Has enough (≥ 0.4 GT): ${Number(balanceFormatted) >= 0.4 ? 'YES' : 'NO'}`);

    // Check allowance to MySBT contract
    const allowance = await gtokenContract.allowance(TARGET_ADDRESS, MYSBT_ADDRESS);
    const allowanceFormatted = ethers.formatUnits(allowance, decimals);
    console.log(`\n${Number(allowanceFormatted) >= 0.3 ? '✅' : '❌'} GToken allowance to MySBT: ${allowanceFormatted} GT`);
    console.log(`   Required (minLockAmount): 0.3 GT`);
    console.log(`   Has enough allowance: ${Number(allowanceFormatted) >= 0.3 ? 'YES' : 'NO'}`);

    if (Number(allowanceFormatted) < 0.3) {
      console.log('\n❌ FOUND THE ISSUE!');
      console.log('Target address has not approved GToken to MySBT contract.');
      console.log('\n📝 To fix, the target address needs to call:');
      console.log(`   GToken.approve("${MYSBT_ADDRESS}", "0.3 GT")`);
      console.log('\nOr in ethers.js:');
      console.log(`   await gtokenContract.approve("${MYSBT_ADDRESS}", ethers.parseEther("0.3"))`);
    } else {
      console.log('\n✅ Allowance is sufficient!');
    }

  } catch (error) {
    console.error('❌ Error checking allowance:', error.message);
  }
}

checkAllowance().catch(console.error);
