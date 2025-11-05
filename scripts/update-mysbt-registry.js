/**
 * 更新 MySBT 合约的 Registry 地址
 * 解决 "community not registered" 错误
 */
const { ethers } = require("ethers");

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
  console.log("🔧 Updating MySBT Registry address...\n");
  
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
    
    // 2. Check who can update (DAO multisig)
    const daoMultisig = await mySBT.daoMultisig();
    console.log("\n🔐 Only DAO Multisig can update Registry:");
    console.log("   DAO Multisig:", daoMultisig);
    console.log("\n⚠️  You need to use the DAO multisig account to call:");
    console.log("   MySBT.setRegistry(\"" + NEW_REGISTRY_ADDRESS + "\")");
    
    console.log("\n📝 Steps to fix:");
    console.log("   1. Switch MetaMask to DAO multisig account:", daoMultisig);
    console.log("   2. Go to https://sepolia.etherscan.io/address/" + MYSBT_ADDRESS + "#writeContract");
    console.log("   3. Connect wallet");
    console.log("   4. Call setRegistry() with address:", NEW_REGISTRY_ADDRESS);
    console.log("   5. Confirm transaction");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

updateMySBTRegistry();
