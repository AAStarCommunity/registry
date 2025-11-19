import { ethers } from 'ethers';

const SEPOLIA_RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N';
const OWNER_PK = '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81';

const GTOKEN_STAKING = '0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0';
const NEW_MYSBT = '0xc364A68Abd38a6428513abE519dEEA410803BB5A';

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(OWNER_PK, provider);

  console.log('🔐 Authorize NEW MySBT as Locker\n');
  console.log('Owner:', wallet.address);
  console.log('GTokenStaking:', GTOKEN_STAKING);
  console.log('NEW MySBT:', NEW_MYSBT);
  console.log('');

  // configureLocker ABI with arrays (new version)
  const stakingAbi = [
    'function configureLocker(address locker, bool authorized, uint256 feeRateBps, uint256 minExitFee, uint256 maxFeePercent, uint256[] timeTiers, uint256[] tierFees, address feeRecipient)',
    'function getLockerConfig(address) view returns (tuple(bool authorized, uint256 feeRateBps, uint256 minExitFee, uint256 maxFeePercent, uint256[] timeTiers, uint256[] tierFees, address feeRecipient))',
    'function owner() view returns (address)'
  ];

  const staking = new ethers.Contract(GTOKEN_STAKING, stakingAbi, wallet);

  // Verify ownership
  const owner = await staking.owner();
  console.log('Verifying ownership:');
  console.log('  Contract owner:', owner);
  console.log('  Signer:', wallet.address);
  console.log('  ', owner.toLowerCase() === wallet.address.toLowerCase() ? '✅ Signer is owner' : '❌ Signer is NOT owner');
  console.log('');

  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.log('❌ ERROR: Current signer is not the owner');
    return;
  }

  // Check current status
  const currentConfig = await staking.getLockerConfig(NEW_MYSBT);
  console.log('Current locker config:');
  console.log('  Authorized:', currentConfig.authorized);
  console.log('');

  if (currentConfig.authorized) {
    console.log('✅ MySBT is already authorized. No action needed.');
    return;
  }

  // Authorize MySBT
  console.log('Calling configureLocker...');
  console.log('Parameters:');
  console.log('  locker:', NEW_MYSBT);
  console.log('  authorized: true');
  console.log('  feeRateBps: 0');
  console.log('  minExitFee: 0');
  console.log('  maxFeePercent: 0');
  console.log('  timeTiers: []');
  console.log('  tierFees: []');
  console.log('  feeRecipient: 0x0000000000000000000000000000000000000000');
  console.log('');

  try {
    const tx = await staking.configureLocker(
      NEW_MYSBT,
      true,  // authorized
      0,     // feeRateBps
      0,     // minExitFee
      0,     // maxFeePercent
      [],    // timeTiers
      [],    // tierFees
      ethers.ZeroAddress  // feeRecipient
    );

    console.log('✅ Transaction sent!');
    console.log('   Hash:', tx.hash);
    console.log('   Waiting for confirmation...');

    const receipt = await tx.wait();

    console.log('');
    console.log('🎉 SUCCESS!');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());
    console.log('');

    // Verify the change
    const newConfig = await staking.getLockerConfig(NEW_MYSBT);
    console.log('Verification:');
    console.log('  Authorized:', newConfig.authorized ? '✅ true' : '❌ false');
    console.log('');

    if (newConfig.authorized) {
      console.log('🎊 NEW MySBT is now authorized as locker!');
      console.log('   You can now use airdropMint function!');
    }
  } catch (error) {
    console.log('❌ FAILED');
    console.log('');
    console.log('Error:', error.message);

    if (error.data) {
      console.log('Error data:', error.data);
    }

    throw error;
  }
}

main().catch(() => process.exit(1));
