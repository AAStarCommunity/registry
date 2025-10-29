import { ethers } from "ethers";

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
}

// 已知的 SuperPaymaster (AOA+) 合约地址
const KNOWN_SUPER_PAYMASTERS: Set<string> = new Set([
  "0xe25b068d4239c6dac484b8c51d62cc86f44859a7", // SuperPaymasterV2 Sepolia
]);

// 合约 ABI 片段
const SUPER_PAYMASTER_ABI = [
  "function accounts(address) view returns (tuple(uint256 stGTokenLocked, uint256 stakedAt, uint256 aPNTsBalance, uint256 totalSpent, uint256 lastRefillTime, uint256 minBalanceThreshold, address[] supportedSBTs, address xPNTsToken, address treasury, uint256 exchangeRate, uint256 reputationScore, uint256 consecutiveDays, uint256 totalTxSponsored, uint256 reputationLevel, uint256 lastCheckTime, bool isPaused))",
];

const PAYMASTER_V4_ABI = [
  "function owner() view returns (address)",
  "function treasury() view returns (address)",
  "function serviceFeeRate() view returns (uint256)",
  "function maxGasCostCap() view returns (uint256)",
];

/**
 * 检测 Paymaster 类型
 * @param address Paymaster 合约地址
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
  try {
    const code = await provider.getCode(address);
    if (code === "0x") {
      return {
        type: PaymasterType.UNKNOWN,
        address,
      };
    }
  } catch (error) {
    console.error("Failed to get contract code:", error);
    return {
      type: PaymasterType.UNKNOWN,
      address,
    };
  }

  // 3. 尝试调用 SuperPaymaster 特有函数
  try {
    const superPaymasterContract = new ethers.Contract(
      address,
      SUPER_PAYMASTER_ABI,
      provider
    );

    // 尝试调用 accounts() 函数
    // 如果成功且返回有效数据，说明是 SuperPaymaster
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

  // 4. 尝试调用 PaymasterV4 特有函数
  try {
    const paymasterV4Contract = new ethers.Contract(
      address,
      PAYMASTER_V4_ABI,
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

  // 5. 无法确定类型
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
