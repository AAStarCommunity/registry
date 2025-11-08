import { ethers } from "ethers";

const REGISTRY_ADDRESS = "0xf384c592D5258c91805128291c5D4c069DD30CA6"; // Registry v2.1.4
const TEST_COMMUNITY = "0x411BD567E46C0781248dbB6a9211891C032885e5"; // Mycelium
const RPC_URL = "https://rpc.ankr.com/eth_sepolia";

const provider = new ethers.JsonRpcProvider(RPC_URL);

// 使用实际的 Registry ABI
import { readFileSync } from 'fs';
const abiPath = '../aastar-shared-config/src/abis/Registry.json';
const RegistryABI = JSON.parse(readFileSync(abiPath, 'utf8'));

const registry = new ethers.Contract(REGISTRY_ADDRESS, RegistryABI, provider);

console.log("🔍 Testing Registry contract calls\n");
console.log("Registry:", REGISTRY_ADDRESS);
console.log("Test Community:", TEST_COMMUNITY);
console.log("=".repeat(60));

async function testCalls() {
  try {
    // 测试 communities() 自动 getter
    console.log("\n1️⃣  Testing communities() auto-getter:");
    console.log("-".repeat(60));
    const result1 = await registry.communities(TEST_COMMUNITY);
    console.log("Return type:", Array.isArray(result1) ? "Array" : "Object");
    console.log("Number of fields:", Object.keys(result1).length);
    console.log("\nFields:");
    for (const [key, value] of Object.entries(result1)) {
      if (isNaN(key)) { // 只显示命名字段
        console.log(`  ${key}:`, typeof value === 'bigint' ? value.toString() : value);
      }
    }

    // 测试 getCommunityProfile() 显式函数
    console.log("\n\n2️⃣  Testing getCommunityProfile() function:");
    console.log("-".repeat(60));
    const result2 = await registry.getCommunityProfile(TEST_COMMUNITY);
    console.log("Return type:", Array.isArray(result2) ? "Array" : "Object");
    console.log("Number of fields:", Object.keys(result2).length);
    console.log("\nFields:");
    for (const [key, value] of Object.entries(result2)) {
      if (isNaN(key)) { // 只显示命名字段
        console.log(`  ${key}:`, typeof value === 'bigint' ? value.toString() : value);
      }
    }

    // 对比差异
    console.log("\n\n3️⃣  Comparison:");
    console.log("-".repeat(60));
    const keys1 = Object.keys(result1).filter(k => isNaN(k));
    const keys2 = Object.keys(result2).filter(k => isNaN(k));
    
    console.log("communities() fields:", keys1.join(", "));
    console.log("getCommunityProfile() fields:", keys2.join(", "));
    
    const missingInCommunities = keys2.filter(k => !keys1.includes(k));
    if (missingInCommunities.length > 0) {
      console.log("\n⚠️  Fields missing in communities():", missingInCommunities.join(", "));
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testCalls();
