import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N');
const userAddress = '0x411BD567E46C0781248dbB6a9211891C032885e5';

// xPNTsFactory contract
const factoryAddress = '0x356CF363E136b0880C8F48c9224A37171f375595';
const factoryABI = [
  "function hasToken(address community) view returns (bool)",
  "function getTokenAddress(address community) view returns (address)",
];

// MySBT contract
const mySBTAddress = '0xB330a8A396Da67A1b50903E734750AAC81B0C711';
const mySBTABI = [
  "function balanceOf(address owner) view returns (uint256)",
];

console.log('🔍 Checking wallet:', userAddress);
console.log('');

// Check xPNTs
try {
  const factory = new ethers.Contract(factoryAddress, factoryABI, provider);
  const hasToken = await factory.hasToken(userAddress);

  if (hasToken) {
    const tokenAddress = await factory.getTokenAddress(userAddress);
    console.log('✅ xPNTs Contract: DEPLOYED');
    console.log('   Address:', tokenAddress);
  } else {
    console.log('❌ xPNTs Contract: NOT DEPLOYED');
  }
} catch (err) {
  console.log('❌ xPNTs Check Failed:', err.message);
}

console.log('');

// Check MySBT
try {
  const mySBT = new ethers.Contract(mySBTAddress, mySBTABI, provider);
  const balance = await mySBT.balanceOf(userAddress);

  console.log('✅ SBT Contract: OFFICIAL MySBT');
  console.log('   Address:', mySBTAddress);
  console.log('   Your SBT Balance:', balance.toString());

  if (balance > 0n) {
    console.log('   Status: You have SBT tokens');
  } else {
    console.log('   Status: No tokens yet (will use default MySBT)');
  }
} catch (err) {
  console.log('❌ MySBT Check Failed:', err.message);
}
