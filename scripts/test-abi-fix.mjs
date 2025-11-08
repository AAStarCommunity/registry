import { ethers } from "ethers";

// Test the fixed ABI format
const abi = [
  "function registerCommunity(tuple(string name, string ensName, address xPNTsToken, address[] supportedSBTs, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, bool allowPermissionlessMint), uint256 stakeAmount) external"
];

// Create a test profile
const profile = [
  "TestCommunity",           // name
  "",                        // ensName
  ethers.ZeroAddress,        // xPNTsToken
  ["0xf7bf79acb7f3702b9dbd397d8140ac9de6ce642c"], // supportedSBTs
  1,                         // nodeType
  ethers.ZeroAddress,        // paymasterAddress
  "0x1234567890123456789012345678901234567890", // community
  0,                         // registeredAt
  0,                         // lastUpdatedAt
  true,                      // isActive
  true                       // allowPermissionlessMint
];

const stakeAmount = ethers.parseEther("30");

try {
  const iface = new ethers.Interface(abi);
  console.log("✅ ABI format is valid");
  
  // Encode the function call
  const encodedData = iface.encodeFunctionData("registerCommunity", [profile, stakeAmount]);
  console.log("✅ Encoding successful");
  console.log("Encoded data length:", encodedData.length);
  
  // Decode it back
  const decoded = iface.parseTransaction({ data: encodedData });
  console.log("✅ Decoding successful");
  console.log("Function:", decoded.name);
  console.log("Stake amount:", ethers.formatEther(decoded.args[1]), "GT");
  console.log("Community name:", decoded.args[0][0]);
  
} catch (error) {
  console.error("❌ Error:", error.message);
}