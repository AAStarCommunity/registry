import { ethers } from 'ethers';

const FAILED_TX = "0x7c319f8173363acd80dba74eface1aec3b55f3090855d0484fa84f8019d2f643";
const USER_ADDRESS = "0xE3D28Aa77c95d5C098170698e5ba68824BFC008d";
const REGISTRY_ADDRESS = "0xf384c592D5258c91805128291c5D4c069DD30CA6";
const GTOKEN_STAKING_ADDRESS = "0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0";
const GTOKEN_ADDRESS = "0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc";
const RPC_URL = process.env.PRIVATE_RPC_URL || "https://rpc.ankr.com/eth_sepolia";

const provider = new ethers.JsonRpcProvider(RPC_URL);

console.log("🔍 Analyzing Failed Transaction\n");
console.log("TX Hash:", FAILED_TX);
console.log("User:", USER_ADDRESS);
console.log("=".repeat(80));

async function analyzeTx() {
  try {
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(FAILED_TX);
    console.log("\n📋 Transaction Receipt:");
    console.log("   Status:", receipt.status === 0 ? "❌ FAILED" : "✅ SUCCESS");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas Used:", receipt.gasUsed.toString());
    
    // Get transaction details
    const tx = await provider.getTransaction(FAILED_TX);
    console.log("\n📝 Transaction Details:");
    console.log("   From:", tx.from);
    console.log("   To:", tx.to);
    console.log("   Value:", ethers.formatEther(tx.value), "ETH");
    console.log("   Data Length:", tx.data.length, "bytes");
    
    // Try to decode input data
    console.log("\n🔍 Attempting to decode transaction data...");
    console.log("   Function Selector:", tx.data.substring(0, 10));
    
    // Check current user balances
    console.log("\n\n💰 Current User Balances:");
    const gtokenABI = [
      "function balanceOf(address) view returns (uint256)"
    ];
    const stakingABI = [
      "function stakedBalance(address user) view returns (uint256)",
      "function availableBalance(address user) view returns (uint256)",
      "function getLockedStake(address user, address locker) view returns (uint256)"
    ];
    
    const gtoken = new ethers.Contract(GTOKEN_ADDRESS, gtokenABI, provider);
    const staking = new ethers.Contract(GTOKEN_STAKING_ADDRESS, stakingABI, provider);
    
    const walletBalance = await gtoken.balanceOf(USER_ADDRESS);
    console.log("   GToken Wallet:", ethers.formatEther(walletBalance), "GT");
    
    const stakedBalance = await staking.stakedBalance(USER_ADDRESS);
    console.log("   Staked Balance:", ethers.formatEther(stakedBalance), "GT");
    
    const availableBalance = await staking.availableBalance(USER_ADDRESS);
    console.log("   Available Balance:", ethers.formatEther(availableBalance), "GT");
    
    const lockedByRegistry = await staking.getLockedStake(USER_ADDRESS, REGISTRY_ADDRESS);
    console.log("   Locked by Registry:", ethers.formatEther(lockedByRegistry), "GT");
    
    // Analysis
    console.log("\n\n📊 Analysis:");
    const required = ethers.parseEther("30");
    
    if (availableBalance === 0n) {
      console.log("❌ PROBLEM: Available balance is ZERO!");
      console.log("\n💡 This means:");
      if (stakedBalance === 0n) {
        console.log("   • User has NOT staked any GToken yet");
        console.log("   • User needs to stake at least 30 GT first");
      } else {
        console.log("   • User HAS staked:", ethers.formatEther(stakedBalance), "GT");
        console.log("   • But ALL staked tokens are locked");
        console.log("   • Locked by Registry:", ethers.formatEther(lockedByRegistry), "GT");
        console.log("   • This usually means user already registered a community");
      }
    } else if (availableBalance < required) {
      const shortfall = required - availableBalance;
      console.log("❌ PROBLEM: Available balance insufficient!");
      console.log("   Need:", ethers.formatEther(required), "GT");
      console.log("   Have:", ethers.formatEther(availableBalance), "GT");
      console.log("   Shortfall:", ethers.formatEther(shortfall), "GT");
    } else {
      console.log("✅ Available balance is sufficient");
      console.log("   This error may be due to state sync issue");
    }
    
    // Check at transaction block
    console.log("\n\n🕐 Balance at Failed Transaction Block:");
    const blockNumber = receipt.blockNumber;
    const balanceAtBlock = await staking.availableBalance(USER_ADDRESS, { blockTag: blockNumber - 1 });
    console.log("   Block:", blockNumber - 1, "(before failed tx)");
    console.log("   Available Balance:", ethers.formatEther(balanceAtBlock), "GT");
    
    if (balanceAtBlock < required) {
      console.log("   ❌ Insufficient at that time");
    } else {
      console.log("   ✅ Sufficient at that time - RPC issue!");
    }
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    
    if (error.message.includes("could not find transaction")) {
      console.log("\n💡 Transaction not found. Possible reasons:");
      console.log("   1. Wrong network (check if on Sepolia)");
      console.log("   2. Transaction too old and pruned");
      console.log("   3. Wrong RPC endpoint");
    }
  }
}

analyzeTx();
