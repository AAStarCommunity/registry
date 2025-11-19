/**
 * Debug mint revert error
 */
import { ethers } from 'ethers';

const TARGET_ADDRESS = '0x556c22d9d81c43a864caf3e524aa2fded5948650';
const OPERATOR_ADDRESS = '0x92a30Ef64b0b750220B2b3BAFE4F3121263d45b3';
const MYSBT_ADDRESS = '0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C';
const GTOKEN_ADDRESS = '0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc';
const REGISTRY_ADDRESS = '0x49245E1f3c2dD99b3884ffeD410d0605Cf4dC696';
const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N';

async function debugMintError() {
  console.log('🔍 Debugging Mint Revert Error\n');
  console.log('Target Address:', TARGET_ADDRESS);
  console.log('Operator:', OPERATOR_ADDRESS);
  console.log('MySBT Contract:', MYSBT_ADDRESS);
  console.log('');

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // 1. Check if target already has SBT
  console.log('=== 1. Checking Target SBT Balance ===');
  const sbtAbi = [
    'function balanceOf(address owner) view returns (uint256)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)'
  ];
  const sbtContract = new ethers.Contract(MYSBT_ADDRESS, sbtAbi, provider);

  const sbtBalance = await sbtContract.balanceOf(TARGET_ADDRESS);
  console.log(`SBT Balance: ${sbtBalance}`);
  console.log(`Has SBT: ${sbtBalance > 0n}`);

  if (sbtBalance > 0n) {
    console.log('\n❌ TARGET ALREADY HAS SBT!');
    console.log('This is likely the reason for revert.');
    try {
      for (let i = 0; i < Number(sbtBalance); i++) {
        const tokenId = await sbtContract.tokenOfOwnerByIndex(TARGET_ADDRESS, i);
        console.log(`  Token ${i}: ${tokenId}`);
      }
    } catch (e) {
      console.log('  (Could not enumerate tokens)');
    }
  } else {
    console.log('✅ Target does NOT have SBT yet');
  }

  // 2. Check target's GToken balance
  console.log('\n=== 2. Checking Target GToken Balance ===');
  const gtokenAbi = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)'
  ];
  const gtokenContract = new ethers.Contract(GTOKEN_ADDRESS, gtokenAbi, provider);

  let decimals = 18;
  try {
    decimals = await gtokenContract.decimals();
  } catch (e) {
    console.log('Using default decimals: 18');
  }

  const gtBalance = await gtokenContract.balanceOf(TARGET_ADDRESS);
  const gtBalanceFormatted = ethers.formatUnits(gtBalance, decimals);
  console.log(`GToken Balance: ${gtBalanceFormatted} GT`);
  console.log(`Has enough (>= 0.4 GT): ${Number(gtBalanceFormatted) >= 0.4}`);

  if (Number(gtBalanceFormatted) < 0.4) {
    console.log('\n❌ INSUFFICIENT GTOKEN BALANCE!');
    console.log('Requirement: >= 0.4 GT');
    console.log(`Current: ${gtBalanceFormatted} GT`);
  }

  // 3. Check operator registration
  console.log('\n=== 3. Checking Operator Registration ===');
  const registryAbi = [
    'function isRegisteredCommunity(address community) view returns (bool)',
    'function getCommunityProfile(address community) view returns (tuple(string name, string ensName, uint256 nodeType, bool isActive, uint256 stakedAmount, uint256 registeredAt))'
  ];
  const registryContract = new ethers.Contract(REGISTRY_ADDRESS, registryAbi, provider);

  const isRegistered = await registryContract.isRegisteredCommunity(OPERATOR_ADDRESS);
  console.log(`Is Registered: ${isRegistered}`);

  if (isRegistered) {
    try {
      const profile = await registryContract.getCommunityProfile(OPERATOR_ADDRESS);
      console.log(`Community Name: ${profile.name}`);
      console.log(`Node Type: ${profile.nodeType}`);
      console.log(`Is Active: ${profile.isActive}`);
      console.log(`Staked Amount: ${ethers.formatEther(profile.stakedAmount)} sGT`);

      if (!profile.isActive) {
        console.log('\n❌ OPERATOR NOT ACTIVE!');
      }
    } catch (e) {
      console.log('Error getting profile:', e.message);
    }
  } else {
    console.log('\n❌ OPERATOR NOT REGISTERED!');
  }

  // 4. Check operator's GToken balance
  console.log('\n=== 4. Checking Operator GToken Balance ===');
  const opGtBalance = await gtokenContract.balanceOf(OPERATOR_ADDRESS);
  const opGtBalanceFormatted = ethers.formatUnits(opGtBalance, decimals);
  console.log(`Operator GToken Balance: ${opGtBalanceFormatted} GT`);

  // Summary
  console.log('\n=== SUMMARY ===');
  const issues = [];

  if (sbtBalance > 0n) {
    issues.push('❌ Target already has SBT');
  }

  if (Number(gtBalanceFormatted) < 0.4) {
    issues.push('❌ Target has insufficient GToken (< 0.4 GT)');
  }

  if (!isRegistered) {
    issues.push('❌ Operator not registered');
  }

  if (issues.length > 0) {
    console.log('\n🚫 Issues found:');
    issues.forEach(issue => console.log(issue));
  } else {
    console.log('\n✅ All checks passed - revert reason unknown, might be contract-specific logic');
  }
}

debugMintError().catch(console.error);
