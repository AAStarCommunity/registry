import { ethers } from "ethers";

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N";
const GTOKEN_STAKING = "0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0";
const MYSBT_V2_4_3 = "0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C";

const provider = new ethers.JsonRpcProvider(RPC_URL);

async function checkLocker() {
  console.log("🔍 检查 MySBT v2.4.3 Locker 配置\n");
  console.log("MySBT v2.4.3:", MYSBT_V2_4_3);
  console.log("GTokenStaking:", GTOKEN_STAKING);
  console.log("");

  // 手动构造 getLockerConfig 调用
  const callData = ethers.id("getLockerConfig(address)").slice(0, 10) +
                    "000000000000000000000000" + MYSBT_V2_4_3.slice(2).toLowerCase();

  try {
    const result = await provider.call({
      to: GTOKEN_STAKING,
      data: callData
    });

    console.log("原始返回数据:", result);
    console.log("");

    // 跳过前 32 字节(struct offset pointer)，然后解码
    const dataWithoutOffset = "0x" + result.slice(66);
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const decoded = abiCoder.decode(
      ["bool", "uint256", "uint256", "uint256", "uint256[]", "uint256[]", "address"],
      dataWithoutOffset
    );

    console.log("✅ MySBT v2.4.3 Locker 配置:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Authorized:", decoded[0] ? "✅ YES" : "❌ NO");
    console.log("  Fee Rate:", decoded[1].toString(), "bps (", Number(decoded[1]) / 100, "%)");
    console.log("  Min Exit Fee:", ethers.formatEther(decoded[2]), "GT");
    console.log("  Max Fee Percent:", decoded[3].toString(), "bps (", Number(decoded[3]) / 100, "%)");
    console.log("  Time Tiers:", decoded[4].length > 0 ? decoded[4].toString() : "[]");
    console.log("  Tier Fees:", decoded[5].length > 0 ? decoded[5].toString() : "[]");
    console.log("  Fee Recipient:", decoded[6]);
    console.log("");

    if (decoded[0]) {
      console.log("🎉 配置成功! MySBT v2.4.3 已被授权为 locker");
    } else {
      console.log("❌ 配置失败: MySBT v2.4.3 未被授权");
    }

  } catch (error) {
    console.error("❌ 检查失败:", error.message);
  }
}

checkLocker();
