import { ethers } from "ethers";

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N";
const USER_ADDRESS = "0xF7Bf79AcB7F3702b9DbD397d8140ac9DE6Ce642C";
const MYSBT_ADDRESS = "0xD20F64718485E8aA317c0f353420cdB147661b20";
const BBSTAR_COMMUNITY = "0xe24b6f321B0140716a2b671ed0D983bb64E7DaFA";

const provider = new ethers.JsonRpcProvider(RPC_URL);

const mySBTABI = [
  "function userToSBT(address owner) view returns (uint256)",
  "function sbtData(uint256 tokenId) view returns (tuple(address owner, uint256 mintedAt, uint256 lastUpdate, string metadata))",
  "function getMemberships(uint256 tid) view returns (tuple(address community, uint256 joinedAt, uint256 lastActiveAt, bool isActive, string metadata)[])"
];

async function checkUserSBT() {
  console.log("🔍 检查用户 SBT 状态...\n");

  const mySBT = new ethers.Contract(MYSBT_ADDRESS, mySBTABI, provider);

  try {
    const tokenId = await mySBT.userToSBT(USER_ADDRESS);
    console.log("用户地址:", USER_ADDRESS);
    console.log("SBT Token ID:", tokenId.toString());

    if (tokenId > 0n) {
      console.log("\n📋 用户拥有 SBT，检查 memberships:");

      try {
        const data = await mySBT.sbtData(tokenId);
        console.log(`  Owner: ${data.owner}`);
        console.log(`  Minted At: ${new Date(Number(data.mintedAt) * 1000).toISOString()}`);
      } catch (e) {
        console.log(`  无法获取 SBT data: ${e.message}`);
      }

      try {
        const memberships = await mySBT.getMemberships(tokenId);
        console.log(`\n  Communities (${memberships.length}):`);

        let hasBBStar = false;
        let bbStarIsActive = false;

        for (const m of memberships) {
          console.log(`    - ${m.community}`);
          console.log(`      Active: ${m.isActive}`);
          console.log(`      Joined: ${new Date(Number(m.joinedAt) * 1000).toISOString()}`);

          if (m.community.toLowerCase() === BBSTAR_COMMUNITY.toLowerCase()) {
            hasBBStar = true;
            bbStarIsActive = m.isActive;
            console.log(`      ⚠️  这是 bbStar 社区！`);
            if (m.isActive) {
              console.log(`      ❌ membership 已存在且活跃，不能再次 mint`);
            } else {
              console.log(`      ✅ membership 已失效，可以再次 mint`);
            }
          }
        }

        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("💡 诊断结论");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(`\n你已经拥有一个 SBT (Token ID: ${tokenId})`);

        if (hasBBStar) {
          console.log("\n❌ 你已经有 bbStar 社区的 membership!");
          console.log("\n这就是为什么 mintWithAutoStake 失败的原因：");
          console.log("  1. MySBT 设计是每个用户只有一个 SBT");
          console.log("  2. 一个 SBT 可以有多个 community memberships");
          console.log("  3. 但不能为同一个 community 重复添加 membership");
          console.log("  4. 你的 SBT 已经有 bbStar 的 " + (bbStarIsActive ? "活跃" : "失效") + " membership");

          if (bbStarIsActive) {
            console.log("\n❌ membership 是活跃状态，不能再次 mint");
          } else {
            console.log("\n✅ membership 已失效，可以再次 mint");
          }
        } else {
          console.log("\n✅ 你的 SBT 还没有 bbStar 社区的 membership");
          console.log("\n如果你想为 bbStar 社区添加 membership:");
          console.log("  1. 确认你有足够的可用质押余额");
          console.log("  2. 使用 mintWithAutoStake 或 userMint");
          console.log("  3. 这会为你的 SBT 添加一个新的 community membership");
        }
      } catch (e) {
        console.log(`  无法获取 memberships: ${e.message}`);
      }

    } else {
      console.log("\n✅ 用户没有任何 SBT");
      console.log("\n这很奇怪，因为你说已经成功 mint 了。");
      console.log("请检查:");
      console.log("  1. 交易是否真的成功了");
      console.log("  2. 是否使用了正确的用户地址");
      console.log("  3. 是否使用了正确的 MySBT 合约地址");
    }

  } catch (error) {
    console.error("\n❌ 错误:", error.message);
  }
}

checkUserSBT().catch(console.error);
