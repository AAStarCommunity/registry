import { ethers } from 'ethers';
import { getCoreContracts, MySBTABI, RegistryABI, CORE_ADDRESSES } from '@aastar/shared-config';

// Contract addresses from the error
const MYSBT_ADDRESS = '0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C';
const OPERATOR_ADDRESS = '0xF7Bf79AcB7F3702b9DbD397d8140ac9DE6Ce642C';
const TARGET_USER_1 = '0x935f8694855fa9f1d1520e43689219ed4fff8c97';
const TARGET_USER_2 = '0x65cc20b63739d372176f1501c253de4e03254d16';

// Use Sepolia RPC
const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
const provider = new ethers.JsonRpcProvider(RPC_URL);

const GTokenABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

async function main() {
  console.log('🔍 Debugging Airdrop Failure\n');
  console.log('Operator:', OPERATOR_ADDRESS);
  console.log('MySBT Contract:', MYSBT_ADDRESS);
  console.log('Target Users:', [TARGET_USER_1, TARGET_USER_2]);
  console.log('');

  const core = getCoreContracts('sepolia');
  console.log('Core contracts:');
  console.log('  Registry:', core.registry);
  console.log('  GToken:', CORE_ADDRESSES.gToken);
  console.log('');

  const mySBT = new ethers.Contract(MYSBT_ADDRESS, MySBTABI, provider);
  const gToken = new ethers.Contract(CORE_ADDRESSES.gToken, GTokenABI, provider);
  const registry = new ethers.Contract(core.registry, RegistryABI, provider);

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
      console.log('   ⚠️ Could not check paused status:', e.message);
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

    // 6. Try to simulate the call and get actual revert reason
    console.log('\n6️⃣ Simulating airdropMint call to get revert reason...');
    try {
      const metadata = JSON.stringify({
        communityAddress: OPERATOR_ADDRESS,
        communityName: "aaaCommunity",
        registeredAt: "2025-11-10T08:18:24.000Z",
        nodeType: "PAYMASTER_SUPER",
        isActive: true
      });

      // Simulate the call from operator's address
      const result = await mySBT.airdropMint.staticCall(TARGET_USER_1, metadata, {
        from: OPERATOR_ADDRESS
      });

      console.log('   ✅ staticCall succeeded! Token ID:', result[0].toString(), 'isNewMint:', result[1]);
      console.log('   \n   🤔 Call should work... Let me check contract code.');
    } catch (error) {
      console.log('   ❌ staticCall failed with error:');
      console.log('   Message:', error.message);

      if (error.data) {
        console.log('   Error data:', error.data);

        // Try to decode error
        try {
          const iface = new ethers.Interface([
            'error InvalidAddress()',
            'error InvalidParameter(string)',
            'error CommunityNotRegistered(address)',
            'error MembershipAlreadyExists(address, address)',
            'error InsufficientGTokenBalance(address, uint256, uint256)'
          ]);

          const decoded = iface.parseError(error.data);
          console.log('   Decoded error:', decoded);
        } catch (e) {
          console.log('   Could not decode error data');
        }
      }

      if (error.reason) {
        console.log('   Revert reason:', error.reason);
      }

      // Check common issues
      if (error.message.includes('function selector was not recognized') ||
          error.message.includes('function does not exist')) {
        console.log('\n   ⚠️ AIRDROP_MINT FUNCTION DOES NOT EXIST IN CONTRACT');
        console.log('   This contract is not MySBT_v2.3.2 or later!');
      }
    }

    // 7. Check contract bytecode
    console.log('\n7️⃣ Checking contract code at address...');
    const code = await provider.getCode(MYSBT_ADDRESS);
    console.log(`   Contract code size: ${code.length} bytes`);

    if (code === '0x') {
      console.log('   ❌ NO CONTRACT AT THIS ADDRESS!');
    } else {
      // Check if airdropMint selector is in bytecode
      const airdropMintSelector = '6a6385c0'; // First 4 bytes of keccak256("airdropMint(address,string)")
      if (code.toLowerCase().includes(airdropMintSelector)) {
        console.log(`   ✅ airdropMint function selector (0x${airdropMintSelector}) found in bytecode`);
      } else {
        console.log(`   ❌ airdropMint function selector (0x${airdropMintSelector}) NOT found in bytecode`);
        console.log(`   \n   ⚠️ THIS CONTRACT DOES NOT HAVE airdropMint FUNCTION!`);
        console.log(`   You need to deploy MySBT_v2.3.2 or later.`);
        console.log(`   \n   Current contract at ${MYSBT_ADDRESS} is an older version.`);
      }
    }

  } catch (error) {
    console.error('\n❌ Error during checks:', error.message);
    console.error(error);
  }
}

main().catch(console.error);
