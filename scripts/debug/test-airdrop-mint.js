import { ethers } from 'ethers';
import fs from 'fs';

const SEPOLIA_RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N';
const DAO_PRIVATE_KEY = '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81'; // From .env

const NEW_MYSBT = '0xc364A68Abd38a6428513abE519dEEA410803BB5A';
const TEST_USER = '0x935f8694855fa9f1d1520e43689219ed4fff8c97'; // From error log

async function main() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(DAO_PRIVATE_KEY, provider);

  console.log('🧪 Test airdropMint Call\n');
  console.log('Caller (DAO):', wallet.address);
  console.log('NEW MySBT:', NEW_MYSBT);
  console.log('Test user:', TEST_USER);
  console.log('');

  // Load MySBT ABI
  const abiPath = '../aastar-shared-config/src/abis/MySBT.json';
  const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

  const mysbt = new ethers.Contract(NEW_MYSBT, abi, wallet);

  const metadata = JSON.stringify({
    communityAddress: wallet.address,
    communityName: "aaaCommunit",
    registeredAt: new Date().toISOString(),
    nodeType: "PAYMASTER_SUPER",
    isActive: true
  });

  console.log('Metadata:', metadata);
  console.log('');

  try {
    console.log('Estimating gas for airdropMint...');
    const gasEstimate = await mysbt.airdropMint.staticCall(TEST_USER, metadata);
    console.log('✅ Static call succeeded, would return:', gasEstimate);
    console.log('');

    console.log('Calling airdropMint...');
    const tx = await mysbt.airdropMint(TEST_USER, metadata);
    console.log('Transaction hash:', tx.hash);
    console.log('Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('');
    console.log('✅ SUCCESS!');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('');

    if (error.data) {
      console.error('Error data:', error.data);

      // Try to decode error
      if (error.data.startsWith('0x04d95544')) {
        const errorData = error.data;
        const address = '0x' + errorData.slice(10).slice(24);
        console.error('');
        console.error('Decoded: UnauthorizedLocker(address)');
        console.error('Address parameter:', address);
      }
    }

    throw error;
  }
}

main().catch(() => process.exit(1));
