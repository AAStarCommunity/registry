import { ethers } from 'ethers';

// Contract addresses from the error
const MYSBT_ADDRESS = '0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C';
const OPERATOR_ADDRESS = '0xF7Bf79AcB7F3702b9DbD397d8140ac9DE6Ce642C';
const TARGET_USER_1 = '0x935f8694855fa9f1d1520e43689219ed4fff8c97';
const TARGET_USER_2 = '0x65cc20b63739d372176f1501c253de4e03254d16';

// RPC
const provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/eth_sepolia');

// Get addresses from shared-config
const CORE_ADDRESSES = {
  gToken: '0x28Cb0B324cb9b9fA3Bf84d1E0dA1AC6603113A2d',
  registry: '0xAc1D1452e19492eFbb8b331c0B71cb634b09f5a9'
};

const MySBTABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function paused() view returns (bool)',
  'function airdropMint(address user, string memory metadata) returns (uint256, bool)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function MINTER_ROLE() view returns (bytes32)'
];

const GTokenABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const RegistryABI = [
  'function isRegisteredCommunity(address) view returns (bool)',
  'function getCommunityProfile(address) view returns (tuple(string name, uint8 nodeType, uint256 registeredAt, bool isActive))'
];

async function main() {
  console.log('🔍 Debugging Airdrop Failure\n');
  console.log('Operator:', OPERATOR_ADDRESS);
  console.log('MySBT Contract:', MYSBT_ADDRESS);
  console.log('Target Users:', [TARGET_USER_1, TARGET_USER_2]);
  console.log('');

  const mySBT = new ethers.Contract(MYSBT_ADDRESS, MySBTABI, provider);
  const gToken = new ethers.Contract(CORE_ADDRESSES.gToken, GTokenABI, provider);
  const registry = new ethers.Contract(CORE_ADDRESSES.registry, RegistryABI, provider);

  try {
    // 1. Check if contract is paused
    console.log('1️⃣ Checking MySBT contract status...');
    try {
      const isPaused = await mySBT.paused();
      console.log(`   Contract paused: ${isPaused}`);
      if (isPaused) {
        console.log('   ❌ CONTRACT IS PAUSED - This is why airdrop fails!');
        return;
      }
    } catch (e) {
      console.log('   ⚠️ Could not check paused status (function may not exist)');
    }

    // 2. Check if operator is registered
    console.log('\n2️⃣ Checking operator registration...');
    const isRegistered = await registry.isRegisteredCommunity(OPERATOR_ADDRESS);
    console.log(`   Operator registered: ${isRegistered}`);

    if (!isRegistered) {
      console.log('   ❌ OPERATOR NOT REGISTERED - This is why airdrop fails!');
      return;
    }

    const profile = await registry.getCommunityProfile(OPERATOR_ADDRESS);
    console.log(`   Community name: ${profile.name}`);
    console.log(`   Node type: ${profile.nodeType}`);
    console.log(`   Is active: ${profile.isActive}`);

    if (!profile.isActive) {
      console.log('   ❌ COMMUNITY NOT ACTIVE - This is why airdrop fails!');
      return;
    }

    // 3. Check GToken balance
    console.log('\n3️⃣ Checking operator GToken balance...');
    const decimals = await gToken.decimals();
    const balance = await gToken.balanceOf(OPERATOR_ADDRESS);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log(`   Operator GToken balance: ${balanceFormatted} GT`);

    const required = 0.4 * 2; // 2 addresses
    console.log(`   Required for 2 airdrops: ${required} GT`);

    if (Number(balanceFormatted) < required) {
      console.log(`   ❌ INSUFFICIENT GTOKEN BALANCE - This is why airdrop fails!`);
      return;
    }
    console.log('   ✅ Balance sufficient');

    // 4. Check GToken allowance to MySBT
    console.log('\n4️⃣ Checking GToken allowance...');
    const allowance = await gToken.allowance(OPERATOR_ADDRESS, MYSBT_ADDRESS);
    const allowanceFormatted = ethers.formatUnits(allowance, decimals);
    console.log(`   Current allowance: ${allowanceFormatted} GT`);
    console.log(`   Required allowance: ${required} GT`);

    if (Number(allowanceFormatted) < required) {
      console.log(`   ❌ INSUFFICIENT ALLOWANCE - This is why airdrop fails!`);
      console.log(`   \n   Solution: Operator needs to approve MySBT contract:`);
      console.log(`   gToken.approve("${MYSBT_ADDRESS}", ethers.parseEther("${required}"))`);
      return;
    }
    console.log('   ✅ Allowance sufficient');

    // 5. Check if users already have SBT
    console.log('\n5️⃣ Checking if target users already have SBT...');
    for (const user of [TARGET_USER_1, TARGET_USER_2]) {
      const balance = await mySBT.balanceOf(user);
      console.log(`   ${user}: ${balance.toString()} SBTs`);
      if (balance > 0n) {
        console.log(`   ⚠️ User already has SBT (will add membership, not mint new)`);
      }
    }

    // 6. Check if MySBT contract has airdropMint function
    console.log('\n6️⃣ Checking if airdropMint function exists...');
    try {
      // Try to call the function with callStatic to see if it exists
      const metadata = JSON.stringify({
        communityAddress: OPERATOR_ADDRESS,
        communityName: "Test",
        nodeType: "PAYMASTER_SUPER",
        isActive: true
      });

      // This will fail but give us the actual revert reason
      const tx = await mySBT.airdropMint.staticCall(TARGET_USER_1, metadata);
      console.log('   ✅ Function exists and can be called (unexpected - should have succeeded)');
    } catch (error) {
      console.log('   ❌ Function call failed with error:');
      console.log('   ', error.message);

      // Try to extract revert reason
      if (error.data) {
        console.log('   Revert data:', error.data);
      }
      if (error.reason) {
        console.log('   Revert reason:', error.reason);
      }

      // Check common issues
      if (error.message.includes('function selector was not recognized')) {
        console.log('\n   ⚠️ AIRDROP_MINT FUNCTION DOES NOT EXIST IN CONTRACT');
        console.log('   This contract may not be MySBT_v2.3.2 or later!');
      }
    }

    console.log('\n7️⃣ Checking contract code at address...');
    const code = await provider.getCode(MYSBT_ADDRESS);
    console.log(`   Contract code size: ${code.length} bytes`);
    if (code === '0x') {
      console.log('   ❌ NO CONTRACT AT THIS ADDRESS!');
    } else {
      // Check if airdropMint selector is in bytecode
      const airdropMintSelector = '0x6a6385c0'; // First 4 bytes of keccak256("airdropMint(address,string)")
      if (code.includes(airdropMintSelector.slice(2))) {
        console.log(`   ✅ airdropMint function selector found in bytecode`);
      } else {
        console.log(`   ❌ airdropMint function selector NOT found in bytecode`);
        console.log(`   This contract does NOT have airdropMint function!`);
        console.log(`   You need to deploy MySBT_v2.3.2 or later.`);
      }
    }

  } catch (error) {
    console.error('\n❌ Error during checks:', error.message);
  }
}

main().catch(console.error);
