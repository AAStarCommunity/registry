/**
 * Debug Script: Check Permissionless Mint Configuration
 * 检查社区的 permissionless mint 设置和相关配置
 */
import { ethers } from "ethers";

// 使用 .env 中的 Alchemy RPC URL
const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N";

// Contract addresses from shared-config
const MYSBT_ADDRESS = "0xD20F64718485E8aA317c0f353420cdB147661b20"; // MySBT v2.4.2
const REGISTRY_ADDRESS = "0xf384c592D5258c91805128291c5D4c069DD30CA6"; // Registry v2.1.4
const GTOKEN_STAKING_ADDRESS = "0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0";
const GTOKEN_ADDRESS = "0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc";

// bbStar community address (from error logs)
const BBSTAR_COMMUNITY = "0xe24b6f321B0140716a2b671ed0D983bb64E7DaFA";

// User address (from error logs)
const USER_ADDRESS = "0xF7Bf79AcB7F3702b9DbD397d8140ac9DE6Ce642C";

const provider = new ethers.JsonRpcProvider(RPC_URL);

// ABIs
const registryABI = [
  "function communities(address) view returns (tuple(address owner, string name, string ens, uint256 createdAt, bool allowPermissionlessMint, uint8 nodeType, uint8 slashLevel, uint256 lockedStake))",
  "function isPermissionlessMintAllowed(address community) view returns (bool)",
  "function isRegisteredCommunity(address community) view returns (bool)"
];

const mySBTABI = [
  "function REGISTRY() view returns (address)",
  "function minLockAmount() view returns (uint256)",
  "function mintFee() view returns (uint256)",
  "function GTOKEN_STAKING() view returns (address)",
  "function GTOKEN() view returns (address)"
];

const gtokenStakingABI = [
  "function availableBalance(address user) view returns (uint256)",
  "function balanceOf(address user) view returns (uint256)",
  "function getLockerConfig(address locker) view returns (tuple(bool authorized, uint256 feeRateBps, uint256 minExitFee, uint256 maxFeePercent, uint256[] timeTiers, uint256[] tierFees, address feeRecipient))"
];

const gtokenABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

async function debug() {
  console.log("🔍 调试 Permissionless Mint 配置...\n");
  console.log("📡 RPC URL:", RPC_URL, "\n");

  try {
    // 1. 检查 MySBT 合约配置
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 MySBT 合约配置");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const mySBT = new ethers.Contract(MYSBT_ADDRESS, mySBTABI, provider);

    const mySBTRegistry = await mySBT.REGISTRY();
    const minLockAmount = await mySBT.minLockAmount();
    const mintFee = await mySBT.mintFee();
    const mySBTGTokenStaking = await mySBT.GTOKEN_STAKING();
    const mySBTGToken = await mySBT.GTOKEN();

    console.log("MySBT Address:      ", MYSBT_ADDRESS);
    console.log("Registry (在合约中):", mySBTRegistry);
    console.log("Registry (预期):    ", REGISTRY_ADDRESS);
    console.log("Registry 匹配?      ", mySBTRegistry.toLowerCase() === REGISTRY_ADDRESS.toLowerCase() ? "✅ 是" : "❌ 否");
    console.log("GTokenStaking:      ", mySBTGTokenStaking);
    console.log("GToken:             ", mySBTGToken);
    console.log("Min Lock Amount:    ", ethers.formatEther(minLockAmount), "GT");
    console.log("Mint Fee:           ", ethers.formatEther(mintFee), "GT");

    // 2. 检查 Registry 社区配置
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🏛️  Registry 社区配置");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const registry = new ethers.Contract(REGISTRY_ADDRESS, registryABI, provider);

    const isRegistered = await registry.isRegisteredCommunity(BBSTAR_COMMUNITY);
    console.log("社区地址:           ", BBSTAR_COMMUNITY);
    console.log("社区已注册?         ", isRegistered ? "✅ 是" : "❌ 否");

    if (isRegistered) {
      const community = await registry.communities(BBSTAR_COMMUNITY);
      const isPermissionlessMintAllowed = await registry.isPermissionlessMintAllowed(BBSTAR_COMMUNITY);

      console.log("\n社区信息:");
      console.log("  Owner:                ", community.owner);
      console.log("  Name:                 ", community.name);
      console.log("  ENS:                  ", community.ens);
      console.log("  Created At:           ", new Date(Number(community.createdAt) * 1000).toLocaleString());
      console.log("  Allow Permissionless: ", community.allowPermissionlessMint ? "✅ 允许" : "❌ 禁止");
      console.log("  Node Type:            ", community.nodeType);
      console.log("  Slash Level:          ", community.slashLevel);
      console.log("  Locked Stake:         ", ethers.formatEther(community.lockedStake), "GT");
      console.log("\n  isPermissionlessMintAllowed():", isPermissionlessMintAllowed ? "✅ 允许" : "❌ 禁止");
    } else {
      console.log("\n❌ 错误: 社区未在 Registry 中注册!");
      console.log("   这就是 mintWithAutoStake 失败的原因。");
    }

    // 3. 检查用户余额
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("💰 用户余额信息");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const gtoken = new ethers.Contract(GTOKEN_ADDRESS, gtokenABI, provider);
    const gtokenStaking = new ethers.Contract(GTOKEN_STAKING_ADDRESS, gtokenStakingABI, provider);

    const walletBalance = await gtoken.balanceOf(USER_ADDRESS);
    const stakedBalance = await gtokenStaking.balanceOf(USER_ADDRESS);
    const availableBalance = await gtokenStaking.availableBalance(USER_ADDRESS);
    const lockedBalance = stakedBalance - availableBalance;
    const approval = await gtoken.allowance(USER_ADDRESS, MYSBT_ADDRESS);

    console.log("用户地址:           ", USER_ADDRESS);
    console.log("钱包余额:           ", ethers.formatEther(walletBalance), "GT");
    console.log("质押余额:           ", ethers.formatEther(stakedBalance), "GT");
    console.log("可用余额:           ", ethers.formatEther(availableBalance), "GT");
    console.log("锁定余额:           ", ethers.formatEther(lockedBalance), "GT");
    console.log("GToken Approval:    ", ethers.formatEther(approval), "GT");

    const totalBalance = walletBalance + stakedBalance;
    const requiredTotal = minLockAmount + mintFee;
    console.log("\n总余额:             ", ethers.formatEther(totalBalance), "GT");
    console.log("需要总额:           ", ethers.formatEther(requiredTotal), "GT");
    console.log("余额足够?           ", totalBalance >= requiredTotal ? "✅ 是" : "❌ 否");

    // 4. 检查 MySBT 授权
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔑 MySBT 授权状态");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const lockerConfig = await gtokenStaking.getLockerConfig(MYSBT_ADDRESS);
    const isMySBTLocker = lockerConfig.authorized;
    console.log("MySBT 是否为 Locker?", isMySBTLocker ? "✅ 是" : "❌ 否");
    if (isMySBTLocker) {
      console.log("费用接收者:", lockerConfig.feeRecipient);
      console.log("费率 (bps):", lockerConfig.feeRateBps.toString());
    }

    // 5. 诊断结论
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔬 诊断结论");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const issues = [];

    if (mySBTRegistry.toLowerCase() !== REGISTRY_ADDRESS.toLowerCase()) {
      issues.push("❌ MySBT 合约中的 Registry 地址不匹配");
    }

    if (!isRegistered) {
      issues.push("❌ 社区未在 Registry 中注册");
    } else if (!isPermissionlessMintAllowed) {
      issues.push("❌ 社区禁止了 permissionless mint");
    }

    if (!isMySBTLocker) {
      issues.push("❌ MySBT 未被授权为 GTokenStaking 的 locker");
    }

    if (totalBalance < requiredTotal) {
      issues.push("❌ 用户余额不足");
    }

    if (issues.length > 0) {
      console.log("\n发现以下问题:\n");
      issues.forEach(issue => console.log(issue));
    } else {
      console.log("\n✅ 所有检查通过！应该可以正常 mint。");
    }

  } catch (error) {
    console.error("\n❌ 调试过程出错:", error.message);
    if (error.code) {
      console.error("   错误代码:", error.code);
    }
  }
}

debug();
