/**
 * Network Configuration Module
 *
 * Now uses @aastar/shared-config for contract addresses
 * This file only provides UI-specific configuration
 */

import {
  getContracts,
  getCoreContracts,
  getTokenContracts,
  getPaymasterV4,
  getSuperPaymasterV2,
  getEntryPoint,
  getChainId,
  getRpcUrl as getSharedRpcUrl,
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

  // Contract addresses (from shared-config)
  contracts: {
    paymasterV4: string;
    registry: string; // Legacy v1.2 (ETH staking)
    registryV2: string; // v2.0 (metadata only)
    registryV2_1: string; // v2.1 (from shared-config)
    pntToken: string;
    gToken: string;
    gTokenStaking: string;
    gasTokenFactory: string;
    sbtContract: string;
    usdtContract: string;
    entryPointV07: string;
    xPNTsFactory: string;
    mySBT: string;
    superPaymasterV2: string;
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
  const contracts = getContracts(network);
  const core = getCoreContracts(network);
  const tokens = getTokenContracts(network);

  return {
    chainId: getChainId(network),
    chainName: 'Sepolia Testnet',
    rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL || '/api/rpc-proxy',
    explorerUrl: getBlockExplorer(network),

    contracts: {
      // From shared-config
      paymasterV4: getPaymasterV4(network),
      registryV2_1: core.registry, // v2.1
      gToken: core.gToken,
      gTokenStaking: core.gTokenStaking,
      xPNTsFactory: tokens.xPNTsFactory,
      mySBT: tokens.mySBT,
      superPaymasterV2: getSuperPaymasterV2(network),
      entryPointV07: getEntryPoint(network),

      // Legacy addresses (keep for backward compatibility)
      registry:
        import.meta.env.VITE_REGISTRY_ADDRESS ||
        '0x838da93c815a6E45Aa50429529da9106C0621eF0', // v1.2
      registryV2:
        import.meta.env.VITE_REGISTRY_V2_ADDRESS ||
        '0x6806e4937038e783cA0D3961B7E258A3549A0043', // v2.0
      pntToken:
        import.meta.env.VITE_PNT_TOKEN_ADDRESS ||
        '0xD14E87d8D8B69016Fcc08728c33799bD3F66F180',
      gasTokenFactory:
        import.meta.env.VITE_GASTOKEN_FACTORY_ADDRESS ||
        '0x6720Dc8ce5021bC6F3F126054556b5d3C125101F',
      sbtContract:
        import.meta.env.VITE_SBT_CONTRACT_ADDRESS ||
        '0xBfde68c232F2248114429DDD9a7c3Adbff74bD7f',
      usdtContract:
        import.meta.env.VITE_USDT_CONTRACT_ADDRESS ||
        '0x14EaC6C3D49AEDff3D59773A7d7bfb50182bCfDc',
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
    registry: '', // TBD
    registryV2: '', // TBD
    registryV2_1: '', // TBD
    pntToken: '', // TBD
    gToken: '', // TBD
    gTokenStaking: '', // TBD
    gasTokenFactory: '', // TBD
    sbtContract: '', // TBD
    usdtContract: '0xdac17f958d2ee523a2206206994597c13d831ec7', // Real USDT
    entryPointV07: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    xPNTsFactory: '', // TBD
    mySBT: '', // TBD
    superPaymasterV2: '', // TBD
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
