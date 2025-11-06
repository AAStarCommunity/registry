import { ethers } from "ethers";

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N";
const MYSBT_V2_4_3 = "0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C";

const provider = new ethers.JsonRpcProvider(RPC_URL);

const mySBTABI = [
  "function VERSION() view returns (string)",
  "function VERSION_CODE() view returns (uint256)",
  "function minLockAmount() view returns (uint256)",
  "function mintFee() view returns (uint256)",
  "function GTOKEN() view returns (address)",
  "function GTOKEN_STAKING() view returns (address)",
  "function REGISTRY() view returns (address)",
  "function daoMultisig() view returns (address)"
];

async function checkMySBT() {
  console.log("🔍 检查 MySBT v2.4.3 部署状态\n");
  console.log("地址:", MYSBT_V2_4_3);
  console.log("");

  const mySBT = new ethers.Contract(MYSBT_V2_4_3, mySBTABI, provider);

  try {
    const version = await mySBT.VERSION();
    const versionCode = await mySBT.VERSION_CODE();
    const minLockAmount = await mySBT.minLockAmount();
    const mintFee = await mySBT.mintFee();
    const gtoken = await mySBT.GTOKEN();
    const gtokenStaking = await mySBT.GTOKEN_STAKING();
    const registry = await mySBT.REGISTRY();
    const daoMultisig = await mySBT.daoMultisig();

    console.log("✅ 合约信息:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  VERSION:", version);
    console.log("  VERSION_CODE:", versionCode.toString());
    console.log("  minLockAmount:", ethers.formatEther(minLockAmount), "GT");
    console.log("  mintFee:", ethers.formatEther(mintFee), "GT");
    console.log("");
    console.log("  GTOKEN:", gtoken);
    console.log("  GTOKEN_STAKING:", gtokenStaking);
    console.log("  REGISTRY:", registry);
    console.log("  daoMultisig:", daoMultisig);
    console.log("");

    if (minLockAmount.toString() === "0" || mintFee.toString() === "0") {
      console.log("⚠️  警告: minLockAmount 或 mintFee 为 0");
      console.log("   应该是: minLockAmount = 0.3 GT, mintFee = 0.1 GT");
      console.log("   可能需要 DAO multisig 调用 setMinLockAmount 和 setMintFee");
    }

  } catch (error) {
    console.error("❌ 检查失败:", error.message);
  }
}

checkMySBT();
