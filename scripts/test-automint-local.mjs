/**
 * 本地测试脚本：重现 mintWithAutoStake 的问题
 * 模拟用户没有质押余额的情况
 */
import { ethers } from "ethers";

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N";
const MYSBT_ADDRESS = "0xD20F64718485E8aA317c0f353420cdB147661b20";
const GTOKEN_STAKING_ADDRESS = "0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0";
const GTOKEN_ADDRESS = "0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc";
const BBSTAR_COMMUNITY = "0xe24b6f321B0140716a2b671ed0D983bb64E7DaFA";

// 测试地址（你的地址，现在已经有质押了）
const USER_ADDRESS = "0xF7Bf79AcB7F3702b9DbD397d8140ac9DE6Ce642C";

const provider = new ethers.JsonRpcProvider(RPC_URL);

const mySBTABI = [
  "function mintWithAutoStake(address comm, string memory meta) external returns (uint256 tid, bool isNew)",
  "function minLockAmount() view returns (uint256)",
  "function mintFee() view returns (uint256)"
];

const gtokenStakingABI = [
  "function availableBalance(address user) view returns (uint256)",
  "function balanceOf(address user) view returns (uint256)"
];

const gtokenABI = [
  "function balanceOf(address) view returns (uint256)"
];

async function testAutoMint() {
  console.log("🧪 测试 mintWithAutoStake 功能\n");

  const mySBT = new ethers.Contract(MYSBT_ADDRESS, mySBTABI, provider);
  const gtokenStaking = new ethers.Contract(GTOKEN_STAKING_ADDRESS, gtokenStakingABI, provider);
  const gtoken = new ethers.Contract(GTOKEN_ADDRESS, gtokenABI, provider);

  // 1. 检查当前状态
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 当前用户状态");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const walletBalance = await gtoken.balanceOf(USER_ADDRESS);
  const stakedBalance = await gtokenStaking.balanceOf(USER_ADDRESS);
  const availableBalance = await gtokenStaking.availableBalance(USER_ADDRESS);
  const minLockAmount = await mySBT.minLockAmount();
  const mintFee = await mySBT.mintFee();

  console.log("用户地址:", USER_ADDRESS);
  console.log("钱包余额:", ethers.formatEther(walletBalance), "GT");
  console.log("质押余额:", ethers.formatEther(stakedBalance), "GT");
  console.log("可用余额:", ethers.formatEther(availableBalance), "GT");
  console.log("锁定余额:", ethers.formatEther(stakedBalance - availableBalance), "GT");
  console.log("\nMint 需求:");
  console.log("需要锁定:", ethers.formatEther(minLockAmount), "GT");
  console.log("需要燃烧:", ethers.formatEther(mintFee), "GT");

  // 2. 分析问题
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 问题分析");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (availableBalance < minLockAmount) {
    const need = minLockAmount - availableBalance;
    console.log("\n可用余额不足，需要自动质押:", ethers.formatEther(need), "GT");

    console.log("\nmintWithAutoStake 会执行以下步骤:");
    console.log("1. 从用户钱包转 " + ethers.formatEther(need) + " GT 到 MySBT 合约");
    console.log("2. MySBT 授权 GTokenStaking");
    console.log("3. 调用 stakeFor(user, " + ethers.formatEther(need) + ")");
    console.log("   ⚠️  问题：stakeFor 增加质押余额，但不是立即可用");
    console.log("4. 调用 userMint()");
    console.log("   ❌ userMint 调用 lockStake() 需要检查可用余额");
    console.log("   ❌ 但可用余额还是 " + ethers.formatEther(availableBalance) + " GT！");
    console.log("   ❌ 所以抛出 InsufficientAvailableBalance 错误");

    console.log("\n💡 根本原因:");
    console.log("   stakeFor() 和 lockStake() 在同一个交易中");
    console.log("   刚质押的余额还没有变成'可用'状态");
    console.log("   lockStake() 检查时发现可用余额不足");
  } else {
    console.log("\n✅ 可用余额充足，不需要自动质押");
  }

  // 3. 模拟调用（不实际发送交易）
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧪 模拟调用 mintWithAutoStake");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    await mySBT.mintWithAutoStake.staticCall(BBSTAR_COMMUNITY, "{}");
    console.log("✅ staticCall 成功！");
  } catch (error) {
    console.log("❌ staticCall 失败:");
    console.log("错误消息:", error.message);
    if (error.data) {
      console.log("错误数据:", error.data);

      // 解析错误
      if (error.data.startsWith("0xadb9e043")) {
        const data = error.data.slice(10); // 移除 selector
        const available = BigInt("0x" + data.slice(0, 64));
        const required = BigInt("0x" + data.slice(64, 128));

        console.log("\n解析错误:");
        console.log("  InsufficientAvailableBalance(uint256 available, uint256 required)");
        console.log("  available:", ethers.formatEther(available), "GT");
        console.log("  required:", ethers.formatEther(required), "GT");
        console.log("\n✅ 这证实了我们的分析：可用余额不足！");
      }
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("💡 解决方案");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n需要修复 MySBT v2.4.2 的 mintWithAutoStake() 函数：");
  console.log("1. 不要先 stakeFor 再调用 userMint");
  console.log("2. 应该在 mintWithAutoStake 内部直接完成所有操作");
  console.log("3. 将质押和锁定合并为一个步骤");
  console.log("\n修复后的逻辑：");
  console.log("  if (availableBalance < minLockAmount) {");
  console.log("    // 从钱包转入并质押");
  console.log("    uint256 need = minLockAmount - availableBalance;");
  console.log("    IERC20(GTOKEN).safeTransferFrom(msg.sender, address(this), need);");
  console.log("    IERC20(GTOKEN).approve(GTOKEN_STAKING, need);");
  console.log("    IGTokenStaking(GTOKEN_STAKING).stakeFor(msg.sender, need);");
  console.log("  }");
  console.log("  // 直接锁定整个 minLockAmount（包括新质押的）");
  console.log("  IGTokenStaking(GTOKEN_STAKING).lockStake(msg.sender, minLockAmount, 'MySBT');");
  console.log("  // 继续 mint 流程...");
}

testAutoMint().catch(console.error);
