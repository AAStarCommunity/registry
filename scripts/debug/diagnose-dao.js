import { ethers } from 'ethers';

const SEPOLIA_RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N';

const DAO = '0xF7Bf79AcB7F3702b9DbD397d8140ac9DE6Ce642C';
const GTOKEN = '0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc';
const NEW_MYSBT = '0xc364A68Abd38a6428513abE519dEEA410803BB5A';
const GTOKEN_STAKING = '0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0';
const REGISTRY = '0x49245E1f3c2dD99b3884ffeD410d0605Cf4dC696';

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);

  console.log('🔍 Complete DAO Diagnosis\n');
  console.log('DAO Address:', DAO);
  console.log('NEW MySBT:', NEW_MYSBT);
  console.log('');

  // 1. Check if DAO is registered
  const registryAbi = ['function isRegisteredCommunity(address) view returns (bool)'];
  const registry = new ethers.Contract(REGISTRY, registryAbi, provider);
  const isRegistered = await registry.isRegisteredCommunity(DAO);

  console.log('1️⃣ Registration Status:');
  console.log('   ', isRegistered ? '✅ DAO is registered' : '❌ DAO is NOT registered');
  console.log('');

  // 2. Check GToken balance
  const gtokenAbi = [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address,address) view returns (uint256)'
  ];
  const gtoken = new ethers.Contract(GTOKEN, gtokenAbi, provider);
  const balance = await gtoken.balanceOf(DAO);

  console.log('2️⃣ GToken Balance:');
  console.log('   ', ethers.formatEther(balance), 'GT');
  console.log('   ', balance >= ethers.parseEther('0.4') ? '✅ Sufficient' : '❌ Insufficient');
  console.log('');

  // 3. Check GToken approval to NEW MySBT
  const allowance = await gtoken.allowance(DAO, NEW_MYSBT);

  console.log('3️⃣ GToken Approval to NEW MySBT:');
  console.log('   ', ethers.formatEther(allowance), 'GT');
  console.log('   ', allowance >= ethers.parseEther('0.4') ? '✅ Sufficient' : '❌ Need to approve');
  console.log('');

  // 4. Check if NEW MySBT is authorized locker
  const stakingAbi = [
    'function getLockerConfig(address) view returns (bool authorized, uint256 feeRateBps, uint256 minExitFee, uint256 maxFeePercent, address feeRecipient)'
  ];
  const staking = new ethers.Contract(GTOKEN_STAKING, stakingAbi, provider);
  const lockerConfig = await staking.getLockerConfig(NEW_MYSBT);

  console.log('4️⃣ MySBT Locker Authorization:');
  console.log('   ', lockerConfig.authorized ? '✅ MySBT IS authorized locker' : '❌ MySBT NOT authorized locker');
  console.log('');

  // 5. Check what GTokenStaking address MySBT uses
  const mysbtAbi = ['function GTOKEN_STAKING() view returns (address)'];
  const mysbt = new ethers.Contract(NEW_MYSBT, mysbtAbi, provider);
  const mysbtStakingAddr = await mysbt.GTOKEN_STAKING();

  console.log('5️⃣ MySBT Configuration:');
  console.log('   GTokenStaking address:', mysbtStakingAddr);
  console.log('   ', mysbtStakingAddr.toLowerCase() === GTOKEN_STAKING.toLowerCase() ? '✅ Correct' : '❌ Wrong address!');
  console.log('');

  // Summary
  console.log('═══════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════');

  const allGood = isRegistered &&
                  balance >= ethers.parseEther('0.4') &&
                  allowance >= ethers.parseEther('0.4') &&
                  lockerConfig.authorized &&
                  mysbtStakingAddr.toLowerCase() === GTOKEN_STAKING.toLowerCase();

  if (allGood) {
    console.log('✅ Everything is configured correctly!');
    console.log('');
    console.log('⚠️  If airdropMint still fails, possible reasons:');
    console.log('1. Browser cache - try hard refresh (Ctrl+Shift+R)');
    console.log('2. Frontend using old ABI - check if page was rebuilt');
    console.log('3. MetaMask connected to wrong account');
    console.log('4. User already has SBT from this community');
  } else {
    console.log('❌ Found issues that need fixing:');
    console.log('');

    if (!isRegistered) {
      console.log('• DAO needs to be registered as a community');
    }
    if (balance < ethers.parseEther('0.4')) {
      console.log('• DAO needs more GToken (current:', ethers.formatEther(balance), 'GT)');
    }
    if (allowance < ethers.parseEther('0.4')) {
      console.log('• ⭐ DAO needs to approve NEW MySBT:');
      console.log('  GToken.approve("' + NEW_MYSBT + '", ethers.parseEther("1000"))');
    }
    if (!lockerConfig.authorized) {
      console.log('• NEW MySBT needs to be authorized as locker in GTokenStaking');
    }
    if (mysbtStakingAddr.toLowerCase() !== GTOKEN_STAKING.toLowerCase()) {
      console.log('• MySBT is configured with wrong GTokenStaking address');
    }
  }
}

main().catch(console.error);
