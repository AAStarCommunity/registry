import { ethers } from "ethers";

const errorSelector = "0x3ee5aeb5";

console.log("解码错误 selector:", errorSelector);
console.log("\n尝试常见的 MySBT/GTokenStaking 错误:");

const commonErrors = [
  // MySBT errors
  "InsufficientBalance()",
  "InsufficientAvailableBalance(uint256,uint256)",
  "InsufficientWalletBalance(uint256,uint256)",
  "TransferFailed()",
  "BurnFailed()",
  "StakeFailed()",
  "LockFailed()",
  "ApprovalFailed()",
  "InvalidAmount()",
  "ZeroAmount()",
  "InvalidAddress()",
  "NotAuthorized()",
  "Paused()",
  "AlreadyExists()",
  "NotFound()",
  // GTokenStaking specific
  "InsufficientStake()",
  "UnauthorizedLocker(address)",
  "LockAmountTooLow(uint256,uint256)",
  // ERC20 Transfer errors
  "InsufficientAllowance()",
  "ERC20InsufficientBalance(address,uint256,uint256)",
  "ERC20InsufficientAllowance(address,uint256,uint256)"
];

for (const err of commonErrors) {
  const sig = ethers.id(err).slice(0, 10);
  console.log(`  ${err}: ${sig}`, sig === errorSelector ? "✅ MATCH!" : "");
}

// 尝试构造特定参数
console.log("\n尝试带参数的错误:");
const variations = [
  "E()",
  "error()",
  "Error()",
  "Failed()",
  "Revert()"
];

for (const v of variations) {
  const sig = ethers.id(v).slice(0, 10);
  console.log(`  ${v}: ${sig}`, sig === errorSelector ? "✅ MATCH!" : "");
}
