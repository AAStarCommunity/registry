import { ethers } from "ethers";

// Use the addresses from scripts
const REGISTRY_ADDRESS = "0xf384c592D5258c91805128291c5D4c069DD30CA6";
const GTOKEN_STAKING_ADDRESS = "0x199402b3F213A233e89585957F86A07ED1e1cD67";

const RegistryV2_1_4ABI = [
  "function getCommunityCount() view returns (uint256)",
  "function registerCommunity(tuple(string name, string ensName, address xPNTsToken, address[] supportedSBTs, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, bool allowPermissionlessMint), uint256 stakeAmount) external"
];

async function testWithPublicRPC() {
  try {
    console.log("=== Testing with Public RPC ===");
    console.log("Registry:", REGISTRY_ADDRESS);
    console.log("GTokenStaking:", GTOKEN_STAKING_ADDRESS);
    
    // Use public Sepolia RPC
    const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161");
    
    const registryContract = new ethers.Contract(REGISTRY_ADDRESS, RegistryV2_1_4ABI, provider);
    
    // Test 1: Check if contract exists
    try {
      const code = await provider.getCode(REGISTRY_ADDRESS);
      if (code === "0x") {
        console.log("❌ No contract deployed at address");
        return;
      }
      console.log("✅ Contract found at address");
    } catch (error) {
      console.log("❌ Failed to check contract:", error.message);
      return;
    }
    
    // Test 2: Check if function exists
    try {
      const communityCount = await registryContract.getCommunityCount();
      console.log("✅ Contract is readable");
      console.log("Community count:", communityCount.toString());
    } catch (error) {
      console.log("❌ Contract call failed:", error.message);
      
      // Try to decode the error
      if (error.data) {
        console.log("Error data:", error.data);
      }
    }
    
    // Test 3: Check registerCommunity function encoding
    try {
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
      const encodedData = registryContract.interface.encodeFunctionData("registerCommunity", [testProfile, testStake]);
      console.log("✅ registerCommunity encoding works");
      console.log("Encoded length:", encodedData.length);
      
      // Test decoding
      const decoded = registryContract.interface.parseTransaction({ data: encodedData });
      console.log("✅ registerCommunity decoding works");
      console.log("Function name:", decoded.name);
      console.log("Stake amount:", ethers.formatEther(decoded.args[1]), "GT");
      
    } catch (error) {
      console.log("❌ registerCommunity encoding/decoding failed:", error.message);
    }
    
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testWithPublicRPC();