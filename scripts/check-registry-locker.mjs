import { ethers } from 'ethers';

const REGISTRY_ADDRESS = "0xf384c592D5258c91805128291c5D4c069DD30CA6"; // Registry v2.1.4
const GTOKEN_STAKING_ADDRESS = "0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0";
const RPC_URL = "https://1rpc.io/sepolia";

const provider = new ethers.JsonRpcProvider(RPC_URL);

const stakingABI = [
  "function getLockerConfig(address locker) view returns (tuple(bool authorized, uint256 feeRateBps, uint256 minExitFee, uint256 maxFeePercent, uint256[] timeTiers, uint256[] feeMultipliers))"
];

async function checkRegistryLocker() {
  console.log("🔍 Checking if Registry is authorized as locker...\n");
  console.log("Registry:", REGISTRY_ADDRESS);
  console.log("GTokenStaking:", GTOKEN_STAKING_ADDRESS);
  console.log("=".repeat(80));

  const staking = new ethers.Contract(GTOKEN_STAKING_ADDRESS, stakingABI, provider);

  try {
    const lockerConfig = await staking.getLockerConfig(REGISTRY_ADDRESS);
    const isAuthorized = lockerConfig.authorized || lockerConfig[0]; // Try named field first, fallback to index

    console.log("\n📋 Result:");
    console.log("   Is Registry authorized as locker?", isAuthorized ? "✅ YES" : "❌ NO");

    if (!isAuthorized) {
      console.log("\n🔴 ROOT CAUSE FOUND!");
      console.log("   Registry v2.1.4 is NOT authorized as a locker in GTokenStaking!");
      console.log("\n💡 SOLUTION:");
      console.log("   The DAO multisig must call GTokenStaking.configureLocker() to authorize Registry.");
      console.log("\n📝 Steps to fix:");
      console.log("   1. Go to GTokenStaking contract on Etherscan:");
      console.log("      https://sepolia.etherscan.io/address/" + GTOKEN_STAKING_ADDRESS + "#writeContract");
      console.log("   2. Connect DAO multisig wallet");
      console.log("   3. Call configureLocker() with parameters:");
      console.log("      locker: " + REGISTRY_ADDRESS);
      console.log("      feeRateBps: 0 (or appropriate fee rate)");
      console.log("      minExitFee: 0 (or appropriate minimum fee)");
      console.log("      maxFeePercent: 10000 (100%)");
      console.log("      timeTiers: [] (empty array)");
      console.log("      feeMultipliers: [] (empty array)");
      console.log("   4. Confirm transaction");
    } else {
      console.log("\n✅ Registry is properly authorized as locker.");
      console.log("   The issue must be something else.");
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

checkRegistryLocker();
