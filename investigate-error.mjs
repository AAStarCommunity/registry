import { ethers } from 'ethers';
import { readFileSync } from 'fs';

const USER_ADDRESS = "0xE3D28Aa77c95d5C098170698e5ba68824BFC008d";
const REGISTRY_ADDRESS = "0xf384c592D5258c91805128291c5D4c069DD30CA6";
const GTOKEN_STAKING_ADDRESS = "0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0";
const RPC_URL = "https://rpc.ankr.com/eth_sepolia";

const provider = new ethers.JsonRpcProvider(RPC_URL);

// Load Registry ABI
const abiPath = '../aastar-shared-config/src/abis/Registry.json';
const RegistryABI = JSON.parse(readFileSync(abiPath, 'utf8'));

const stakingABI = [
  "function availableBalance(address user) view returns (uint256)"
];

console.log("🔍 Investigating Registration Error\n");
console.log("User:", USER_ADDRESS);
console.log("Registry:", REGISTRY_ADDRESS);
console.log("=".repeat(80));

async function investigate() {
  try {
    const registry = new ethers.Contract(REGISTRY_ADDRESS, RegistryABI, provider);
    const staking = new ethers.Contract(GTOKEN_STAKING_ADDRESS, stakingABI, provider);

    // 1. 检查该地址是否已经注册过社区
    console.log("\n1️⃣  Checking if address has registered a community...");
    try {
      const profile = await registry.communities(USER_ADDRESS);
      console.log("\n✅ Found existing community registration:");
      console.log("   Name:", profile.name || "(empty)");
      console.log("   Community:", profile.community);
      console.log("   IsActive:", profile.isActive);
      console.log("   RegisteredAt:", profile.registeredAt.toString());

      if (profile.name && profile.name !== "") {
        console.log("\n⚠️  ISSUE FOUND: This address already registered community:", profile.name);
        console.log("   Registry v2.1.4 only allows ONE community per address!");
      }
    } catch (e) {
      console.log("   No existing community found (this is good for registration)");
    }

    // 2. 解码错误数据
    console.log("\n\n2️⃣  Decoding error data...");
    const errorData = "0xadb9e0430000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a055690d9db80000";

    // Error signature: 0xadb9e043
    const errorSig = errorData.slice(0, 10);
    console.log("   Error Signature:", errorSig);

    // Decode parameters
    const params = "0x" + errorData.slice(10);
    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
      ["uint256", "uint256"],
      params
    );

    console.log("   Parameter 1:", decoded[0].toString());
    console.log("   Parameter 2:", ethers.formatEther(decoded[1]), "GT");

    console.log("\n   📝 Error Analysis:");
    console.log("      This looks like: InsufficientStake(uint256 available, uint256 required)");
    console.log("      Available:", decoded[0].toString(), "GT");
    console.log("      Required:", ethers.formatEther(decoded[1]), "GT");

    // 3. 检查用户的可用余额
    console.log("\n\n3️⃣  Checking user's available balance...");
    const available = await staking.availableBalance(USER_ADDRESS);
    console.log("   Available Balance:", ethers.formatEther(available), "GT");

    const required = ethers.parseEther("30");
    if (available < required) {
      console.log("\n   ❌ INSUFFICIENT BALANCE!");
      console.log("      Need:", ethers.formatEther(required), "GT");
      console.log("      Have:", ethers.formatEther(available), "GT");
      console.log("      Shortfall:", ethers.formatEther(required - available), "GT");
    } else {
      console.log("\n   ✅ Balance is sufficient");
    }

    // 4. 总结
    console.log("\n\n" + "=".repeat(80));
    console.log("📊 SUMMARY:");
    console.log("=".repeat(80));

    try {
      const existingProfile = await registry.communities(USER_ADDRESS);
      if (existingProfile.name && existingProfile.name !== "") {
        console.log("\n🔴 ROOT CAUSE:");
        console.log("   Address", USER_ADDRESS, "already registered community:", existingProfile.name);
        console.log("\n💡 SOLUTION:");
        console.log("   Registry v2.1.4 allows only ONE community per address.");
        console.log("   To register 'EatDAO', you must use a DIFFERENT wallet address.");
      }
    } catch {
      console.log("\n🟡 No existing community found, but balance check failed.");
      console.log("   Please check your staking balance and ensure you have 30 GT available.");
    }

  } catch (error) {
    console.error("\n❌ Investigation Error:", error.message);
  }
}

investigate();
