/**
 * Etherscan URL utilities
 * Supports multiple networks: sepolia, op-sepolia, op-mainnet, mainnet
 */

export type Network = "sepolia" | "op-sepolia" | "op-mainnet" | "mainnet";

/**
 * Get Etherscan base URL for the given network
 */
export function getEtherscanBaseUrl(network: Network = "sepolia"): string {
  const urls: Record<Network, string> = {
    sepolia: "https://sepolia.etherscan.io",
    "op-sepolia": "https://sepolia-optimism.etherscan.io",
    "op-mainnet": "https://optimistic.etherscan.io",
    mainnet: "https://etherscan.io",
  };

  return urls[network] || urls.sepolia;
}

/**
 * Get current network from environment variable
 */
export function getCurrentNetwork(): Network {
  const network = import.meta.env.VITE_NETWORK || "sepolia";
  return network as Network;
}

/**
 * Generate Etherscan address URL
 */
export function getEtherscanAddressUrl(
  address: string,
  network?: Network,
): string {
  const baseUrl = getEtherscanBaseUrl(network || getCurrentNetwork());
  return `${baseUrl}/address/${address}`;
}

/**
 * Generate Etherscan transaction URL
 */
export function getEtherscanTxUrl(txHash: string, network?: Network): string {
  const baseUrl = getEtherscanBaseUrl(network || getCurrentNetwork());
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Generate Etherscan block URL
 */
export function getEtherscanBlockUrl(
  blockNumber: number,
  network?: Network,
): string {
  const baseUrl = getEtherscanBaseUrl(network || getCurrentNetwork());
  return `${baseUrl}/block/${blockNumber}`;
}

/**
 * Generate Etherscan token URL
 */
export function getEtherscanTokenUrl(
  tokenAddress: string,
  network?: Network,
): string {
  const baseUrl = getEtherscanBaseUrl(network || getCurrentNetwork());
  return `${baseUrl}/token/${tokenAddress}`;
}

/**
 * Get network display name
 */
export function getNetworkDisplayName(network?: Network): string {
  const names: Record<Network, string> = {
    sepolia: "Sepolia Testnet",
    "op-sepolia": "OP Sepolia Testnet",
    "op-mainnet": "OP Mainnet",
    mainnet: "Ethereum Mainnet",
  };

  return names[network || getCurrentNetwork()] || "Unknown Network";
}
