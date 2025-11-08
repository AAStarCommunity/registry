import { ethers } from "ethers";

// Test the original tuple format
const RegistryV2_1_4ABI = [
  "function getCommunityCount() view returns (uint256)",
  "function registerCommunity(tuple(string name, string ensName, address xPNTsToken, address[] supportedSBTs, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, bool allowPermissionlessMint), uint256 stakeAmount) external"
];

console.log("=== Testing Original Tuple Format ===");

try {
  const iface = new ethers.Interface(RegistryV2_1_4ABI);
  console.log("✅ Interface created successfully");
  
  const registerFunction = iface.getFunction("registerCommunity");
  console.log("✅ registerCommunity function found");
  console.log("Function signature:", registerFunction.format());
  
  // Test profile
  const profile = [
    "TestCommunity",
    "",
    "0x0000000000000000000000000000000000000000",
    ["0xf7bf79acb7f3702b9dbd397d8140ac9de6ce642c"],
    1,
    "0x0000000000000000000000000000000000000000",
    "0x1234567890123456789012345678901234567890",
    0,
    0,
    true,
    true
  ];
  
  const stakeAmount = ethers.parseEther("30");
  
  const encodedData = iface.encodeFunctionData("registerCommunity", [profile, stakeAmount]);
  console.log("✅ Encoding successful");
  console.log("Function selector:", encodedData.substring(0, 10));
  
  // Compare with problematic transaction
  const problematicTxData = "0x7be4c2190000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000001a055690d9db8000000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f7bf79acb7f3702b9dbd397d8140ac9de6ce642c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000641415374617200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
  
  console.log("Problem selector:", problematicTxData.substring(0, 10));
  
  if (encodedData.substring(0, 10) === problematicTxData.substring(0, 10)) {
    console.log("✅ Function selectors match!");
  } else {
    console.log("❌ Function selectors still don't match");
  }
  
  // Try to decode the problematic transaction
  try {
    const decodedProblem = iface.parseTransaction({ data: problematicTxData });
    console.log("✅ Problematic transaction decoded successfully!");
    console.log("Function name:", decodedProblem.name);
    console.log("Stake amount:", ethers.formatEther(decodedProblem.args[1]), "GT");
    console.log("Community name:", decodedProblem.args[0][0]);
    console.log("Node type:", decodedProblem.args[0][4].toString());
  } catch (error) {
    console.log("❌ Still failed to decode problematic transaction:", error.message);
  }
  
} catch (error) {
  console.error("❌ Test failed:", error.message);
}