import { ethers } from "ethers";

/**
 * Public RPC endpoints for Sepolia (no API key required)
 * These are free but have rate limits
 */
const SEPOLIA_PUBLIC_RPCS = [
  "https://rpc.sepolia.org",
  "https://ethereum-sepolia.publicnode.com",
  "https://sepolia.drpc.org",
  "https://rpc2.sepolia.org",
  "https://eth-sepolia.public.blastapi.io",
] as const;

/**
 * Backend Proxy RPC Provider
 * Uses fetch to call backend /api/rpc-proxy which handles private RPC + fallback
 */
class ProxyRpcProvider extends ethers.JsonRpcProvider {
  constructor(proxyUrl: string) {
    // Use a dummy URL for ethers, we'll override _send
    super("http://localhost");
    this._proxyUrl = proxyUrl;
  }

  private _proxyUrl: string;

  async _send(payload: any): Promise<any> {
    const response = await fetch(this._proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }
}

/**
 * Create a fallback provider with multiple public RPC endpoints
 * This provides better reliability and helps avoid rate limits
 */
export function createSepoliaProvider(): ethers.FallbackProvider {
  const providers = SEPOLIA_PUBLIC_RPCS.map((rpc, index) => ({
    provider: new ethers.JsonRpcProvider(rpc),
    priority: index, // Lower priority = tried first
    weight: 1,
    stallTimeout: 2000, // 2 seconds
  }));

  return new ethers.FallbackProvider(providers);
}

/**
 * Create a basic provider (for development with API key)
 */
export function createBasicProvider(rpcUrl: string): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Get the appropriate provider based on environment
 */
export function getProvider(): ethers.Provider {
  const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;

  // If using backend proxy (starts with /api/)
  if (rpcUrl?.startsWith("/api/")) {
    console.info("🔒 Using backend proxy RPC provider:", rpcUrl);
    return new ProxyRpcProvider(rpcUrl);
  }

  // If RPC URL contains an API key (has /v2/ pattern), warn in development
  if (import.meta.env.DEV && rpcUrl?.includes("/v2/")) {
    console.warn(
      "⚠️ WARNING: Using RPC URL with API key in frontend! " +
        "This exposes your API key to all users. " +
        "Consider using a backend proxy or public RPC endpoints.",
    );
  }

  // If no RPC URL configured, use fallback provider
  if (!rpcUrl || rpcUrl.includes("/v2/")) {
    console.info(
      "🌐 Using fallback provider with multiple public RPC endpoints",
    );
    return createSepoliaProvider();
  }

  return createBasicProvider(rpcUrl);
}
