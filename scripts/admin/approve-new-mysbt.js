import { ethers } from 'ethers';

const SEPOLIA_RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N';
const DEPLOYER_PK = '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81';

const GTOKEN = '0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc';
const NEW_MYSBT = '0xc364A68Abd38a6428513abE519dEEA410803BB5A';

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_PK, provider);

  console.log('💰 Approve NEW MySBT to spend GToken\n');
  console.log('Deployer:', wallet.address);
  console.log('GToken:', GTOKEN);
  console.log('NEW MySBT:', NEW_MYSBT);
  console.log('');

  const gtokenAbi = [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)'
  ];

  const gtoken = new ethers.Contract(GTOKEN, gtokenAbi, wallet);

  // Check current allowance
  const currentAllowance = await gtoken.allowance(wallet.address, NEW_MYSBT);
  console.log('Current allowance:', ethers.formatEther(currentAllowance), 'GT');
  console.log('');

  // Approve 1000 GT
  const approveAmount = ethers.parseEther('1000');
  console.log('Approving', ethers.formatEther(approveAmount), 'GT...');

  const tx = await gtoken.approve(NEW_MYSBT, approveAmount);
  console.log('Transaction hash:', tx.hash);
  console.log('Waiting for confirmation...');

  const receipt = await tx.wait();

  console.log('');
  console.log('✅ SUCCESS!');
  console.log('   Block:', receipt.blockNumber);
  console.log('   Gas used:', receipt.gasUsed.toString());
  console.log('');
  console.log('🎉 Deployer can now use airdropMint!');
}

main().catch(console.error);
