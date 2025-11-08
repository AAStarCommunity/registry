import { ethers } from 'ethers';
import { readFileSync } from 'fs';

const REGISTRY_ADDRESS = "0xf384c592D5258c91805128291c5D4c069DD30CA6";
const RPC_URL = "https://rpc.ankr.com/eth_sepolia";

const abiPath = '../aastar-shared-config/src/abis/Registry.json';
const RegistryABI = JSON.parse(readFileSync(abiPath, 'utf8'));

const provider = new ethers.JsonRpcProvider(RPC_URL);
const registry = new ethers.Contract(REGISTRY_ADDRESS, RegistryABI, provider);

console.log("🔍 Testing Registry Contract Functions\n");
console.log("Registry:", REGISTRY_ADDRESS);
console.log("=".repeat(80));

// 测试社区 Mycelium
const MYCELIUM = "0x411BD567E46C0781248dbB6a9211891C032885e5";

async function checkRegistry() {
  try {
    // 1. 检查 Mycelium 的 profile
    console.log("\n1️⃣  Checking Mycelium community profile...");
    const profile = await registry.getCommunityProfile(MYCELIUM);
    
    console.log("\nCommunity Profile:");
    console.log("   name:", profile.name);
    console.log("   ensName:", profile.ensName);
    console.log("   community:", profile.community);
    
    // 检查是否有 supportedSBTs 字段
    if (profile.supportedSBTs) {
      console.log("\n✅ supportedSBTs field EXISTS:");
      console.log("   Count:", profile.supportedSBTs.length);
      profile.supportedSBTs.forEach((sbt, i) => {
        console.log(`   [${i}]:`, sbt);
      });
    } else {
      console.log("\n❌ supportedSBTs field NOT FOUND in profile");
    }
    
    // 2. 检查所有可用的函数
    console.log("\n\n2️⃣  Checking available functions...");
    
    // 尝试调用可能的 SBT 相关函数
    const functionsToCheck = [
      'getSupportedSBTs',
      'isSBTSupported',
      'addSupportedSBT',
      'removeSupportedSBT',
      'supportedSBTs'
    ];
    
    for (const funcName of functionsToCheck) {
      try {
        if (typeof registry[funcName] === 'function') {
          console.log(`   ✅ ${funcName} - EXISTS`);
          
          // 如果是 view 函数，尝试调用
          if (funcName.startsWith('get') || funcName.startsWith('is') || funcName === 'supportedSBTs') {
            try {
              const result = funcName === 'isSBTSupported' 
                ? await registry[funcName](MYCELIUM, "0x73E635Fc9eD362b7061495372B6eDFF511D9E18F")
                : await registry[funcName](MYCELIUM);
              console.log(`      Result:`, result);
            } catch (e) {
              console.log(`      (Can't call: ${e.message.split('\n')[0]})`);
            }
          }
        } else {
          console.log(`   ❌ ${funcName} - NOT FOUND`);
        }
      } catch (e) {
        console.log(`   ❌ ${funcName} - ERROR: ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

checkRegistry();
