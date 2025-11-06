import { ethers } from "ethers";

const RPC_URL = "https://rpc.ankr.com/eth_sepolia";
const USER_ADDRESS = "0xF7Bf79AcB7F3702b9DbD397d8140ac9DE6Ce642C";
const MYSBT_ADDRESS = "0xD20F64718485E8aA317c0f353420cdB147661b20";
const GTOKEN_STAKING_ADDRESS = "0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0";
const GTOKEN_ADDRESS = "0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc";

const provider = new ethers.JsonRpcProvider(RPC_URL);

const gtokenStakingABI = [
  "function availableBalance(address user) view returns (uint256)",
  "function stakedBalance(address user) view returns (uint256)",
  "function lockedStake(address user) view returns (uint256)",
  "function isLocker(address locker) view returns (bool)"
];

const gtokenABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const mySBTABI = [
  "function minLockAmount() view returns (uint256)",
  "function mintFee() view returns (uint256)"
];

async function debug() {
  const gtokenStaking = new ethers.Contract(GTOKEN_STAKING_ADDRESS, gtokenStakingABI, provider);
  const gtoken = new ethers.Contract(GTOKEN_ADDRESS, gtokenABI, provider);
  const mySBT = new ethers.Contract(MYSBT_ADDRESS, mySBTABI, provider);

  console.log("🔍 Debugging Auto-Stake Minting...\n");

  // Check user's GToken balance
  const walletBalance = await gtoken.balanceOf(USER_ADDRESS);
  console.log("💰 Wallet GToken Balance:", ethers.formatEther(walletBalance), "GT");

  // Check user's staked balance
  const stakedBalance = await gtokenStaking.stakedBalance(USER_ADDRESS);
  console.log("🔒 Staked GToken Balance:", ethers.formatEther(stakedBalance), "GT");

  // Check available balance (staked - locked)
  const availableBalance = await gtokenStaking.availableBalance(USER_ADDRESS);
  console.log("✅ Available Balance (staked - locked):", ethers.formatEther(availableBalance), "GT");

  // Check locked stake
  const lockedStake = await gtokenStaking.lockedStake(USER_ADDRESS);
  console.log("🔐 Locked Stake:", ethers.formatEther(lockedStake), "GT");

  // Check MySBT requirements
  const minLockAmount = await mySBT.minLockAmount();
  const mintFee = await mySBT.mintFee();
  console.log("\n📋 MySBT Requirements:");
  console.log("   Min Lock Amount:", ethers.formatEther(minLockAmount), "GT");
  console.log("   Mint Fee (burned):", ethers.formatEther(mintFee), "GT");
  console.log("   Total Needed:", ethers.formatEther(minLockAmount + mintFee), "GT");

  // Check if MySBT is authorized locker
  const isMySBTLocker = await gtokenStaking.isLocker(MYSBT_ADDRESS);
  console.log("\n🔑 MySBT Authorization:");
  console.log("   Is MySBT registered as locker?", isMySBTLocker ? "✅ YES" : "❌ NO");

  // Check GToken approval for MySBT
  const approval = await gtoken.allowance(USER_ADDRESS, MYSBT_ADDRESS);
  console.log("\n✍️  GToken Approval for MySBT:", ethers.formatEther(approval), "GT");

  // Calculate what mintWithAutoStake will do
  const need = availableBalance < minLockAmount ? minLockAmount - availableBalance : 0n;
  console.log("\n🧮 Auto-Stake Calculation:");
  console.log("   Available balance:", ethers.formatEther(availableBalance), "GT");
  console.log("   Min lock amount:", ethers.formatEther(minLockAmount), "GT");
  console.log("   Need to stake:", ethers.formatEther(need), "GT");

  if (need > 0n) {
    if (walletBalance < need) {
      console.log("\n❌ PROBLEM: Insufficient wallet balance!");
      console.log("   Wallet has:", ethers.formatEther(walletBalance), "GT");
      console.log("   Need:", ethers.formatEther(need), "GT");
    } else {
      console.log("\n✅ Wallet balance sufficient for auto-stake");
    }
  }

  // Check total for both lock and burn
  const totalNeeded = minLockAmount + mintFee;
  if (walletBalance + stakedBalance < totalNeeded) {
    console.log("\n❌ PROBLEM: Total balance insufficient!");
    console.log("   Total balance:", ethers.formatEther(walletBalance + stakedBalance), "GT");
    console.log("   Total needed:", ethers.formatEther(totalNeeded), "GT");
  }
}

debug().catch(console.error);
