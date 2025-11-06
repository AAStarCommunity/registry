/**
 * 测试 MySBT v2.4.3 的 mintWithAutoStake 功能
 * 使用 TEST-USER5 账户
 */
import { ethers } from "ethers";

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N";
const TEST_USER5 = "0xE3D28Aa77c95d5C098170698e5ba68824BFC008d";
const TEST_USER5_KEY = "0x015cc1577bb8dcc6635eff3e35bbc57c6d927fa31874b82a89fb3a42492f44b0";

const MYSBT_V2_4_3 = "0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C";
const GTOKEN = "0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc";
const GTOKEN_STAKING = "0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0";
const REGISTRY = "0xf384c592D5258c91805128291c5D4c069DD30CA6";

// 测试社区 - Mycelium (新注册，已开启无权限 mint)
const TEST_COMMUNITY = "0x411BD567E46C0781248dbB6a9211891C032885e5";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(TEST_USER5_KEY, provider);

const gtokenABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

const gtokenStakingABI = [
  "function availableBalance(address user) view returns (uint256)",
  "function stakedBalance(address user) view returns (uint256)"
];

const mySBTABI = [
  "function mintWithAutoStake(address comm, string meta) returns (uint256 tid, bool isNew)",
  "function minLockAmount() view returns (uint256)",
  "function mintFee() view returns (uint256)",
  "function userToSBT(address user) view returns (uint256)"
];

const registryABI = [
  "function isPermissionlessMintAllowed(address community) view returns (bool)"
];

async function testMintWithAutoStake() {
  console.log("🧪 测试 MySBT v2.4.3 mintWithAutoStake 功能\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const gtoken = new ethers.Contract(GTOKEN, gtokenABI, provider);
  const gtokenStaking = new ethers.Contract(GTOKEN_STAKING, gtokenStakingABI, provider);
  const mySBT = new ethers.Contract(MYSBT_V2_4_3, mySBTABI, provider);
  const mySBTWithSigner = mySBT.connect(wallet);
  const registry = new ethers.Contract(REGISTRY, registryABI, provider);

  // 1. 检查用户状态
  console.log("📊 步骤 1: 检查 TEST-USER5 状态");
  console.log("用户地址:", TEST_USER5);
  console.log("");

  const walletBalance = await gtoken.balanceOf(TEST_USER5);
  const minLockAmount = await mySBT.minLockAmount();
  const mintFee = await mySBT.mintFee();
  const existingSBT = await mySBT.userToSBT(TEST_USER5);

  console.log("  钱包余额:", ethers.formatEther(walletBalance), "GT");
  console.log("  需要锁定:", ethers.formatEther(minLockAmount), "GT");
  console.log("  需要销毁:", ethers.formatEther(mintFee), "GT");
  console.log("  总共需要:", ethers.formatEther(minLockAmount + mintFee), "GT");
  console.log("  已有 SBT ID:", existingSBT.toString());
  console.log("");

  // 2. 检查社区状态
  console.log("📊 步骤 2: 检查社区配置");
  const isAllowed = await registry.isPermissionlessMintAllowed(TEST_COMMUNITY);
  console.log("  社区地址:", TEST_COMMUNITY);
  console.log("  允许无权限 mint:", isAllowed ? "✅ YES" : "❌ NO");
  console.log("  注意: 如果用户是社区管理员，即使未开启无权限 mint 也可以 mint");
  console.log("");

  // 3. 检查并授权
  console.log("📊 步骤 3: 检查 GToken 授权");
  const currentAllowance = await gtoken.allowance(TEST_USER5, MYSBT_V2_4_3);
  console.log("  当前授权:", ethers.formatEther(currentAllowance), "GT");

  // 保守估计：授权最大可能数量 (minLockAmount + mintFee)
  const totalNeeded = minLockAmount + mintFee;
  console.log("  需要授权:", ethers.formatEther(totalNeeded), "GT");
  console.log("");

  if (currentAllowance < totalNeeded) {
    console.log("⚡ 授权 MySBT 使用 GToken...");
    const gtokenWithSigner = gtoken.connect(wallet);
    const approveTx = await gtokenWithSigner.approve(MYSBT_V2_4_3, totalNeeded);
    console.log("  交易哈希:", approveTx.hash);
    await approveTx.wait();
    console.log("  ✅ 授权成功");
    console.log("");
  }

  // 4. 调用 mintWithAutoStake
  console.log("📊 步骤 4: 调用 mintWithAutoStake");
  console.log("  社区:", TEST_COMMUNITY);
  console.log("  元数据: Test MySBT v2.4.3");
  console.log("");

  try {
    console.log("⚡ 发送交易...");
    const tx = await mySBTWithSigner.mintWithAutoStake(
      TEST_COMMUNITY,
      "Test MySBT v2.4.3 mintWithAutoStake"
    );
    console.log("  交易哈希:", tx.hash);
    console.log("  等待确认...");

    const receipt = await tx.wait();
    console.log("  ✅ 交易成功!");
    console.log("");

    // 5. 检查结果
    console.log("📊 步骤 5: 检查结果");
    const newSBTId = await mySBT.userToSBT(TEST_USER5);
    const newWalletBalance = await gtoken.balanceOf(TEST_USER5);

    console.log("  SBT ID:", newSBTId.toString(), existingSBT === 0n ? "(新创建)" : "(已存在)");
    console.log("  钱包余额变化:", ethers.formatEther(walletBalance - newWalletBalance), "GT");
    console.log("");

    console.log("🎉 测试成功!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("✅ MySBT v2.4.3 mintWithAutoStake 功能正常");
    console.log(`   Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);

  } catch (error) {
    console.log("❌ 交易失败:", error.message);
    if (error.data) {
      console.log("   错误数据:", error.data);
    }
  }
}

testMintWithAutoStake().catch(console.error);
