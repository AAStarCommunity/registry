/**
 * RPC Configuration - Hybrid Mode
 *
 * Strategy:
 * 1. Always use /api/rpc-proxy endpoint in frontend
 * 2. Backend proxy handles fallback logic:
 *    - If SEPOLIA_RPC_URL (server-side env var) is set → Use private RPC
 *    - If private RPC fails or not configured → Fallback to public RPCs
 *
 * Benefits:
 * - ✅ No API keys exposed to frontend
 * - ✅ Automatic fallback to public RPCs
 * - ✅ Works in both local dev and production
 * - ✅ Easy to switch between private/public by setting server env var
 */

export const RPC_CONFIG = {
  // Both environments use proxy endpoint
  development: "/api/rpc-proxy",
  production: "/api/rpc-proxy",

  // Direct public RPC endpoints (backup only, not recommended for production)
  publicFallbacks: [
    "https://rpc.sepolia.org",
    "https://ethereum-sepolia.publicnode.com",
    "https://sepolia.drpc.org",
    "https://rpc2.sepolia.org",
    "https://eth-sepolia.public.blastapi.io",
  ] as const,
} as const;

/**
 * Get primary RPC URL (always returns proxy endpoint)
 */
export function getRpcUrl(): string {
  const env = import.meta.env.MODE;
  return env === "development" ? RPC_CONFIG.development : RPC_CONFIG.production;
}

/**
 * Get public fallback RPC URLs
 * Note: Only use these if proxy endpoint is completely unavailable
 */
export function getPublicRpcUrls(): readonly string[] {
  return RPC_CONFIG.publicFallbacks;
}
