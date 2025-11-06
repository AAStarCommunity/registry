import { ethers } from "ethers";

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N";
const USER_ADDRESS = "0xF7Bf79AcB7F3702b9DbD397d8140ac9DE6Ce642C";
const MYSBT_ADDRESS = "0xD20F64718485E8aA317c0f353420cdB147661b20";
const BBSTAR_COMMUNITY = "0xe24b6f321B0140716a2b671ed0D983bb64E7DaFA";
const GTOKEN_ADDRESS = "0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc";

const provider = new ethers.JsonRpcProvider(RPC_URL);

const mySBTABI = [
  "function mintWithAutoStake(address comm, string memory meta) external",
  "function userMint(address comm, string memory meta) external",
  "function minLockAmount() view returns (uint256)",
  "function mintFee() view returns (uint256)",
  "function REGISTRY() view returns (address)",
  "function GTOKEN_STAKING() view returns (address)",
  "function GTOKEN() view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
  "function communityOf(uint256 tokenId) view returns (address)"
];

const gtokenABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

async function simulateMint() {
  console.log("🧪 模拟 mintWithAutoStake 调用...\n");

  const mySBT = new ethers.Contract(MYSBT_ADDRESS, mySBTABI, provider);
  const gToken = new ethers.Contract(GTOKEN_ADDRESS, gtokenABI, provider);

  try {
    // 1. 显示当前状态
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 调用前状态");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const walletBalance = await gToken.balanceOf(USER_ADDRESS);
    const approval = await gToken.allowance(USER_ADDRESS, MYSBT_ADDRESS);
    const minLockAmount = await mySBT.minLockAmount();
    const mintFee = await mySBT.mintFee();
    const userSBTBalance = await mySBT.balanceOf(USER_ADDRESS);

    console.log("用户地址:", USER_ADDRESS);
    console.log("钱包余额:", ethers.formatEther(walletBalance), "GT");
    console.log("GToken 授权:", ethers.formatEther(approval), "GT");
    console.log("需要锁定:", ethers.formatEther(minLockAmount), "GT");
    console.log("需要燃烧:", ethers.formatEther(mintFee), "GT");
    console.log("用户当前 SBT 数量:", userSBTBalance.toString());

    // 2. 尝试使用 staticCall 模拟调用
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 尝试 staticCall mintWithAutoStake...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("社区地址:", BBSTAR_COMMUNITY);
    console.log("Metadata: {}");

    // 使用 staticCall 模拟调用（不发送交易）
    const result = await mySBT.mintWithAutoStake.staticCall(
      BBSTAR_COMMUNITY,
      "{}"
    );

    console.log("\n✅ staticCall 成功！");
    console.log("返回值:", result);

    // 3. 尝试估算 gas
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("⛽ 尝试估算 gas...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const gasEstimate = await mySBT.mintWithAutoStake.estimateGas(
      BBSTAR_COMMUNITY,
      "{}"
    );

    console.log("✅ Gas 估算成功:", gasEstimate.toString());

  } catch (error) {
    console.error("\n❌ 调用失败:");
    console.error("错误消息:", error.message);

    if (error.data) {
      console.error("错误数据:", error.data);

      // 尝试解析错误
      if (error.data === "0x3ee5aeb5") {
        console.error("\n这是 MySBT 合约的 error E() - 通用 NFT 操作错误");
        console.error("可能的原因:");
        console.error("  - 社区未在 Registry 注册");
        console.error("  - 社区禁止了 permissionless mint");
        console.error("  - 用户已拥有该社区的 SBT");
        console.error("  - NFT 铸造操作本身失败");
      }
    }

    if (error.code) {
      console.error("错误代码:", error.code);
    }

    // 打印完整错误以便调试
    console.error("\n完整错误对象:");
    console.error(JSON.stringify(error, null, 2));
  }

  // 4. 同时测试 userMint（需要预先质押）
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧪 对比测试: staticCall userMint...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const result = await mySBT.userMint.staticCall(
      BBSTAR_COMMUNITY,
      "{}"
    );
    console.log("✅ userMint staticCall 成功！");
    console.log("返回值:", result);
  } catch (error) {
    console.error("❌ userMint 也失败:");
    console.error("错误:", error.message);
    if (error.data) {
      console.error("错误数据:", error.data);
    }
  }
}

simulateMint().catch(console.error);
