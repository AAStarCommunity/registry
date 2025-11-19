/**
 * Simulate the actual mint call to get revert reason
 */
import { ethers } from 'ethers';

const TARGET_ADDRESS = '0x556c22d9d81c43a864caf3e524aa2fded5948650';
const OPERATOR_ADDRESS = '0x92a30Ef64b0b750220B2b3BAFE4F3121263d45b3';
const MYSBT_ADDRESS = '0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C';
const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N';

// Metadata from the error
const METADATA = {
  "communityAddress": "0x92a30ef64b0b750220b2b3bafe4f3121263d45b3",
  "communityName": "BreadCommunity",
  "registeredAt": "2025-11-10T07:56:24.000Z",
  "nodeType": "PAYMASTER_SUPER",
  "isActive": true
};

async function simulateMint() {
  console.log('🧪 Simulating Mint Call\n');

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // MySBT ABI with mintOrAddMembership
  const sbtAbi = [
    'function mintOrAddMembership(address user, string memory metadata) external',
    'function balanceOf(address owner) view returns (uint256)',
    'function hasMinted(address user, address community) view returns (bool)'
  ];

  const sbtContract = new ethers.Contract(MYSBT_ADDRESS, sbtAbi, provider);

  // Convert metadata to string
  const metadataStr = JSON.stringify(METADATA);
  console.log('Target:', TARGET_ADDRESS);
  console.log('Metadata:', metadataStr);
  console.log('');

  // Try to estimate gas (this will show the revert reason)
  console.log('Attempting to estimate gas for mint call...\n');

  try {
    // Create the transaction
    const tx = await sbtContract.mintOrAddMembership.populateTransaction(
      TARGET_ADDRESS,
      metadataStr
    );

    // Try to estimate gas
    const gasEstimate = await provider.estimateGas({
      from: OPERATOR_ADDRESS,
      to: MYSBT_ADDRESS,
      data: tx.data
    });

    console.log('✅ Gas estimate succeeded:', gasEstimate.toString());
    console.log('This means the transaction should work!');

  } catch (error) {
    console.log('❌ Gas estimation failed - Transaction will revert\n');
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    console.log('');

    // Try to get more details
    if (error.data) {
      console.log('Error data:', error.data);

      // Try to decode the error
      try {
        // Common error signatures
        const errorInterfaces = [
          'error InsufficientBalance(uint256 required, uint256 available)',
          'error AlreadyMinted(address user, address community)',
          'error Unauthorized(address caller)',
          'error InsufficientGTokenBalance(address user, uint256 balance)'
        ];

        const iface = new ethers.Interface(errorInterfaces);
        const decoded = iface.parseError(error.data);
        console.log('Decoded error:', decoded);
      } catch (decodeError) {
        console.log('Could not decode custom error');
      }
    }

    // Check hasMinted status
    console.log('\n=== Checking hasMinted Status ===');
    try {
      const hasMinted = await sbtContract.hasMinted(TARGET_ADDRESS, OPERATOR_ADDRESS);
      console.log(`hasMinted(${TARGET_ADDRESS.slice(0, 10)}..., ${OPERATOR_ADDRESS.slice(0, 10)}...): ${hasMinted}`);

      if (hasMinted) {
        console.log('\n❌ FOUND THE ISSUE!');
        console.log('This address has already been minted by this community!');
        console.log('MySBT prevents the same community from minting to the same address twice.');
      }
    } catch (e) {
      console.log('hasMinted check failed:', e.message);
    }

    // Try eth_call to get revert reason
    console.log('\n=== Trying eth_call for detailed revert ===');
    try {
      await provider.call({
        from: OPERATOR_ADDRESS,
        to: MYSBT_ADDRESS,
        data: tx.data
      });
    } catch (callError) {
      console.log('Call error:', callError.message);
      if (callError.data) {
        console.log('Call error data:', callError.data);
      }
    }
  }
}

simulateMint().catch(console.error);
