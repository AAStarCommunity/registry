/**
 * Test script for MySBT mintOrAddMembership
 * Tests if a community owner can mint SBT for an address
 */

import { ethers } from 'ethers';

// Note: Environment variables are loaded via --env-file=.env flag in package.json script

// Contract addresses and ABIs
const MYSBT_ADDRESS = '0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C';
const GTOKEN_ADDRESS = '0x7D49e4E72887fAaBA8e49fE7e49b5F02b04d2028';
const REGISTRY_ADDRESS = '0x05Fa33Cc7bb3E909Cf19e0e791Da5A7D16789918';

const MYSBT_ABI = [
  'function mintOrAddMembership(address user, string memory metadata) external',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)'
];

const GTOKEN_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function decimals() external view returns (uint8)'
];

const REGISTRY_ABI = [
  'function isRegisteredCommunity(address community) external view returns (bool)',
  'function getCommunityProfile(address community) external view returns (tuple(string name, uint8 nodeType, uint256 registeredAt, bool isActive))'
];

const RPC_URL = process.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

async function main() {
  console.log('🧪 Testing MySBT mintOrAddMembership\n');

  // Get private key from env
  const privateKey = process.env.COMMUNITY_OWNER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ COMMUNITY_OWNER_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const ownerAddress = wallet.address;

  console.log('📍 Configuration:');
  console.log('  Network:', 'Sepolia Testnet');
  console.log('  RPC:', RPC_URL);
  console.log('  Community Owner:', ownerAddress);
  console.log('  MySBT:', MYSBT_ADDRESS);
  console.log('  GToken:', GTOKEN_ADDRESS);
  console.log('  Registry:', REGISTRY_ADDRESS);
  console.log();

  // Connect to contracts
  const mySBT = new ethers.Contract(MYSBT_ADDRESS, MYSBT_ABI, wallet);
  const gToken = new ethers.Contract(GTOKEN_ADDRESS, GTOKEN_ABI, wallet);
  const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);

  // Step 1: Check if community is registered
  console.log('1️⃣ Checking community registration...');
  try {
    const isRegistered = await registry.isRegisteredCommunity(ownerAddress);
    console.log('  Is Registered:', isRegistered);

    if (isRegistered) {
      const profile = await registry.getCommunityProfile(ownerAddress);
      console.log('  Community Name:', profile.name);
      console.log('  Node Type:', ['PAYMASTER_AOA', 'PAYMASTER_SUPER', 'ANODE', 'KMS'][Number(profile.nodeType)]);
      console.log('  Is Active:', profile.isActive);
    } else {
      console.error('  ❌ Community is not registered in Registry!');
      console.log('  💡 You need to register this community first');
      process.exit(1);
    }
  } catch (error) {
    console.error('  ❌ Failed to check registration:', error.message);
    process.exit(1);
  }
  console.log('  ✅ Community registration verified\n');

  // Step 2: Check owner's GToken balance
  console.log('2️⃣ Checking owner GToken balance...');
  try {
    const decimals = await gToken.decimals();
    const balance = await gToken.balanceOf(ownerAddress);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('  Balance:', balanceFormatted, 'GT');

    if (Number(balanceFormatted) < 1) {
      console.warn('  ⚠️ Low GToken balance, may not be enough for operations');
    }
  } catch (error) {
    console.error('  ❌ Failed to check GToken balance:', error.message);
  }
  console.log('  ✅ GToken balance checked\n');

  // Step 3: Get target address for minting
  const targetAddress = process.env.TEST_TARGET_ADDRESS || '0x57b2e6f08399c276b2c1595825219d29990d0921';
  console.log('3️⃣ Target address for minting:');
  console.log('  Address:', targetAddress);

  // Check if target already has SBT
  try {
    const balance = await mySBT.balanceOf(targetAddress);
    console.log('  Current SBT balance:', balance.toString());

    if (balance > 0n) {
      console.log('  ℹ️ Target already has', balance.toString(), 'SBT(s)');
      console.log('  💡 This might be why mint is failing - address already has SBT');

      // Get token IDs
      for (let i = 0; i < Number(balance); i++) {
        try {
          const tokenId = await mySBT.tokenOfOwnerByIndex(targetAddress, i);
          console.log('    Token', i + 1, '- ID:', tokenId.toString());
        } catch (e) {
          // Token enumeration might not be supported
        }
      }
    }
  } catch (error) {
    console.log('  ℹ️ Could not check target SBT balance:', error.message);
  }

  // Check target's GToken balance
  try {
    const decimals = await gToken.decimals();
    const targetBalance = await gToken.balanceOf(targetAddress);
    const targetBalanceFormatted = ethers.formatUnits(targetBalance, decimals);
    console.log('  Target GToken balance:', targetBalanceFormatted, 'GT');

    if (Number(targetBalanceFormatted) < 0.4) {
      console.warn('  ⚠️ Target has less than 0.4 GT required for minting');
    }
  } catch (error) {
    console.error('  ❌ Failed to check target GToken balance:', error.message);
  }
  console.log();

  // Step 4: Prepare metadata
  const metadata = JSON.stringify({
    communityAddress: ownerAddress,
    communityName: 'BreadCommunity',
    registeredAt: new Date().toISOString(),
    nodeType: 'PAYMASTER_SUPER',
    isActive: true
  }, null, 2);

  console.log('4️⃣ Preparing metadata:');
  console.log(metadata);
  console.log();

  // Step 5: Estimate gas for mint
  console.log('5️⃣ Estimating gas for mintOrAddMembership...');
  try {
    const gasEstimate = await mySBT.mintOrAddMembership.estimateGas(targetAddress, metadata);
    console.log('  Gas estimate:', gasEstimate.toString());
    console.log('  ✅ Gas estimation successful\n');
  } catch (error) {
    console.error('  ❌ Gas estimation failed!');
    console.error('  Error:', error.message);
    console.log();
    console.log('🔍 Possible reasons:');
    console.log('  1. Target address already has SBT from this community');
    console.log('  2. Community is not properly registered');
    console.log('  3. Target address does not have enough GToken (0.4 GT required)');
    console.log('  4. Contract is paused or has restrictions');
    console.log('  5. Caller does not have permission to mint');
    console.log();

    // Try to get more error details
    console.log('🔧 Debug: Trying to call mintOrAddMembership directly...');
    try {
      await mySBT.mintOrAddMembership.staticCall(targetAddress, metadata);
    } catch (staticError) {
      console.error('Static call error:', staticError);

      // Try to decode revert reason
      if (staticError.data) {
        try {
          const reason = ethers.toUtf8String('0x' + staticError.data.slice(138));
          console.log('Revert reason:', reason);
        } catch (e) {
          console.log('Could not decode revert reason');
        }
      }
    }

    process.exit(1);
  }

  // Step 6: Execute mint transaction
  console.log('6️⃣ Executing mintOrAddMembership transaction...');
  try {
    const tx = await mySBT.mintOrAddMembership(targetAddress, metadata);
    console.log('  Transaction hash:', tx.hash);
    console.log('  Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('  ✅ Transaction confirmed!');
    console.log('  Block number:', receipt.blockNumber);
    console.log('  Gas used:', receipt.gasUsed.toString());
    console.log();

    // Check final balance
    const finalBalance = await mySBT.balanceOf(targetAddress);
    console.log('  Final SBT balance:', finalBalance.toString());
    console.log();
    console.log('🎉 Mint successful!');

  } catch (error) {
    console.error('  ❌ Transaction failed!');
    console.error('  Error:', error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
