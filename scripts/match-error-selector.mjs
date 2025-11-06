import { ethers } from "ethers";

const targetSelector = "0x3ee5aeb5";

// GTokenStaking v2.0.1 的所有错误
const gtokenStakingErrors = [
  "BelowMinimumStake(uint256,uint256)",
  "AlreadyStaked(address)",
  "NoStakeFound(address)",
  "UnstakeNotRequested(address)",
  "UnstakeDelayNotPassed(uint256)",
  "StakeIsLocked(address,uint256)",
  "UnauthorizedSlasher(address)",
  "UnauthorizedLocker(address)",
  "SlashAmountExceedsBalance(uint256,uint256)",
  "InsufficientAvailableBalance(uint256,uint256)",
  "InsufficientLockedAmount(uint256,uint256)",
  "ExitFeeTooHigh(uint256,uint256)",
  "InvalidAddress(address)",
  "InvalidTierConfig()",
  "InvalidFeeRecipient()"
];

console.log(`🔍 匹配错误 selector: ${targetSelector}\n`);

for (const err of gtokenStakingErrors) {
  const selector = ethers.id(err).slice(0, 10);
  const match = selector === targetSelector;
  console.log(`${match ? "✅" : "  "} ${err.padEnd(50)} ${selector}`);
  if (match) {
    console.log(`\n🎯 找到匹配！错误: ${err}`);
  }
}

console.log(`\n${"-".repeat(70)}`);
console.log("未找到匹配，可能来自 GToken 合约的自定义错误");
