import { ethers } from "ethers";

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N";
const USER_ADDRESS = "0xF7Bf79AcB7F3702b9DbD397d8140ac9DE6Ce642C";
const MYSBT_ADDRESS = "0xD20F64718485E8aA317c0f353420cdB147661b20";
const GTOKEN_STAKING_ADDRESS = "0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0";
const GTOKEN_ADDRESS = "0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc";

const provider = new ethers.JsonRpcProvider(RPC_URL);

const gtokenStakingABI = [
  "function availableBalance(address user) view returns (uint256)",
  "function balanceOf(address user) view returns (uint256)",
  "function getLockerConfig(address locker) view returns (tuple(bool authorized, uint256 feeRateBps, uint256 minExitFee, uint256 maxFeePercent, uint256[] timeTiers, uint256[] tierFees, address feeRecipient))",
  "function lockedBalanceBy(address user, address locker) view returns (tuple(uint256 amount, uint256 lockedAt))"
];

const gtokenABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const mySBTABI = [
  "function minLockAmount() view returns (uint256)",
  "function mintFee() view returns (uint256)"
];

async function verify() {
  console.log("🔍 验证 MySBT Auto-Stake 条件...\n");
  
  const gtokenStaking = new ethers.Contract(GTOKEN_STAKING_ADDRESS, gtokenStakingABI, provider);
  const gtoken = new ethers.Contract(GTOKEN_ADDRESS, gtokenABI, provider);
  const mySBT = new ethers.Contract(MYSBT_ADDRESS, mySBTABI, provider);

  // 1. Check locker status
  const lockerConfig = await gtokenStaking.getLockerConfig(MYSBT_ADDRESS);
  const isMySBTLocker = lockerConfig.authorized;
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔑 MySBT Locker 授权状态");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("MySBT 地址:", MYSBT_ADDRESS);
  console.log("是否为授权 Locker:", isMySBTLocker ? "✅ 是" : "❌ 否");
  if (isMySBTLocker) {
    console.log("费用接收者:", lockerConfig.feeRecipient);
    console.log("费率 (bps):", lockerConfig.feeRateBps.toString());
  }

  // 2. Check balances
  const walletBalance = await gtoken.balanceOf(USER_ADDRESS);
  const stakedBalance = await gtokenStaking.balanceOf(USER_ADDRESS);
  const availableBalance = await gtokenStaking.availableBalance(USER_ADDRESS);
  const lockedBalance = stakedBalance - availableBalance;
  const approval = await gtoken.allowance(USER_ADDRESS, MYSBT_ADDRESS);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("💰 用户余额状态");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("用户地址:", USER_ADDRESS);
  console.log("钱包余额:", ethers.formatEther(walletBalance), "GT");
  console.log("质押余额:", ethers.formatEther(stakedBalance), "GT");
  console.log("可用余额:", ethers.formatEther(availableBalance), "GT");
  console.log("锁定余额:", ethers.formatEther(lockedBalance), "GT");
  console.log("GToken 授权:", ethers.formatEther(approval), "GT");

  // 3. Check requirements
  const minLockAmount = await mySBT.minLockAmount();
  const mintFee = await mySBT.mintFee();
  const totalNeeded = minLockAmount + mintFee;
  const totalAvailable = walletBalance + stakedBalance;

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 Mint 要求");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("需要锁定:", ethers.formatEther(minLockAmount), "GT");
  console.log("需要燃烧:", ethers.formatEther(mintFee), "GT");
  console.log("总需求:", ethers.formatEther(totalNeeded), "GT");
  console.log("总可用:", ethers.formatEther(totalAvailable), "GT");
  console.log("余额足够:", totalAvailable >= totalNeeded ? "✅ 是" : "❌ 否");

  // 4. Conclusion
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎯 诊断结论");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  const issues = [];
  if (!isMySBTLocker) {
    issues.push("❌ MySBT 未被授权为 GTokenStaking 的 locker");
  }
  if (totalAvailable < totalNeeded) {
    issues.push("❌ 用户总余额不足");
  }
  if (approval < minLockAmount && availableBalance < minLockAmount) {
    issues.push("⚠️  GToken 未授权给 MySBT（需要在 auto-stake 时批准）");
  }

  if (issues.length > 0) {
    console.log("\n发现以下问题:\n");
    issues.forEach(issue => console.log(issue));
  } else {
    console.log("\n✅ 所有条件满足，应该可以 mint！");
  }
}

verify().catch(console.error);
