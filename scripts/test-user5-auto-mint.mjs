/**
 * 测试 TEST-USER5 的 auto mint 功能
 * 这个用户有 300 GT，没有质押，没有 SBT
 * 完美测试 mintWithAutoStake 的场景
 */
import { ethers } from "ethers";

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N";
const USER_ADDRESS = "0xE3D28Aa77c95d5C098170698e5ba68824BFC008d";
const USER_PRIVATE_KEY = "0x015cc1577bb8dcc6635eff3e35bbc57c6d927fa31874b82a89fb3a42492f44b0";

const MYSBT_ADDRESS = "0xD20F64718485E8aA317c0f353420cdB147661b20";
const GTOKEN_STAKING_ADDRESS = "0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0";
const GTOKEN_ADDRESS = "0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc";
const BBSTAR_COMMUNITY = "0xe24b6f321B0140716a2b671ed0D983bb64E7DaFA";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(USER_PRIVATE_KEY, provider);

const gtokenStakingABI = [
  "function availableBalance(address user) view returns (uint256)",
  "function balanceOf(address user) view returns (uint256)"
];

const gtokenABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

const mySBTABI = [
  "function userToSBT(address owner) view returns (uint256)",
  "function minLockAmount() view returns (uint256)",
  "function mintFee() view returns (uint256)",
  "function mintWithAutoStake(address comm, string memory meta) returns (uint256 tid, bool isNew)"
];

async function testAutoMint() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧪 测试 TEST-USER5 的 Auto Mint 功能");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const gtokenStaking = new ethers.Contract(GTOKEN_STAKING_ADDRESS, gtokenStakingABI, provider);
  const gtoken = new ethers.Contract(GTOKEN_ADDRESS, gtokenABI, provider);
  const gtokenWithSigner = gtoken.connect(wallet);
  const mySBT = new ethers.Contract(MYSBT_ADDRESS, mySBTABI, provider);
  const mySBTWithSigner = mySBT.connect(wallet);

  // 1. 检查初始状态
  console.log("\n📊 步骤 1: 检查用户初始状态");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const walletBalance = await gtoken.balanceOf(USER_ADDRESS);
  const stakedBalance = await gtokenStaking.balanceOf(USER_ADDRESS);
  const availableBalance = await gtokenStaking.availableBalance(USER_ADDRESS);
  const tokenId = await mySBT.userToSBT(USER_ADDRESS);
  const minLockAmount = await mySBT.minLockAmount();
  const mintFee = await mySBT.mintFee();

  console.log("用户地址:", USER_ADDRESS);
  console.log("钱包 GT 余额:", ethers.formatEther(walletBalance), "GT");
  console.log("质押 GT 余额:", ethers.formatEther(stakedBalance), "GT");
  console.log("可用 GT 余额:", ethers.formatEther(availableBalance), "GT");
  console.log("当前 SBT ID:", tokenId.toString(), tokenId === 0n ? "(无 SBT)" : "");

  console.log("\n需要:");
  console.log("  锁定:", ethers.formatEther(minLockAmount), "GT");
  console.log("  燃烧:", ethers.formatEther(mintFee), "GT");
  console.log("  总计:", ethers.formatEther(minLockAmount + mintFee), "GT");

  const totalNeeded = minLockAmount + mintFee;
  if (walletBalance < totalNeeded) {
    console.log("\n❌ 错误: 钱包余额不足！");
    console.log("   需要:", ethers.formatEther(totalNeeded), "GT");
    console.log("   拥有:", ethers.formatEther(walletBalance), "GT");
    return;
  }

  // 2. 授权 GToken
  console.log("\n✍️  步骤 2: 授权 GToken 给 MySBT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const currentAllowance = await gtoken.allowance(USER_ADDRESS, MYSBT_ADDRESS);
  console.log("当前授权额度:", ethers.formatEther(currentAllowance), "GT");

  if (currentAllowance < totalNeeded) {
    console.log("需要授权:", ethers.formatEther(totalNeeded), "GT");
    const approveTx = await gtokenWithSigner.approve(MYSBT_ADDRESS, totalNeeded);
    console.log("授权交易已发送:", approveTx.hash);
    await approveTx.wait();
    console.log("✅ 授权成功！");
  } else {
    console.log("✅ 授权额度充足");
  }

  // 3. 调用 mintWithAutoStake
  console.log("\n🚀 步骤 3: 调用 mintWithAutoStake");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("目标社区:", BBSTAR_COMMUNITY);
  console.log("元数据: {}");

  console.log("\n预期行为:");
  console.log("  1. 检查可用余额:", ethers.formatEther(availableBalance), "GT");
  console.log("  2. 需要自动质押:", ethers.formatEther(minLockAmount - availableBalance), "GT");
  console.log("  3. 从钱包转入并质押");
  console.log("  4. 锁定", ethers.formatEther(minLockAmount), "GT");
  console.log("  5. 燃烧", ethers.formatEther(mintFee), "GT");
  console.log("  6. Mint SBT");

  try {
    console.log("\n发送交易...");
    const mintTx = await mySBTWithSigner.mintWithAutoStake(BBSTAR_COMMUNITY, "{}");
    console.log("Mint 交易已发送:", mintTx.hash);
    console.log("等待确认...");

    const receipt = await mintTx.wait();
    console.log("\n✅ Mint 成功！");
    console.log("Gas 使用:", receipt.gasUsed.toString());
    console.log("交易哈希:", receipt.hash);
    console.log("Etherscan:", `https://sepolia.etherscan.io/tx/${receipt.hash}`);

    // 解析事件
    const logs = receipt.logs;
    console.log("\n📋 事件日志:");
    for (const log of logs) {
      console.log("  - Topic:", log.topics[0]);
    }

  } catch (error) {
    console.log("\n❌ Mint 失败！");
    console.log("错误信息:", error.message);

    if (error.data) {
      console.log("错误数据:", error.data);

      // 尝试解析错误
      const errorSelector = error.data.slice(0, 10);
      console.log("\n错误 selector:", errorSelector);

      // InsufficientAvailableBalance
      if (errorSelector === "0xadb9e043") {
        const params = error.data.slice(10);
        const available = BigInt("0x" + params.slice(0, 64));
        const required = BigInt("0x" + params.slice(64, 128));
        console.log("\n解析错误: InsufficientAvailableBalance");
        console.log("  可用:", ethers.formatEther(available), "GT");
        console.log("  需要:", ethers.formatEther(required), "GT");
        console.log("\n💡 这就是 auto-stake 的 bug！");
        console.log("   stakeFor() 增加了质押余额，但没有立即变成 '可用' 余额");
        console.log("   lockStake() 检查可用余额时发现不足");
      }
    }
  }

  // 4. 检查最终状态
  console.log("\n📊 步骤 4: 检查最终状态");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const finalWalletBalance = await gtoken.balanceOf(USER_ADDRESS);
  const finalStakedBalance = await gtokenStaking.balanceOf(USER_ADDRESS);
  const finalAvailableBalance = await gtokenStaking.availableBalance(USER_ADDRESS);
  const finalTokenId = await mySBT.userToSBT(USER_ADDRESS);

  console.log("钱包 GT 余额:", ethers.formatEther(finalWalletBalance), "GT",
    `(${finalWalletBalance < walletBalance ? '-' : '+'}${ethers.formatEther(walletBalance - finalWalletBalance)} GT)`);
  console.log("质押 GT 余额:", ethers.formatEther(finalStakedBalance), "GT",
    `(+${ethers.formatEther(finalStakedBalance - stakedBalance)} GT)`);
  console.log("可用 GT 余额:", ethers.formatEther(finalAvailableBalance), "GT");
  console.log("SBT Token ID:", finalTokenId.toString(), finalTokenId > 0n ? "✅" : "❌");
}

testAutoMint().catch(console.error);
