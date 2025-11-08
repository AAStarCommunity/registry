/**
 * Network Configuration Module
 *
 * Now uses @aastar/shared-config for contract addresses
 * This file only provides UI-specific configuration and backward compatibility
 */

import {
  getCoreContracts,
  getTokenContracts,
  getTestTokenContracts,
  getPaymasterV4_1,
  getSuperPaymasterV2,
  getEntryPoint,
  getChainId,
  getBlockExplorer,
  getTxUrl,
  getAddressUrl,
  type ContractNetwork,
} from '@aastar/shared-config';

export interface NetworkConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  explorerUrl: string;

  // Contract addresses
  contracts: {
    // ========================================
    // Current Contracts (from shared-config)
    // ========================================
    /** PaymasterV4 - AOA mode independent paymaster */
    paymasterV4: string;
    /** Registry v2.1 - Latest with node types + progressive slash */
    registryV2_1: string;
    /** GToken - Governance token (sGT) */
    gToken: string;
    /** GTokenStaking - Stake management */
    gTokenStaking: string;
    /** xPNTsFactory - Unified architecture gas token factory */
    xPNTsFactory: string;
    /** MySBT v2.3 - White-label SBT for community identity */
    mySBT: string;
    /** SuperPaymaster V2 - AOA+ mode shared paymaster */
    superPaymasterV2: string;
    /** EntryPoint v0.7 - ERC-4337 official EntryPoint */
    entryPointV07: string;
    /** PaymasterFactory v1.0 - Permissionless Paymaster deployment using EIP-1167 */
    paymasterFactory: string;


    // ========================================
    // Other Contracts
    // ========================================
    /** Mock USDT for testing */
    usdtContract: string;
    /** aPNTs - AAStar community gas token for testing */
    aPNTs: string;
    /** bPNTs - BuilderDAO community gas token for testing */
    bPNTs: string;
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

/**
 * Get network name for shared-config
 */
function getNetworkName(): ContractNetwork {
  const network = import.meta.env.VITE_NETWORK || 'sepolia';
  return network as ContractNetwork;
}

// Sepolia Testnet Configuration
const sepoliaConfig: NetworkConfig = (() => {
  const network = 'sepolia';
  const core = getCoreContracts(network);
  const tokens = getTokenContracts(network);
  const testTokens = getTestTokenContracts(network);

  return {
    chainId: getChainId(network),
    chainName: 'Sepolia Testnet',
    rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL || '/api/rpc-proxy',
    explorerUrl: getBlockExplorer(network),

    contracts: {
      // ========================================
      // Current Contracts (from shared-config)
      // ========================================
      paymasterV4: getPaymasterV4_1(network),
      registryV2_1: core.registry,
      gToken: core.gToken,
      gTokenStaking: core.gTokenStaking,
      xPNTsFactory: tokens.xPNTsFactory,
      mySBT: tokens.mySBT,
      superPaymasterV2: getSuperPaymasterV2(network),
      entryPointV07: getEntryPoint(network),
      paymasterFactory: core.paymasterFactory,

      // ========================================
      // Other Contracts (from shared-config)
      // ========================================
      usdtContract: testTokens.mockUSDT,
      aPNTs: testTokens.aPNTs,
      bPNTs: testTokens.bPNTs,
    },

    resources: {
      ethFaucets: [
        'https://cloud.google.com/application/web3/faucet/ethereum/sepolia',
        'https://www.alchemy.com/faucets/ethereum-sepolia',
      ],
      gTokenFaucet: 'https://faucet.aastar.io/',
      pntFaucet: 'https://faucet.aastar.io/',
      uniswapGToken: 'https://app.uniswap.org',
      superPaymasterDex: 'https://dex.aastar.io/',
    },

    requirements: {
      minEthDeploy: '0.02',
      minEthStandardFlow: '0.1',
      minGTokenStake: '30',
      minPntDeposit: '1000',
    },
  };
})();

// Ethereum Mainnet Configuration (placeholder)
const mainnetConfig: NetworkConfig = {
  chainId: 1,
  chainName: 'Ethereum Mainnet',
  rpcUrl:
    import.meta.env.VITE_MAINNET_RPC_URL || 'https://eth.llamarpc.com',
  explorerUrl: 'https://etherscan.io',

  contracts: {
    paymasterV4: '', // TBD
    registryV2_1: '', // TBD
    gToken: '', // TBD
    gTokenStaking: '', // TBD
    xPNTsFactory: '', // TBD
    mySBT: '', // TBD
    superPaymasterV2: '', // TBD
    entryPointV07: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    paymasterFactory: '', // TBD

    // Other
    usdtContract: '0xdac17f958d2ee523a2206206994597c13d831ec7', // Real USDT
    aPNTs: '', // TBD
    bPNTs: '', // TBD
  },

  resources: {
    ethFaucets: [], // No faucets on mainnet
    uniswapGToken: 'https://app.uniswap.org',
    superPaymasterDex: 'https://dex.aastar.io/',
  },

  requirements: {
    minEthDeploy: '0.02',
    minEthStandardFlow: '0.2',
    minGTokenStake: '1000',
    minPntDeposit: '10000',
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
  const network = import.meta.env.VITE_NETWORK || 'sepolia';
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
 * Uses shared-config getTxUrl and getAddressUrl functions
 */
export function getExplorerLink(
  hash: string,
  type: 'address' | 'tx' = 'address'
): string {
  const network = getNetworkName();

  if (type === 'tx') {
    return getTxUrl(network, hash);
  } else {
    return getAddressUrl(network, hash);
  }
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Export default configuration
export default getCurrentNetworkConfig();

// Re-export shared-config utilities for convenience
export { getTxUrl, getAddressUrl, getChainId };

// ========================================
// Helper Functions
// ========================================

/**
 * Get Registry v2.2.0 address
 */
export function getLatestRegistry(): string {
  return getCurrentNetworkConfig().contracts.registryV2_1;
}

/**
 * Get MySBT contract address
 */
export function getLatestSBT(): string {
  return getCurrentNetworkConfig().contracts.mySBT;
}

/**
 * Get xPNTsFactory contract address
 */
export function getLatestGasTokenFactory(): string {
  return getCurrentNetworkConfig().contracts.xPNTsFactory;
}
