/**
 * 检查并添加 MySBT v2.4.2/v2.4.3 为 GTokenStaking locker
 */
import { ethers } from "ethers";

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N";
const GTOKEN_STAKING = "0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0"; // v2.0.1
const MYSBT_V2_4_2 = "0xD20F64718485E8aA317c0f353420cdB147661b20";

// MySBT v2.4.3 已部署
const MYSBT_V2_4_3 = "0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C";

const provider = new ethers.JsonRpcProvider(RPC_URL);

const gtokenStakingABI = [
  "function owner() view returns (address)",
  "function getLockerConfig(address locker) view returns (bool authorized, uint256 feeRateBps, uint256 minExitFee, uint256 maxFeePercent, uint256[] timeTiers, uint256[] tierFees, address feeRecipient)",
  "function configureLocker(address locker, bool authorized, uint256 feeRateBps, uint256 minExitFee, uint256 maxFeePercent, uint256[] memory timeTiers, uint256[] memory tierFees, address feeRecipient) external"
];

async function checkAndConfigure() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 检查 GTokenStaking Locker 配置");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const gtokenStaking = new ethers.Contract(GTOKEN_STAKING, gtokenStakingABI, provider);

  // 1. 检查 owner
  console.log("\n📊 步骤 1: 检查 GTokenStaking Owner");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const owner = await gtokenStaking.owner();
  console.log("GTokenStaking Owner:", owner);
  console.log("需要使用此地址的私钥来配置 locker");

  // 2. 检查 MySBT v2.4.2
  console.log("\n📊 步骤 2: 检查 MySBT v2.4.2");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("地址:", MYSBT_V2_4_2);

  let isLocker_v2_4_2 = false;
  try {
    const config = await gtokenStaking.getLockerConfig(MYSBT_V2_4_2);
    isLocker_v2_4_2 = config.authorized;
    console.log("是否已注册为 locker:", isLocker_v2_4_2 ? "✅ YES" : "❌ NO");

    if (isLocker_v2_4_2) {
      console.log("\n当前配置:");
      console.log("  Authorized:", config.authorized);
      console.log("  Fee Rate:", config.feeRateBps.toString(), "bps (", Number(config.feeRateBps) / 100, "%)");
      console.log("  Min Exit Fee:", ethers.formatEther(config.minExitFee), "GT");
      console.log("  Max Fee:", config.maxFeePercent.toString(), "bps (", Number(config.maxFeePercent) / 100, "%)");
      console.log("  Fee Recipient:", config.feeRecipient);
    }
  } catch (e) {
    console.log("❌ 无法获取 locker 配置:", e.message);
  }

  // 3. 检查 MySBT v2.4.3 (如果已部署)
  let isLocker_v2_4_3 = false;
  if (MYSBT_V2_4_3) {
    console.log("\n📊 步骤 3: 检查 MySBT v2.4.3");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("地址:", MYSBT_V2_4_3);

    try {
      const config = await gtokenStaking.getLockerConfig(MYSBT_V2_4_3);
      isLocker_v2_4_3 = config.authorized;
      console.log("是否已注册为 locker:", isLocker_v2_4_3 ? "✅ YES" : "❌ NO");

      if (isLocker_v2_4_3) {
        console.log("\n当前配置:");
        console.log("  Authorized:", config.authorized);
        console.log("  Fee Rate:", config.feeRateBps.toString(), "bps (", Number(config.feeRateBps) / 100, "%)");
        console.log("  Min Exit Fee:", ethers.formatEther(config.minExitFee), "GT");
        console.log("  Max Fee:", config.maxFeePercent.toString(), "bps (", Number(config.maxFeePercent) / 100, "%)");
        console.log("  Fee Recipient:", config.feeRecipient);
      }
    } catch (e) {
      console.log("❌ 无法获取 locker 配置:", e.message);
    }
  }

  // 4. 提供配置指令
  console.log("\n📝 配置指令");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n⚠️  需要使用 GTokenStaking owner 账户来执行配置\n");
  console.log("Owner 地址:", owner);
  console.log("\n选项 1: 使用 Foundry (推荐)");
  console.log("---------------------------------------");

  if (!isLocker_v2_4_2) {
    console.log("\n配置 MySBT v2.4.2:");
    console.log("cd /Volumes/UltraDisk/Dev2/aastar/SuperPaymaster");
    console.log("forge script script/ConfigureGTokenStaking_v2_4_2.s.sol:ConfigureGTokenStaking_v2_4_2 \\");
    console.log("  --rpc-url sepolia \\");
    console.log("  --broadcast \\");
    console.log("  --private-key <OWNER_PRIVATE_KEY> \\");
    console.log("  -vvvv");
  }

  if (MYSBT_V2_4_3) {
    console.log("\n配置 MySBT v2.4.3:");
    console.log("cd /Volumes/UltraDisk/Dev2/aastar/SuperPaymaster");
    console.log("forge script script/ConfigureGTokenStaking_v2_4_3.s.sol:ConfigureGTokenStaking_v2_4_3 \\");
    console.log("  --rpc-url sepolia \\");
    console.log("  --broadcast \\");
    console.log("  --private-key <OWNER_PRIVATE_KEY> \\");
    console.log("  -vvvv");
  }

  console.log("\n选项 2: 使用 Etherscan (手动)");
  console.log("---------------------------------------");
  console.log("1. 访问: https://sepolia.etherscan.io/address/" + GTOKEN_STAKING + "#writeContract");
  console.log("2. 连接钱包 (使用 owner 地址)");
  console.log("3. 找到 'configureLocker' 函数");
  console.log("4. 输入参数:");
  console.log("   locker: " + (MYSBT_V2_4_3 || MYSBT_V2_4_2));
  console.log("   authorized: true");
  console.log("   feeRateBps: 100 (1%)");
  console.log("   minExitFee: 10000000000000000 (0.01 GT)");
  console.log("   maxFeePercent: 500 (5%)");
  console.log("   timeTiers: []");
  console.log("   tierFees: []");
  console.log("   feeRecipient: " + (MYSBT_V2_4_3 || MYSBT_V2_4_2));
  console.log("5. 点击 'Write' 并确认交易");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

checkAndConfigure().catch(console.error);
