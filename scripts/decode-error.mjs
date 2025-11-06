import { ethers } from "ethers";

// 解码错误数据
const errorData1 = "0xfb8f41b2000000000000000000000000d20f64718485e8aa317c0f353420cdb147661b2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000429d069189e0000";
const errorData2 = "0xadb9e04300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000429d069189e0000";

console.log("🔍 解码错误数据...\n");

// Error 1: mintWithAutoStake
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("❌ mintWithAutoStake 错误");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("完整数据:", errorData1);
console.log("\n解码:");
console.log("  Selector:", errorData1.slice(0, 10));

// 解码参数 (跳过 selector，剩下的是 3 个 32 字节参数)
const param1 = "0x" + errorData1.slice(10, 74);  // 第一个参数 (地址，右对齐)
const param2 = "0x" + errorData1.slice(74, 138); // 第二个参数
const param3 = "0x" + errorData1.slice(138, 202); // 第三个参数

// 地址需要取后 40 个字符
const address = "0x" + param1.slice(-40);
const value1 = BigInt(param2);
const value2 = BigInt(param3);

console.log("  参数 1 (address):", address);
console.log("  参数 2 (uint256):", value1.toString(), "=", ethers.formatEther(value1), "GT");
console.log("  参数 3 (uint256):", value2.toString(), "=", ethers.formatEther(value2), "GT");

console.log("\n🔎 可能的错误类型:");
console.log("  error InsufficientBalance(address account, uint256 available, uint256 required)");
console.log("  - account:", address, "(MySBT 合约地址)");
console.log("  - available:", ethers.formatEther(value1), "GT");
console.log("  - required:", ethers.formatEther(value2), "GT");

// Error 2: userMint
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("❌ userMint 错误");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("完整数据:", errorData2);
console.log("\n解码:");
console.log("  Selector:", errorData2.slice(0, 10));

const param2_1 = "0x" + errorData2.slice(10, 74);
const param2_2 = "0x" + errorData2.slice(74, 138);

const value2_1 = BigInt(param2_1);
const value2_2 = BigInt(param2_2);

console.log("  参数 1 (uint256):", value2_1.toString(), "=", ethers.formatEther(value2_1), "GT");
console.log("  参数 2 (uint256):", value2_2.toString(), "=", ethers.formatEther(value2_2), "GT");

console.log("\n🔎 可能的错误类型:");
console.log("  error InsufficientAvailableBalance(uint256 available, uint256 required)");
console.log("  - available:", ethers.formatEther(value2_1), "GT");
console.log("  - required:", ethers.formatEther(value2_2), "GT");

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("💡 诊断结论");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("\n问题:");
console.log("  用户的质押余额为 0 GT，可用余额也是 0 GT");
console.log("  但是 MySBT 需要 0.3 GT 的可用余额才能 mint");
console.log("\n预期行为:");
console.log("  mintWithAutoStake() 应该:");
console.log("  1. 检查用户的可用余额 (目前是 0 GT)");
console.log("  2. 如果不足 0.3 GT，应该从钱包余额中自动质押");
console.log("  3. 用户钱包有 200 GT，应该可以自动质押");
console.log("\n实际行为:");
console.log("  ❌ 函数在检查可用余额时就失败了");
console.log("  ❌ 没有执行自动质押逻辑");
console.log("\n可能原因:");
console.log("  1. MySBT 合约在调用 GTokenStaking.stakeFor() 之前就检查了余额");
console.log("  2. GTokenStaking.stakeFor() 调用失败了（权限、授权等问题）");
console.log("  3. MySBT 合约的 auto-stake 逻辑有 bug");

console.log("\n下一步调试:");
console.log("  需要查看 MySBT 合约源码，确认 mintWithAutoStake() 的实现逻辑");
