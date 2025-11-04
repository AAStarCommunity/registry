import { ethers } from 'ethers';

async function testRegistryV2_1() {
  // Use private Alchemy RPC
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N');

  const registryAddress = '0x3F7E822C7FD54dBF8df29C6EC48E08Ce8AcEBeb3';

  const REGISTRY_V2_1_ABI = [
    "function getCommunityCount() view returns (uint256)",
    "function getCommunities(uint256 offset, uint256 limit) view returns (address[])",
  ];

  const registry = new ethers.Contract(registryAddress, REGISTRY_V2_1_ABI, provider);

  try {
    console.log('Testing Registry v2.1 at:', registryAddress);
    console.log('');

    // Test getCommunityCount
    console.log('1. Testing getCommunityCount()...');
    const count = await registry.getCommunityCount();
    console.log('   Community count:', count.toString());
    console.log('   ✅ getCommunityCount() works!');
    console.log('');

    // Test getCommunities
    console.log('2. Testing getCommunities(0, 10)...');
    const communities = await registry.getCommunities(0, 10);
    console.log('   Communities:', communities);
    console.log('   ✅ getCommunities() works!');
    console.log('');

    console.log('🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('   Error data:', error.data);
    }
  }
}

testRegistryV2_1();
