/**
 * 更新 MySBT 合约的 Registry 地址
 * 解决 "community not registered" 错误
 */
import { ethers } from "ethers";

// 配置
const MYSBT_ADDRESS = "0x73E635Fc9eD362b7061495372B6eDFF511D9E18F";
const NEW_REGISTRY_ADDRESS = "0xf384c592D5258c91805128291c5D4c069DD30CA6"; // Registry v2.1.4
const RPC_URL = "https://rpc.sepolia.org";

const MYSBT_ABI = [
  "function REGISTRY() external view returns (address)",
  "function setRegistry(address registry) external",
  "function daoMultisig() external view returns (address)"
];

async function updateMySBTRegistry() {
  console.log("🔧 Checking MySBT Registry address...\n");
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const mySBT = new ethers.Contract(MYSBT_ADDRESS, MYSBT_ABI, provider);
  
  try {
    // 1. Check current Registry
    const currentRegistry = await mySBT.REGISTRY();
    console.log("📍 Current MySBT Registry:", currentRegistry);
    console.log("📍 Target Registry v2.1.4:", NEW_REGISTRY_ADDRESS);
    
    if (currentRegistry.toLowerCase() === NEW_REGISTRY_ADDRESS.toLowerCase()) {
      console.log("\n✅ Registry address is already correct!");
      return;
    }
    
    console.log("\n❌ Registry address MISMATCH detected!");
    
    // 2. Check who can update (DAO multisig)
    const daoMultisig = await mySBT.daoMultisig();
    console.log("\n🔐 Authorization Info:");
    console.log("   Only DAO Multisig can update Registry");
    console.log("   DAO Multisig Address:", daoMultisig);
    
    console.log("\n📝 Steps to Fix:");
    console.log("   1. Switch MetaMask to DAO multisig account:");
    console.log("      " + daoMultisig);
    console.log("   2. Go to Etherscan:");
    console.log("      https://sepolia.etherscan.io/address/" + MYSBT_ADDRESS + "#writeContract");
    console.log("   3. Connect wallet (DAO multisig)");
    console.log("   4. Find 'setRegistry' function");
    console.log("   5. Enter new Registry address:");
    console.log("      " + NEW_REGISTRY_ADDRESS);
    console.log("   6. Click 'Write' and confirm transaction");
    
    console.log("\n⚠️  Alternative: Use this contract call:");
    console.log("   Contract:", MYSBT_ADDRESS);
    console.log("   Function: setRegistry(address)");
    console.log("   Parameter:", NEW_REGISTRY_ADDRESS);
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

updateMySBTRegistry();
