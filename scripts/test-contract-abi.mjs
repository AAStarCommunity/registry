import { getCurrentNetworkConfig } from "./src/config/networkConfig.js";
import { ethers } from "ethers";

const networkConfig = getCurrentNetworkConfig();
console.log("=== Network Configuration ===");
console.log("Network:", networkConfig.chainName);
console.log("Chain ID:", networkConfig.chainId);
console.log("Registry V2.1:", networkConfig.contracts.registryV2_1);
console.log("GToken:", networkConfig.contracts.gToken);
console.log("GTokenStaking:", networkConfig.contracts.gTokenStaking);
console.log("");

// Test ABI with actual contract
const RegistryV2_1_4ABI = [
  "function getCommunityCount() view returns (uint256)",
  "function registerCommunity(tuple(string name, string ensName, address xPNTsToken, address[] supportedSBTs, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, bool allowPermissionlessMint), uint256 stakeAmount) external"
];

async function testContract() {
  try {
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    const registryContract = new ethers.Contract(networkConfig.contracts.registryV2_1, RegistryV2_1_4ABI, provider);
    
    console.log("=== Contract Test ===");
    
    // Test 1: Check if contract exists and is readable
    try {
      const communityCount = await registryContract.getCommunityCount();
      console.log("✅ Contract is accessible");
      console.log("Current community count:", communityCount.toString());
    } catch (error) {
      console.log("❌ Contract access failed:", error.message);
      return;
    }
    
    // Test 2: Check if registerCommunity function exists
    try {
      registryContract.interface.getFunction("registerCommunity");
      console.log("✅ registerCommunity function found");
      console.log("Function signature:", registryContract.interface.getFunction("registerCommunity").format());
    } catch (error) {
      console.log("❌ registerCommunity function not found:", error.message);
    }
    
    // Test 3: Create test data to verify encoding
    const testProfile = [
      "TestCommunity",
      "",
      ethers.ZeroAddress,
      ["0xf7bf79acb7f3702b9dbd397d8140ac9de6ce642c"],
      1,
      ethers.ZeroAddress,
      "0x1234567890123456789012345678901234567890",
      0,
      0,
      true,
      true
    ];
    
    const testStake = ethers.parseEther("30");
    
    try {
      const encodedData = registryContract.interface.encodeFunctionData("registerCommunity", [testProfile, testStake]);
      console.log("✅ Function encoding successful");
      console.log("Encoded data length:", encodedData.length);
      console.log("First 100 chars:", encodedData.substring(0, 100) + "...");
    } catch (error) {
      console.log("❌ Function encoding failed:", error.message);
    }
    
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testContract();