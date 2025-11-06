import { ethers } from "ethers";

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N";
const REGISTRY_ADDRESS = "0xf384c592D5258c91805128291c5D4c069DD30CA6";
const BBSTAR_COMMUNITY = "0xe24b6f321B0140716a2b671ed0D983bb64E7DaFA";

const provider = new ethers.JsonRpcProvider(RPC_URL);

// 简化的 ABI，只包含需要的函数
const registryABI = [
  "function isRegisteredCommunity(address communityAddress) view returns (bool)",
  "function isPermissionlessMintAllowed(address communityAddress) view returns (bool)"
];

async function checkCommunity() {
  console.log("🔍 检查 bbStar 社区状态...\n");
  console.log("Registry:", REGISTRY_ADDRESS);
  console.log("Community:", BBSTAR_COMMUNITY, "\n");

  const registry = new ethers.Contract(REGISTRY_ADDRESS, registryABI, provider);

  try {
    // 1. 检查社区是否已注册
    const isRegistered = await registry.isRegisteredCommunity(BBSTAR_COMMUNITY);
    console.log("✅ isRegisteredCommunity():", isRegistered);

    // 2. 检查是否允许 permissionless mint
    const isPermissionless = await registry.isPermissionlessMintAllowed(BBSTAR_COMMUNITY);
    console.log("✅ isPermissionlessMintAllowed():", isPermissionless);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("结论:");
    if (!isRegistered) {
      console.log("❌ 社区未注册 - mint 会失败");
    } else if (!isPermissionless) {
      console.log("❌ 社区已注册，但禁止了 permissionless mint - mint 会失败");
    } else {
      console.log("✅ 社区已注册，且允许 permissionless mint - mint 应该可以成功");
    }
  } catch (error) {
    console.error("\n❌ 错误:", error.message);
  }
}

checkCommunity();
