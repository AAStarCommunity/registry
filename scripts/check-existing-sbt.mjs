import { ethers } from "ethers";

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N";
const USER_ADDRESS = "0xF7Bf79AcB7F3702b9DbD397d8140ac9DE6Ce642C";
const MYSBT_ADDRESS = "0xD20F64718485E8aA317c0f353420cdB147661b20";
const BBSTAR_COMMUNITY = "0xe24b6f321B0140716a2b671ed0D983bb64E7DaFA";

const provider = new ethers.JsonRpcProvider(RPC_URL);

const mySBTABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function communityOf(uint256 tokenId) view returns (address)",
  "function totalSupply() view returns (uint256)"
];

async function checkExistingSBT() {
  console.log("🔍 检查用户是否已拥有 SBT...\n");

  const mySBT = new ethers.Contract(MYSBT_ADDRESS, mySBTABI, provider);

  try {
    // Check user's SBT balance
    const balance = await mySBT.balanceOf(USER_ADDRESS);
    console.log("用户地址:", USER_ADDRESS);
    console.log("SBT 余额:", balance.toString());

    if (balance > 0n) {
      console.log("\n📋 用户拥有的 SBT:");

      for (let i = 0; i < Number(balance); i++) {
        const tokenId = await mySBT.tokenOfOwnerByIndex(USER_ADDRESS, i);
        const community = await mySBT.communityOf(tokenId);

        console.log(`\n  Token ID: ${tokenId}`);
        console.log(`  Community: ${community}`);

        if (community.toLowerCase() === BBSTAR_COMMUNITY.toLowerCase()) {
          console.log(`  ⚠️  用户已拥有 bbStar 社区的 SBT！`);
          console.log(`  这可能是 mint 失败的原因。`);
        }
      }
    } else {
      console.log("\n✅ 用户没有任何 SBT，可以正常 mint");
    }

    // Check total supply
    const totalSupply = await mySBT.totalSupply();
    console.log("\n📊 MySBT 合约总供应量:", totalSupply.toString());

  } catch (error) {
    console.error("\n❌ 错误:", error.message);
  }
}

checkExistingSBT();
