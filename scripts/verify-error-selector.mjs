import { ethers } from "ethers";

// 计算 error selector
const errors = [
  "InsufficientAvailableBalance(uint256,uint256)",
  "InsufficientBalance(address,uint256,uint256)",
  "BelowMinimumStake(uint256,uint256)",
  "UnauthorizedLocker(address)"
];

console.log("🔍 计算错误选择器...\n");

errors.forEach(error => {
  const selector = ethers.id(error).slice(0, 10);
  console.log(`${error}`);
  console.log(`  Selector: ${selector}\n`);
});

// 我们从模拟中得到的错误
const receivedSelector1 = "0xadb9e043"; // userMint error
const receivedSelector2 = "0xfb8f41b2"; // mintWithAutoStake error

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("从模拟中收到的错误:");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
console.log("userMint error selector:", receivedSelector1);
console.log("mintWithAutoStake error selector:", receivedSelector2);

// 计算匹配
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("匹配结果:");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const selector1 = ethers.id("InsufficientAvailableBalance(uint256,uint256)").slice(0, 10);
const selector2 = ethers.id("InsufficientBalance(address,uint256,uint256)").slice(0, 10);

console.log("InsufficientAvailableBalance(uint256,uint256):");
console.log("  计算:", selector1);
console.log("  userMint 错误:", receivedSelector1);
console.log("  匹配?", selector1 === receivedSelector1 ? "✅" : "❌");

console.log("\nInsufficientBalance(address,uint256,uint256):");
console.log("  计算:", selector2);
console.log("  mintWithAutoStake 错误:", receivedSelector2);
console.log("  匹配?", selector2 === receivedSelector2 ? "✅" : "❌");
