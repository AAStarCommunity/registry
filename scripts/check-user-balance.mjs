import { ethers } from 'ethers';

const USER_ADDRESS = "0xE3D28Aa77c95d5C098170698e5ba68824BFC008d";
const GTOKEN_ADDRESS = "0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc";
const GTOKEN_STAKING_ADDRESS = "0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0";
const REGISTRY_ADDRESS = "0xf384c592D5258c91805128291c5D4c069DD30CA6";
const RPC_URL = "https://rpc.sepolia.org";

const provider = new ethers.JsonRpcProvider(RPC_URL);

const gtokenABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const stakingABI = [
  "function stakedBalance(address user) view returns (uint256)",
  "function availableBalance(address user) view returns (uint256)",
  "function lockedStake(address user) view returns (uint256)"
];

async function checkBalance() {
  const gtoken = new ethers.Contract(GTOKEN_ADDRESS, gtokenABI, provider);
  const staking = new ethers.Contract(GTOKEN_STAKING_ADDRESS, stakingABI, provider);
  
  console.log("🔍 Checking User Balance\n");
  console.log("User:", USER_ADDRESS);
  console.log("Community Name: EatDAO");
  console.log("Stake Amount: 30 GT");
  console.log("=".repeat(60));
  
  // GToken balance
  const walletBalance = await gtoken.balanceOf(USER_ADDRESS);
  console.log("\n💰 GToken Wallet Balance:", ethers.formatEther(walletBalance), "GT");
  
  // Staking balance
  const staked = await staking.stakedBalance(USER_ADDRESS);
  console.log("🔒 Staked Balance:", ethers.formatEther(staked), "GT");
  
  // Available balance
  const available = await staking.availableBalance(USER_ADDRESS);
  console.log("✅ Available Balance:", ethers.formatEther(available), "GT");
  
  // Locked stake
  const locked = await staking.lockedStake(USER_ADDRESS);
  console.log("🔐 Locked Stake:", ethers.formatEther(locked), "GT");
  
  // Allowances
  const allowanceStaking = await gtoken.allowance(USER_ADDRESS, GTOKEN_STAKING_ADDRESS);
  console.log("\n✍️  Allowances:");
  console.log("   GTokenStaking:", ethers.formatEther(allowanceStaking), "GT");
  
  const allowanceRegistry = await gtoken.allowance(USER_ADDRESS, REGISTRY_ADDRESS);
  console.log("   Registry:", ethers.formatEther(allowanceRegistry), "GT");
  
  // Analysis
  const required = ethers.parseEther("30");
  console.log("\n📊 Analysis:");
  console.log("   Required for registration: 30 GT");
  console.log("   Available balance:", ethers.formatEther(available), "GT");
  
  if (available < required) {
    const shortfall = required - available;
    console.log("\n❌ PROBLEM: Insufficient available balance!");
    console.log("   Shortfall:", ethers.formatEther(shortfall), "GT");
    console.log("\n💡 Possible causes:");
    console.log("   1. User hasn't staked enough GToken");
    console.log("   2. Previous stake is locked by another community");
    console.log("   3. User already registered another community");
  } else {
    console.log("\n✅ Available balance is sufficient");
  }
}

checkBalance().catch(console.error);
