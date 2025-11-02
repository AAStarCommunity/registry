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
    // Legacy Contracts (for backward compatibility)
    // ========================================
    /** @deprecated Use registryV2_1 instead. Registry v1.2 (ETH staking) */
    registry: string;
    /** @deprecated Use registryV2_1 instead. Registry v2.0 (metadata only) */
    registryV2: string;
    /** @deprecated Use xPNTsFactory to deploy new tokens. Old PNT token */
    pntToken: string;
    /** @deprecated Use xPNTsFactory instead. Old gas token factory */
    gasTokenFactory: string;
    /** @deprecated Use mySBT instead. Old SBT contract */
    sbtContract: string;

    // ========================================
    // Other Contracts
    // ========================================
    /** Mock USDT for testing */
    usdtContract: string;
    /** aPNTs - AAStar community gas token for testing */
    aPNTs: string;
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
      // Legacy Contracts (for backward compatibility)
      // Only kept for RegistryExplorer version switching
      // ========================================
      registry:
        import.meta.env.VITE_REGISTRY_ADDRESS ||
        '0x838da93c815a6E45Aa50429529da9106C0621eF0', // v1.2 (ETH staking)
      registryV2:
        import.meta.env.VITE_REGISTRY_V2_ADDRESS ||
        '0x6806e4937038e783cA0D3961B7E258A3549A0043', // v2.0 (metadata only)

      // ========================================
      // Deprecated Contracts (should migrate)
      // ========================================
      pntToken:
        import.meta.env.VITE_PNT_TOKEN_ADDRESS ||
        '0xD14E87d8D8B69016Fcc08728c33799bD3F66F180', // Old PNT
      gasTokenFactory:
        import.meta.env.VITE_GASTOKEN_FACTORY_ADDRESS ||
        '0x6720Dc8ce5021bC6F3F126054556b5d3C125101F', // Old factory
      sbtContract:
        import.meta.env.VITE_SBT_CONTRACT_ADDRESS ||
        '0xBfde68c232F2248114429DDD9a7c3Adbff74bD7f', // Old SBT

      // ========================================
      // Other Contracts
      // ========================================
      usdtContract:
        import.meta.env.VITE_USDT_CONTRACT_ADDRESS ||
        testTokens.mockUSDT,
      aPNTs:
        import.meta.env.VITE_APNTS_ADDRESS ||
        testTokens.aPNTs,
    },

    resources: {
      ethFaucets: [
        import.meta.env.VITE_SEPOLIA_ETH_FAUCET ||
          'https://sepoliafaucet.com',
        import.meta.env.VITE_SEPOLIA_ETH_FAUCET_2 ||
          'https://www.alchemy.com/faucets/ethereum-sepolia',
      ],
      gTokenFaucet:
        import.meta.env.VITE_SEPOLIA_GTOKEN_FAUCET ||
        'https://faucet.aastar.io/',
      pntFaucet:
        import.meta.env.VITE_SEPOLIA_PNT_FAUCET ||
        'https://faucet.aastar.io/',
      uniswapGToken:
        import.meta.env.VITE_UNISWAP_GTOKEN || 'https://app.uniswap.org',
      superPaymasterDex:
        import.meta.env.VITE_SUPERPAYMASTER_DEX || 'https://dex.aastar.io/',
    },

    requirements: {
      minEthDeploy: import.meta.env.VITE_MIN_ETH_DEPLOY || '0.02',
      minEthStandardFlow: import.meta.env.VITE_MIN_ETH_STANDARD_FLOW || '0.1',
      minGTokenStake: import.meta.env.VITE_MIN_GTOKEN_STAKE || '30',
      minPntDeposit: import.meta.env.VITE_MIN_PNT_DEPOSIT || '1000',
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

    // Legacy
    registry: '', // TBD
    registryV2: '', // TBD
    pntToken: '', // TBD
    gasTokenFactory: '', // TBD
    sbtContract: '', // TBD

    // Other
    usdtContract: '0xdac17f958d2ee523a2206206994597c13d831ec7', // Real USDT
    aPNTs: '', // TBD
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
// Migration Helper Functions
// ========================================

/**
 * Get latest registry address (always returns v2.1)
 * Use this instead of accessing config.contracts.registry directly
 */
export function getLatestRegistry(): string {
  return getCurrentNetworkConfig().contracts.registryV2_1;
}

/**
 * Get latest SBT contract (MySBT v2.3)
 * Use this instead of accessing config.contracts.sbtContract directly
 */
export function getLatestSBT(): string {
  return getCurrentNetworkConfig().contracts.mySBT;
}

/**
 * Get latest gas token factory (xPNTsFactory)
 * Use this instead of accessing config.contracts.gasTokenFactory directly
 */
export function getLatestGasTokenFactory(): string {
  return getCurrentNetworkConfig().contracts.xPNTsFactory;
}
