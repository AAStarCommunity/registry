import * as ethers from "ethers";

/**
 * A custom RPC provider that proxies requests through a backend endpoint
 * and overrides the internal _send method to prevent infinite retries on network failure.
 */
class SafeProxyRpcProvider extends ethers.JsonRpcProvider {
  private _proxyUrl: string;

  constructor(proxyUrl: string) {
    // Initialize with a dummy URL; we override the sending mechanism.
    super("http://localhost");
    this._proxyUrl = proxyUrl;
  }

  /**
   * Overridden _send method to handle network errors gracefully without retrying.
   */
  async _send(payload: any): Promise<any> {
    try {
      const response = await fetch(this._proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Instead of throwing, which triggers a retry, return a JSON-RPC error.
        return {
          jsonrpc: "2.0",
          id: payload.id,
          error: {
            code: -32000,
            message: `RPC Proxy Error: ${response.status} ${response.statusText}`,
          },
        };
      }

      return response.json();
    } catch (error: any) {
      console.error("Fetch error in SafeProxyRpcProvider:", error.message);
      // On a complete network failure, also return a JSON-RPC error.
      return {
        jsonrpc: "2.0",
        id: payload.id,
        error: {
          code: -32000,
          message: error.message || "Network request failed",
        },
      };
    }
  }
}

/**
 * Get the appropriate provider based on environment.
 * This now returns our custom provider that does not retry on failure.
 */
export function getProvider(): ethers.Provider {
  const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL || "/api/rpc-proxy";

  // Always use the proxy in this setup for security and reliability.
  if (rpcUrl.startsWith("/api/")) {
    console.info("✅ Using SafeProxyRpcProvider to prevent retries:", rpcUrl);
    return new SafeProxyRpcProvider(rpcUrl);
  }

  // Fallback for other cases, though proxy is recommended.
  console.warn(
    "⚠️ Using standard JsonRpcProvider. This may not be ideal for production.",
    rpcUrl,
  );
  return new ethers.JsonRpcProvider(rpcUrl);
}
