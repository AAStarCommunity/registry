import { ethers } from "ethers";

// 从 test-automint-local.mjs 的错误
const errorData = "0xfb8f41b2000000000000000000000000d20f64718485e8aa317c0f353420cdb147661b2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000429d069189e0000";

const selector = errorData.slice(0, 10);
console.log("错误 selector:", selector);

// 常见的 MySBT 错误
const commonErrors = [
  "AlreadyHasSBT()",
  "MembershipAlreadyExists(uint256 tokenId, address community)",
  "MembershipAlreadyActive(uint256 tokenId, address community)",
  "DuplicateMembership(address community)",
  "CommunityAlreadyJoined(address community)"
];

console.log("\n尝试匹配常见错误:");
for (const err of commonErrors) {
  const sig = ethers.id(err).slice(0, 10);
  console.log(`  ${err}: ${sig}`, sig === selector ? "✅ MATCH!" : "");
}

// 解析参数（如果有）
if (errorData.length > 10) {
  const params = errorData.slice(10);
  console.log("\n错误参数 (hex):", params);
  
  // 尝试解析为 3 个 uint256
  if (params.length >= 192) {
    try {
      const p1 = "0x" + params.slice(0, 64);
      const p2 = "0x" + params.slice(64, 128);
      const p3 = "0x" + params.slice(128, 192);
      
      console.log("\n尝试解析为地址和两个 uint256:");
      console.log("  参数 1 (address):", p1);
      console.log("  参数 2 (uint256):", BigInt(p2).toString());
      console.log("  参数 3 (uint256):", ethers.formatEther(p3), "GT");
    } catch (e) {
      console.log("解析失败:", e.message);
    }
  }
}
