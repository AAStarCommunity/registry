/**
 * Network Configuration Module
 *
 * Centralized configuration for different networks (Sepolia, Mainnet, etc.)
 * Includes contract addresses, faucet links, and network-specific settings
 */

export interface NetworkConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  explorerUrl: string;

  // Contract addresses
  contracts: {
    paymasterV4: string;
    registry: string; // Legacy v1.2 (ETH staking)
    registryV2: string; // v2.0 (metadata only)
    pntToken: string;
    gToken: string;
    gTokenStaking: string; // v2.0 staking contract
    gasTokenFactory: string;
    sbtContract: string;
    usdtContract: string;
    entryPointV07: string;
    xPNTsFactory: string; // v2.0
    mySBT: string; // v2.0
    superPaymasterV2: string; // v2.0
  };

  // Resource acquisition links
  resources: {
    ethFaucets: string[];
    gTokenFaucet?: string;
    pntFaucet?: string;
    uniswapGToken?: string;
    superPaymasterDex?: string;
  };

  // Stake requirements
  requirements: {
    minEthDeploy: string;
    minEthStandardFlow: string;
    minGTokenStake: string;
    minPntDeposit: string;
  };
}

// Sepolia Testnet Configuration
const sepoliaConfig: NetworkConfig = {
  chainId: 11155111,
  chainName: "Sepolia Testnet",
  rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL || "/api/rpc-proxy",
  explorerUrl: "https://sepolia.etherscan.io",

  contracts: {
    paymasterV4: import.meta.env.VITE_PAYMASTER_V4_ADDRESS || "0xBC56D82374c3CdF1234fa67E28AF9d3E31a9D445",
    registry: import.meta.env.VITE_REGISTRY_ADDRESS || "0x838da93c815a6E45Aa50429529da9106C0621eF0",
    registryV2: import.meta.env.VITE_REGISTRY_V2_ADDRESS || "0x6806e4937038e783cA0D3961B7E258A3549A0043",
    pntToken: import.meta.env.VITE_PNT_TOKEN_ADDRESS || "0xD14E87d8D8B69016Fcc08728c33799bD3F66F180",
    gToken: import.meta.env.VITE_GTOKEN_ADDRESS || "0x868F843723a98c6EECC4BF0aF3352C53d5004147",
    gTokenStaking: import.meta.env.VITE_GTOKEN_STAKING_ADDRESS || "0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2",
    gasTokenFactory: import.meta.env.VITE_GASTOKEN_FACTORY_ADDRESS || "0x6720Dc8ce5021bC6F3F126054556b5d3C125101F",
    sbtContract: import.meta.env.VITE_SBT_CONTRACT_ADDRESS || "0xBfde68c232F2248114429DDD9a7c3Adbff74bD7f",
    usdtContract: import.meta.env.VITE_USDT_CONTRACT_ADDRESS || "0x14EaC6C3D49AEDff3D59773A7d7bfb50182bCfDc",
    entryPointV07: import.meta.env.VITE_ENTRYPOINT_V07_ADDRESS || "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    xPNTsFactory: import.meta.env.VITE_XPNTS_FACTORY_ADDRESS || "0x356CF363E136b0880C8F48c9224A37171f375595",
    mySBT: import.meta.env.VITE_MYSBT_ADDRESS || "0xB330a8A396Da67A1b50903E734750AAC81B0C711",
    superPaymasterV2: import.meta.env.VITE_SUPERPAYMASTER_V2_ADDRESS || "0xb96d8BC6d771AE5913C8656FAFf8721156AC8141",
  },

  resources: {
    ethFaucets: [
      import.meta.env.VITE_SEPOLIA_ETH_FAUCET || "https://sepoliafaucet.com",
      import.meta.env.VITE_SEPOLIA_ETH_FAUCET_2 || "https://www.alchemy.com/faucets/ethereum-sepolia",
    ],
    gTokenFaucet: import.meta.env.VITE_SEPOLIA_GTOKEN_FAUCET || "https://faucet.aastar.io/",
    pntFaucet: import.meta.env.VITE_SEPOLIA_PNT_FAUCET || "https://faucet.aastar.io/",
    uniswapGToken: import.meta.env.VITE_UNISWAP_GTOKEN || "https://app.uniswap.org",
    superPaymasterDex: import.meta.env.VITE_SUPERPAYMASTER_DEX || "https://dex.aastar.io/",
  },

  requirements: {
    minEthDeploy: import.meta.env.VITE_MIN_ETH_DEPLOY || "0.02",
    minEthStandardFlow: import.meta.env.VITE_MIN_ETH_STANDARD_FLOW || "0.1",
    minGTokenStake: import.meta.env.VITE_MIN_GTOKEN_STAKE || "30",
    minPntDeposit: import.meta.env.VITE_MIN_PNT_DEPOSIT || "1000",
  },
};

// Ethereum Mainnet Configuration (placeholder)
const mainnetConfig: NetworkConfig = {
  chainId: 1,
  chainName: "Ethereum Mainnet",
  rpcUrl: import.meta.env.VITE_MAINNET_RPC_URL || "https://eth.llamarpc.com",
  explorerUrl: "https://etherscan.io",

  contracts: {
    paymasterV4: "", // TBD
    registry: "", // TBD
    pntToken: "", // TBD
    gToken: "", // TBD
    gasTokenFactory: "", // TBD
    sbtContract: "", // TBD
    usdtContract: "0xdac17f958d2ee523a2206206994597c13d831ec7", // Real USDT
    entryPointV07: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
  },

  resources: {
    ethFaucets: [], // No faucets on mainnet
    uniswapGToken: "https://app.uniswap.org",
    superPaymasterDex: "https://dex.aastar.io/",
  },

  requirements: {
    minEthDeploy: "0.02",
    minEthStandardFlow: "0.2",
    minGTokenStake: "1000",
    minPntDeposit: "10000",
  },
};

// Network configurations map
const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  sepolia: sepoliaConfig,
  mainnet: mainnetConfig,
};

/**
 * Get current network configuration
 */
export function getCurrentNetworkConfig(): NetworkConfig {
  const network = import.meta.env.VITE_NETWORK || "sepolia";
  return NETWORK_CONFIGS[network] || sepoliaConfig;
}

/**
 * Get configuration for a specific network
 */
export function getNetworkConfig(network: string): NetworkConfig {
  return NETWORK_CONFIGS[network] || sepoliaConfig;
}

/**
 * Check if current network is testnet
 */
export function isTestnet(): boolean {
  const config = getCurrentNetworkConfig();
  return config.chainId !== 1; // Mainnet is chain ID 1
}

/**
 * Format contract address for display (0x1234...5678)
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Get Etherscan link for address/tx
 */
export function getExplorerLink(hash: string, type: "address" | "tx" = "address"): string {
  const config = getCurrentNetworkConfig();
  return `${config.explorerUrl}/${type}/${hash}`;
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Export default configuration
export default getCurrentNetworkConfig();
