/**
 * RPC Provider Utility
 * 
 * Provides read-only JsonRpcProvider instances for querying blockchain data.
 * For V3 Admin pages, prefer using the SDK clients which handle network switching automatically.
 * This utility is for explorer/analytics pages that need direct contract queries.
 */

import { JsonRpcProvider } from 'ethers';

// Public RPC endpoints - 免费公共节点
const RPC_URLS: Record<number, string> = {
  // Sepolia Testnet
  11155111: 'https://rpc.sepolia.org',
  
  // OP Sepolia (when SDK supports)
  // 11155420: 'https://sepolia.optimism.io',
  
  // 可以添加 Alchemy/Infura keys 提升性能
  // 11155111: import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
};

// Provider cache to avoid creating multiple instances
const providerCache: Map<number, JsonRpcProvider> = new Map();

/**
 * Get a read-only provider for the specified chain ID
 * 
 * @param chainId - Chain ID (e.g., 11155111 for Sepolia). Defaults to Sepolia.
 * @returns JsonRpcProvider instance
 * 
 * @example
 * ```ts
 * const provider = getProvider(11155111); // Sepolia
 * const blockNumber = await provider.getBlockNumber();
 * ```
 */
export function getProvider(chainId?: number): JsonRpcProvider {
  // Default to Sepolia if no chainId provided
  const targetChainId = chainId || 11155111;
  
  // Return cached provider if exists
  if (providerCache.has(targetChainId)) {
    return providerCache.get(targetChainId)!;
  }
  
  // Get RPC URL
  const rpcUrl = RPC_URLS[targetChainId];
  
  if (!rpcUrl) {
    throw new Error(
      `Unsupported chain ID: ${targetChainId}. ` +
      `Supported chains: ${Object.keys(RPC_URLS).join(', ')}`
    );
  }
  
  // Create new provider
  const provider = new JsonRpcProvider(rpcUrl, targetChainId);
  
  // Cache it
  providerCache.set(targetChainId, provider);
  
  console.info(`✅ Created RPC provider for chain ${targetChainId}: ${rpcUrl}`);
  
  return provider;
}

/**
 * Get provider for Sepolia testnet
 */
export function getSepoliaProvider(): JsonRpcProvider {
  return getProvider(11155111);
}

/**
 * Clear provider cache (useful for testing or network switching)
 */
export function clearProviderCache(): void {
  providerCache.clear();
}

/**
 * Add or update RPC URL for a specific chain
 * Useful for adding custom RPC endpoints at runtime
 * 
 * @param chainId - Chain ID
 * @param rpcUrl - RPC endpoint URL
 */
export function setRpcUrl(chainId: number, rpcUrl: string): void {
  RPC_URLS[chainId] = rpcUrl;
  // Clear cache for this chain to force new provider creation
  providerCache.delete(chainId);
}
