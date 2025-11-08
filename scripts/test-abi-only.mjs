import { ethers } from "ethers";

// Test the ABI fix without network connection
const RegistryV2_1_4ABI = [
  "function getCommunityCount() view returns (uint256)",
  "function registerCommunity(tuple(string name, string ensName, address xPNTsToken, address[] supportedSBTs, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, bool allowPermissionlessMint), uint256 stakeAmount) external"
];

console.log("=== Testing ABI Fix ===");

try {
  // Create interface
  const iface = new ethers.Interface(RegistryV2_1_4ABI);
  console.log("✅ Interface created successfully");
  
  // Test function exists
  const registerFunction = iface.getFunction("registerCommunity");
  console.log("✅ registerCommunity function found");
  console.log("Function signature:", registerFunction.format());
  
  // Create test profile matching the exact structure from RegisterCommunity.tsx
  const profile = [
    "TestCommunity",                                    // name: string
    "",                                                 // ensName: string  
    "0x0000000000000000000000000000000000000000",       // xPNTsToken: address
    ["0xf7bf79acb7f3702b9dbd397d8140ac9de6ce642c"],    // supportedSBTs: address[]
    1,                                                  // nodeType: uint8 (PAYMASTER_SUPER)
    "0x0000000000000000000000000000000000000000",       // paymasterAddress: address
    "0x1234567890123456789012345678901234567890",     // community: address
    0,                                                  // registeredAt: uint256
    0,                                                  // lastUpdatedAt: uint256
    true,                                               // isActive: bool
    true                                                // allowPermissionlessMint: bool
  ];
  
  const stakeAmount = ethers.parseEther("30");
  
  // Test encoding
  const encodedData = iface.encodeFunctionData("registerCommunity", [profile, stakeAmount]);
  console.log("✅ Encoding successful");
  console.log("Encoded data length:", encodedData.length);
  console.log("Function selector:", encodedData.substring(0, 10));
  
  // Test decoding
  const decoded = iface.parseTransaction({ data: encodedData });
  console.log("✅ Decoding successful");
  console.log("Function name:", decoded.name);
  console.log("Stake amount:", ethers.formatEther(decoded.args[1]), "GT");
  console.log("Community name:", decoded.args[0][0]);
  console.log("Node type:", decoded.args[0][4].toString());
  console.log("Supported SBTs:", decoded.args[0][3]);
  
  // Compare with the problematic transaction data from decode-tx-data.mjs
  const problematicTxData = "0x7be4c2190000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000001a055690d9db8000000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f7bf79acb7f3702b9dbd397d8140ac9de6ce642c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000641415374617200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
  
  console.log("\n=== Comparing Function Selectors ===");
  console.log("Our selector:", encodedData.substring(0, 10));
  console.log("Problem selector:", problematicTxData.substring(0, 10));
  
  if (encodedData.substring(0, 10) === problematicTxData.substring(0, 10)) {
    console.log("✅ Function selectors match!");
  } else {
    console.log("❌ Function selectors don't match - this explains the revert");
  }
  
  // Try to decode the problematic transaction
  try {
    const decodedProblem = iface.parseTransaction({ data: problematicTxData });
    console.log("✅ Problematic transaction decoded successfully");
    console.log("Function name:", decodedProblem.name);
    console.log("Stake amount:", ethers.formatEther(decodedProblem.args[1]), "GT");
  } catch (error) {
    console.log("❌ Failed to decode problematic transaction:", error.message);
  }
  
} catch (error) {
  console.error("❌ Test failed:", error.message);
  console.error(error.stack);
}