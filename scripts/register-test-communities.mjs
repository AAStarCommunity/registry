/**
 * 注册测试社区: Mycelium 和 AAStar
 *
 * 需要准备:
 * 1. Deployer 账户私钥 (有足够的 GToken)
 * 2. GToken stake 数量 (建议每个社区 100 GT)
 */
import { ethers } from "ethers";

// ============================================
// 配置
// ============================================

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N";

// 合约地址
const REGISTRY_ADDRESS = "0xf384c592D5258c91805128291c5D4c069DD30CA6"; // Registry v2.1.4
const GTOKEN_ADDRESS = "0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc";
const GTOKEN_STAKING_ADDRESS = "0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0";
const MYSBT_V2_4_3_ADDRESS = "0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C";

// Deployer 账户 (需要设置环境变量或直接填写)
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "YOUR_PRIVATE_KEY_HERE";

// 测试社区配置
const TEST_COMMUNITIES = [
  {
    name: "Mycelium",
    ensName: "", // 留空
    nodeType: 1, // PAYMASTER_SUPER
    paymasterAddress: ethers.ZeroAddress, // 暂时留空
    supportedSBTs: [MYSBT_V2_4_3_ADDRESS],
    stakeAmount: ethers.parseEther("100") // 100 GT
  },
  {
    name: "AAStar",
    ensName: "", // 留空
    nodeType: 1, // PAYMASTER_SUPER
    paymasterAddress: ethers.ZeroAddress, // 暂时留空
    supportedSBTs: [MYSBT_V2_4_3_ADDRESS],
    stakeAmount: ethers.parseEther("100") // 100 GT
  }
];

// ============================================
// 合约 ABI
// ============================================

const gtokenABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

const gtokenStakingABI = [
  "function balanceOf(address user) view returns (uint256)",
  "function stake(uint256 amount) external"
];

const registryABI = [
  "struct CommunityProfile { string name; string ensName; address xPNTsToken; address[] supportedSBTs; uint8 nodeType; address paymasterAddress; address community; uint256 registeredAt; uint256 lastUpdatedAt; bool isActive; bool allowPermissionlessMint; }",
  "function registerCommunity(tuple(string name, string ensName, address xPNTsToken, address[] supportedSBTs, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, bool allowPermissionlessMint) profile, uint256 stGTokenAmount) external",
  "function getCommunityProfile(address communityAddress) view returns (tuple(string name, string ensName, address xPNTsToken, address[] supportedSBTs, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, bool allowPermissionlessMint))",
  "function communityByName(string) view returns (address)"
];

// ============================================
// 主函数
// ============================================

async function registerTestCommunities() {
  console.log("🚀 注册测试社区: Mycelium 和 AAStar\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (DEPLOYER_PRIVATE_KEY === "YOUR_PRIVATE_KEY_HERE") {
    console.log("❌ 错误: 请设置 DEPLOYER_PRIVATE_KEY 环境变量或在脚本中填写私钥");
    console.log("\n方式 1: 环境变量");
    console.log("export DEPLOYER_PRIVATE_KEY=0x...");
    console.log("node register-test-communities.mjs");
    console.log("\n方式 2: 直接在脚本中修改 DEPLOYER_PRIVATE_KEY 变量");
    return;
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
  const deployerAddress = wallet.address;

  console.log("📍 Deployer 地址:", deployerAddress);
  console.log("");

  const gtoken = new ethers.Contract(GTOKEN_ADDRESS, gtokenABI, wallet);
  const gtokenStaking = new ethers.Contract(GTOKEN_STAKING_ADDRESS, gtokenStakingABI, wallet);
  const registry = new ethers.Contract(REGISTRY_ADDRESS, registryABI, wallet);

  // 1. 检查 deployer 余额
  console.log("📊 步骤 1: 检查 Deployer 余额\n");
  const gtokenBalance = await gtoken.balanceOf(deployerAddress);
  const stakedBalance = await gtokenStaking.balanceOf(deployerAddress);

  const totalStakeNeeded = TEST_COMMUNITIES.reduce((sum, c) => sum + c.stakeAmount, 0n);

  console.log("  GToken 钱包余额:", ethers.formatEther(gtokenBalance), "GT");
  console.log("  GToken 已质押:", ethers.formatEther(stakedBalance), "GT");
  console.log("  需要质押总额:", ethers.formatEther(totalStakeNeeded), "GT");
  console.log("");

  if (gtokenBalance < totalStakeNeeded) {
    console.log("❌ 错误: GToken 余额不足");
    console.log(`   需要: ${ethers.formatEther(totalStakeNeeded)} GT`);
    console.log(`   拥有: ${ethers.formatEther(gtokenBalance)} GT`);
    console.log(`   缺少: ${ethers.formatEther(totalStakeNeeded - gtokenBalance)} GT`);
    return;
  }

  // 2. 授权并质押 GToken
  console.log("📊 步骤 2: 授权并质押 GToken\n");

  // 检查授权额度
  const currentAllowance = await gtoken.allowance(deployerAddress, GTOKEN_STAKING_ADDRESS);
  console.log("  当前授权:", ethers.formatEther(currentAllowance), "GT");

  if (currentAllowance < totalStakeNeeded) {
    console.log("  需要授权:", ethers.formatEther(totalStakeNeeded), "GT\n");
    console.log("⚡ 授权 GTokenStaking...");
    const approveTx = await gtoken.approve(GTOKEN_STAKING_ADDRESS, totalStakeNeeded);
    console.log("  交易哈希:", approveTx.hash);
    await approveTx.wait();
    console.log("  ✅ 授权成功\n");
  } else {
    console.log("  ✅ 授权额度充足\n");
  }

  console.log("⚡ 开始质押...");
  const stakeTx = await gtokenStaking.stake(totalStakeNeeded);
  console.log("  交易哈希:", stakeTx.hash);
  await stakeTx.wait();
  console.log("  ✅ 质押成功\n");

  const newStakedBalance = await gtokenStaking.balanceOf(deployerAddress);
  console.log("  新的质押余额:", ethers.formatEther(newStakedBalance), "GT\n");

  // 3. 注册社区
  console.log("📊 步骤 3: 注册测试社区\n");

  for (const [index, community] of TEST_COMMUNITIES.entries()) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  社区 ${index + 1}: ${community.name}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 检查社区是否已注册
    try {
      const existingCommunity = await registry.communityByName(community.name.toLowerCase());
      if (existingCommunity !== ethers.ZeroAddress) {
        console.log("  ⚠️  社区已存在");
        console.log("     地址:", existingCommunity);

        const profile = await registry.getCommunityProfile(existingCommunity);
        console.log("     状态:", profile.isActive ? "✅ 活跃" : "❌ 未激活");
        console.log("     允许无权限 mint:", profile.allowPermissionlessMint ? "✅ YES" : "❌ NO");
        console.log("");
        continue;
      }
    } catch (e) {
      // 社区不存在,继续注册
    }

    // 构建 CommunityProfile
    const profile = {
      name: community.name,
      ensName: community.ensName,
      xPNTsToken: ethers.ZeroAddress, // 暂时不设置
      supportedSBTs: community.supportedSBTs,
      nodeType: community.nodeType,
      paymasterAddress: community.paymasterAddress,
      community: deployerAddress, // 注册时会被替换为 msg.sender
      registeredAt: 0, // 合约会自动设置
      lastUpdatedAt: 0, // 合约会自动设置
      isActive: true, // 合约会自动设置
      allowPermissionlessMint: true // 合约会自动设置为 true
    };

    console.log("  配置:");
    console.log("    名称:", profile.name);
    console.log("    节点类型:", profile.nodeType === 1 ? "PAYMASTER_SUPER" : "UNKNOWN");
    console.log("    支持的 SBT:", profile.supportedSBTs.join(", "));
    console.log("    质押数量:", ethers.formatEther(community.stakeAmount), "GT");
    console.log("");

    try {
      console.log("  ⚡ 发送注册交易...");
      const registerTx = await registry.registerCommunity(profile, community.stakeAmount);
      console.log("     交易哈希:", registerTx.hash);
      console.log("     等待确认...");

      const receipt = await registerTx.wait();
      console.log("     ✅ 注册成功!\n");

      // 获取社区地址
      const communityAddress = await registry.communityByName(community.name.toLowerCase());
      console.log("  📍 社区地址:", communityAddress);

      // 验证注册结果
      const registeredProfile = await registry.getCommunityProfile(communityAddress);
      console.log("\n  ✅ 验证结果:");
      console.log("     名称:", registeredProfile.name);
      console.log("     活跃:", registeredProfile.isActive ? "✅ YES" : "❌ NO");
      console.log("     允许无权限 mint:", registeredProfile.allowPermissionlessMint ? "✅ YES" : "❌ NO");
      console.log("     注册时间:", new Date(Number(registeredProfile.registeredAt) * 1000).toLocaleString());
      console.log("");
      console.log(`     Etherscan: https://sepolia.etherscan.io/tx/${registerTx.hash}`);
      console.log("");

    } catch (error) {
      console.log("  ❌ 注册失败:", error.message);
      if (error.data) {
        console.log("     错误数据:", error.data);
      }
      console.log("");
    }
  }

  // 4. 最终统计
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 注册完成统计\n");

  for (const community of TEST_COMMUNITIES) {
    try {
      const communityAddress = await registry.communityByName(community.name.toLowerCase());
      const profile = await registry.getCommunityProfile(communityAddress);

      console.log(`  ${community.name}:`);
      console.log(`    地址: ${communityAddress}`);
      console.log(`    状态: ${profile.isActive ? "✅ 活跃" : "❌ 未激活"}`);
      console.log(`    无权限 mint: ${profile.allowPermissionlessMint ? "✅ 开启" : "❌ 关闭"}`);
      console.log("");
    } catch (e) {
      console.log(`  ${community.name}: ❌ 未注册\n`);
    }
  }

  console.log("🎉 所有操作完成!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

// ============================================
// 执行
// ============================================

registerTestCommunities().catch(console.error);
