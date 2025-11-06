/**
 * 简化版 Locker 检查脚本 - 手动解析返回值
 */
import { ethers } from "ethers";

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N";
const GTOKEN_STAKING = "0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0";
const MYSBT_V2_4_2 = "0xD20F64718485E8aA317c0f353420cdB147661b20";

const provider = new ethers.JsonRpcProvider(RPC_URL);

async function checkLocker() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 检查 MySBT v2.4.2 Locker 状态");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("MySBT v2.4.2:", MYSBT_V2_4_2);
  console.log("GTokenStaking:", GTOKEN_STAKING);
  console.log("");

  // 直接调用链上数据
  const callData = ethers.id("getLockerConfig(address)").slice(0, 10) +
                    "000000000000000000000000" + MYSBT_V2_4_2.slice(2).toLowerCase();

  const result = await provider.call({
    to: GTOKEN_STAKING,
    data: callData
  });

  console.log("📊 Raw Result:", result);
  console.log("");

  // 手动解析返回值
  const abiCoder = new ethers.AbiCoder();

  try {
    // 跳过前32字节的结构体偏移量，从0x20开始解析
    const dataWithoutOffset = "0x" + result.slice(66);

    // 解析为独立字段（不使用结构体）
    const decoded = abiCoder.decode(
      ["bool", "uint256", "uint256", "uint256", "uint256[]", "uint256[]", "address"],
      dataWithoutOffset
    );

    const [authorized, feeRateBps, minExitFee, maxFeePercent, timeTiers, tierFees, feeRecipient] = decoded;

    console.log("✅ MySBT v2.4.2 Locker 配置:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Authorized:", authorized ? "✅ YES" : "❌ NO");
    console.log("  Fee Rate:", feeRateBps.toString(), "bps (" + (Number(feeRateBps) / 100) + "%)");
    console.log("  Min Exit Fee:", ethers.formatEther(minExitFee), "GT");
    console.log("  Max Fee:", maxFeePercent.toString(), "bps (" + (Number(maxFeePercent) / 100) + "%)");
    console.log("  Time Tiers:", timeTiers.length > 0 ? timeTiers.toString() : "[]");
    console.log("  Tier Fees:", tierFees.length > 0 ? tierFees.toString() : "[]");
    console.log("  Fee Recipient:", feeRecipient);
    console.log("");

    if (authorized) {
      console.log("🎉 MySBT v2.4.2 已经正确配置为 GTokenStaking 的 authorized locker!");
      console.log("");
      console.log("✅ 下一步: 部署 MySBT v2.4.3 并测试 auto-mint 功能");
    } else {
      console.log("❌ MySBT v2.4.2 未配置为 locker，需要使用 owner 账户配置");
    }

  } catch (error) {
    console.error("❌ 解析失败:", error.message);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

checkLocker().catch(console.error);
