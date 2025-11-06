import { ethers } from "ethers";

const txData = "0x7be4c2190000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000001a055690d9db8000000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f7bf79acb7f3702b9dbd397d8140ac9de6ce642c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000641415374617200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

// Try to decode with Registry ABI
const abi = [
  "function registerCommunity((string name, string ensName, address xPNTsToken, address[] supportedSBTs, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, bool allowPermissionlessMint) profile, uint256 gTokenAmount)"
];

try {
  const iface = new ethers.Interface(abi);
  const decoded = iface.parseTransaction({ data: txData });
  
  console.log("🔍 Decoded Transaction Data:\n");
  console.log("Function:", decoded.name);
  console.log("\nArguments:");
  console.log("gTokenAmount:", ethers.formatEther(decoded.args[1]), "GT");
  console.log("\nProfile:");
  const profile = decoded.args[0];
  console.log("  name:", profile.name);
  console.log("  ensName:", profile.ensName);
  console.log("  xPNTsToken:", profile.xPNTsToken);
  console.log("  supportedSBTs:", profile.supportedSBTs);
  console.log("  nodeType:", profile.nodeType.toString());
  console.log("  paymasterAddress:", profile.paymasterAddress);
  console.log("  community:", profile.community);
  console.log("  registeredAt:", profile.registeredAt.toString());
  console.log("  lastUpdatedAt:", profile.lastUpdatedAt.toString());
  console.log("  isActive:", profile.isActive);
  console.log("  allowPermissionlessMint:", profile.allowPermissionlessMint);
  
} catch (error) {
  console.error("❌ Decode Error:", error.message);
}
