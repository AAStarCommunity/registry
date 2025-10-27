/**
 * Chainlink ETH/USD Price Feed Addresses
 * Reference: https://docs.chain.link/data-feeds/price-feeds/addresses
 * Last Updated: 2025-10-26
 */

export interface ChainlinkFeedConfig {
  chainId: number;
  network: string;
  ethUsdFeed: string;
  isTestnet: boolean;
}

/**
 * Chainlink Price Feed addresses for all supported networks
 */
export const CHAINLINK_FEEDS: Record<number, ChainlinkFeedConfig> = {
  // Ethereum Mainnet
  1: {
    chainId: 1,
    network: "Ethereum Mainnet",
    ethUsdFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    isTestnet: false,
  },

  // Sepolia Testnet
  11155111: {
    chainId: 11155111,
    network: "Sepolia",
    ethUsdFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    isTestnet: true,
  },

  // Polygon
  137: {
    chainId: 137,
    network: "Polygon",
    ethUsdFeed: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
    isTestnet: false,
  },

  // Mumbai Testnet (Deprecated)
  80001: {
    chainId: 80001,
    network: "Mumbai",
    ethUsdFeed: "0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada",
    isTestnet: true,
  },

  // Amoy Testnet (New Polygon Testnet)
  80002: {
    chainId: 80002,
    network: "Amoy",
    ethUsdFeed: "0xF0d50568e3A7e8259E16663972b11910F89BD8e7",
    isTestnet: true,
  },

  // Arbitrum One
  42161: {
    chainId: 42161,
    network: "Arbitrum One",
    ethUsdFeed: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
    isTestnet: false,
  },

  // Arbitrum Sepolia
  421614: {
    chainId: 421614,
    network: "Arbitrum Sepolia",
    ethUsdFeed: "0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165",
    isTestnet: true,
  },

  // Optimism
  10: {
    chainId: 10,
    network: "Optimism",
    ethUsdFeed: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
    isTestnet: false,
  },

  // Optimism Sepolia
  11155420: {
    chainId: 11155420,
    network: "Optimism Sepolia",
    ethUsdFeed: "0x61Ec26aA57019C486B10502285c5A3D4A4750AD7",
    isTestnet: true,
  },

  // Base
  8453: {
    chainId: 8453,
    network: "Base",
    ethUsdFeed: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
    isTestnet: false,
  },

  // Base Sepolia
  84532: {
    chainId: 84532,
    network: "Base Sepolia",
    ethUsdFeed: "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
    isTestnet: true,
  },

  // BNB Smart Chain
  56: {
    chainId: 56,
    network: "BNB Chain",
    ethUsdFeed: "0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e",
    isTestnet: false,
  },

  // BNB Testnet
  97: {
    chainId: 97,
    network: "BNB Testnet",
    ethUsdFeed: "0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7",
    isTestnet: true,
  },

  // Avalanche C-Chain
  43114: {
    chainId: 43114,
    network: "Avalanche",
    ethUsdFeed: "0x976B3D034E162d8bD72D6b9C989d545b839003b0",
    isTestnet: false,
  },

  // Avalanche Fuji Testnet
  43113: {
    chainId: 43113,
    network: "Fuji",
    ethUsdFeed: "0x86d67c3D38D2bCeE722E601025C25a575021c6EA",
    isTestnet: true,
  },

  // Fantom
  250: {
    chainId: 250,
    network: "Fantom",
    ethUsdFeed: "0x11DdD3d147E5b83D01cee7070027092397d63658",
    isTestnet: false,
  },

  // Gnosis Chain
  100: {
    chainId: 100,
    network: "Gnosis",
    ethUsdFeed: "0xa767f745331D267c7751297D982b050c93985627",
    isTestnet: false,
  },

  // Celo
  42220: {
    chainId: 42220,
    network: "Celo",
    ethUsdFeed: "0x022F9dCC73C5Fb43F2b4eF2EF9ad3eDD1D853946",
    isTestnet: false,
  },
};

/**
 * Get Chainlink ETH/USD price feed address for a given chain ID
 * @param chainId - The chain ID
 * @returns The Chainlink price feed address, or null if not supported
 */
export function getChainlinkFeed(chainId: number): string | null {
  const config = CHAINLINK_FEEDS[chainId];
  return config ? config.ethUsdFeed : null;
}

/**
 * Check if a chain ID is supported
 * @param chainId - The chain ID to check
 * @returns True if the chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in CHAINLINK_FEEDS;
}

/**
 * Get network name for a chain ID
 * @param chainId - The chain ID
 * @returns The network name, or "Unknown" if not found
 */
export function getNetworkName(chainId: number): string {
  const config = CHAINLINK_FEEDS[chainId];
  return config ? config.network : "Unknown";
}

/**
 * Get all supported mainnet chain IDs
 * @returns Array of mainnet chain IDs
 */
export function getMainnetChainIds(): number[] {
  return Object.values(CHAINLINK_FEEDS)
    .filter((config) => !config.isTestnet)
    .map((config) => config.chainId);
}

/**
 * Get all supported testnet chain IDs
 * @returns Array of testnet chain IDs
 */
export function getTestnetChainIds(): number[] {
  return Object.values(CHAINLINK_FEEDS)
    .filter((config) => config.isTestnet)
    .map((config) => config.chainId);
}
