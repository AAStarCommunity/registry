import { ethers } from "ethers";
import { SuperPaymasterV2ABI, PaymasterV4ABI } from "../config/abis";
import { getCurrentNetworkConfig } from "../config/networkConfig";

export const PaymasterType = {
  AOA: "AOA", // PaymasterV4 - 独立合约，单个operator
  AOA_PLUS: "AOA_PLUS", // SuperPaymaster - 统一合约，多个operator账户
  UNKNOWN: "UNKNOWN",
} as const;

export type PaymasterType = typeof PaymasterType[keyof typeof PaymasterType];

interface PaymasterInfo {
  type: PaymasterType;
  address: string;
  isOperatorAccount?: boolean; // 仅对 AOA+ 有效
  paymasterContractAddress?: string; // 如果是operator账户，存储其关联的Paymaster合约地址
}

// 已知的 SuperPaymaster (AOA+) 合约地址
const KNOWN_SUPER_PAYMASTERS: Set<string> = new Set([
  "0xfaB5B2A129DF8308a70DA2fE77c61001e4Df58BC".toLowerCase(), // SuperPaymasterV2 Sepolia (from config)
]);

/**
 * 检测 Paymaster 类型
 * @param address Paymaster合约地址 或 Operator账户地址
 * @param provider ethers Provider
 * @returns PaymasterInfo 包含类型和相关信息
 */
export async function detectPaymasterType(
  address: string,
  provider: ethers.Provider
): Promise<PaymasterInfo> {
  // 标准化地址
  const normalizedAddress = address.toLowerCase();

  // 1. 检查已知的 SuperPaymaster 地址
  if (KNOWN_SUPER_PAYMASTERS.has(normalizedAddress)) {
    return {
      type: PaymasterType.AOA_PLUS,
      address,
      isOperatorAccount: false,
    };
  }

  // 2. 检查合约代码是否存在
  let hasCode = false;
  try {
    const code = await provider.getCode(address);
    hasCode = code !== "0x";
  } catch (error) {
    console.error("Failed to get contract code:", error);
  }

  // 3. 如果没有合约代码，可能是 operator 账户地址，检查是否在 PaymasterFactory 或 SuperPaymaster 注册
  if (!hasCode) {
    const networkConfig = getCurrentNetworkConfig();

    // 3a. 检查是否在 SuperPaymaster 注册为 operator (AOA+)
    try {
      const superPaymasterAddress = networkConfig.contracts.superPaymasterV2;
      const superPaymasterABI = [
        "function accounts(address) external view returns (uint256, uint256 stakedAt)"
      ];
      const superPaymaster = new ethers.Contract(superPaymasterAddress, superPaymasterABI, provider);

      const [, stakedAt] = await superPaymaster.accounts(address);
      if (stakedAt > 0n) {
        // 这个地址是 SuperPaymaster 的 operator
        return {
          type: PaymasterType.AOA_PLUS,
          address,
          isOperatorAccount: true,
          paymasterContractAddress: superPaymasterAddress,
        };
      }
    } catch (error) {
      console.log("Not a SuperPaymaster operator:", error);
    }

    // 3b. 检查是否通过 PaymasterFactory 部署了 Paymaster (AOA)
    try {
      const factoryAddress = networkConfig.contracts.paymasterFactory;
      const factoryABI = [
        "function hasPaymaster(address) external view returns (bool)",
        "function paymasterByOperator(address) external view returns (address)"
      ];
      const factory = new ethers.Contract(factoryAddress, factoryABI, provider);

      const hasPaymaster = await factory.hasPaymaster(address);
      if (hasPaymaster) {
        const paymasterAddress = await factory.paymasterByOperator(address);
        // 这个地址是 AOA Paymaster 的 operator，返回其部署的 Paymaster 合约地址
        return {
          type: PaymasterType.AOA,
          address: paymasterAddress, // 返回 Paymaster 合约地址
          isOperatorAccount: true,
          paymasterContractAddress: paymasterAddress,
        };
      }
    } catch (error) {
      console.log("Not a PaymasterFactory operator:", error);
    }

    // 没有合约代码，也不是任何 operator
    return {
      type: PaymasterType.UNKNOWN,
      address,
    };
  }

  // 4. 有合约代码，尝试调用 SuperPaymaster 特有函数
  try {
    const superPaymasterContract = new ethers.Contract(
      address,
      SuperPaymasterV2ABI,
      provider
    );

    // 尝试调用 accounts() 函数
    // 如果成功且返回有效数据，说明是 SuperPaymaster 合约
    const accountInfo = await superPaymasterContract.accounts(ethers.ZeroAddress);

    // 检查返回的数据结构是否合理
    if (accountInfo && Array.isArray(accountInfo)) {
      return {
        type: PaymasterType.AOA_PLUS,
        address,
        isOperatorAccount: false,
      };
    }
  } catch (error) {
    // accounts() 调用失败，可能不是 SuperPaymaster
    // 继续检查 PaymasterV4
  }

  // 5. 尝试调用 PaymasterV4 特有函数
  try {
    const paymasterV4Contract = new ethers.Contract(
      address,
      PaymasterV4ABI,
      provider
    );

    // 尝试调用 serviceFeeRate() 和 owner() - PaymasterV4 特有的组合
    const [serviceFeeRate, owner] = await Promise.all([
      paymasterV4Contract.serviceFeeRate(),
      paymasterV4Contract.owner(),
    ]);

    // 如果两个调用都成功，说明是 PaymasterV4
    if (
      serviceFeeRate !== undefined &&
      owner &&
      ethers.isAddress(owner)
    ) {
      return {
        type: PaymasterType.AOA,
        address,
      };
    }
  } catch (error) {
    // PaymasterV4 调用也失败
    console.error("Failed to detect paymaster type:", error);
  }

  // 6. 无法确定类型
  return {
    type: PaymasterType.UNKNOWN,
    address,
  };
}

/**
 * 添加已知的 SuperPaymaster 地址
 * @param address SuperPaymaster 合约地址
 */
export function addKnownSuperPaymaster(address: string): void {
  KNOWN_SUPER_PAYMASTERS.add(address.toLowerCase());
}

/**
 * 批量添加已知的 SuperPaymaster 地址
 * @param addresses SuperPaymaster 合约地址数组
 */
export function addKnownSuperPaymasters(addresses: string[]): void {
  addresses.forEach((addr) => KNOWN_SUPER_PAYMASTERS.add(addr.toLowerCase()));
}

/**
 * 获取所有已知的 SuperPaymaster 地址
 * @returns SuperPaymaster 地址数组
 */
export function getKnownSuperPaymasters(): string[] {
  return Array.from(KNOWN_SUPER_PAYMASTERS);
}
