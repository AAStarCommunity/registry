import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * RPC Proxy - Hybrid mode RPC endpoint with fallback support
 *
 * Modes:
 * 1. Private RPC (if SEPOLIA_RPC_URL is set) - Uses your personal Alchemy/Infura endpoint
 * 2. Public RPC Fallback - Falls back to public endpoints if private RPC fails or not configured
 *
 * Usage in frontend:
 * const provider = new ethers.JsonRpcProvider('/api/rpc-proxy');
 */

// Public RPC endpoints for fallback
const PUBLIC_SEPOLIA_RPCS = [
  "https://rpc.sepolia.org",
  "https://ethereum-sepolia.publicnode.com",
  "https://sepolia.drpc.org",
  "https://rpc2.sepolia.org",
  "https://eth-sepolia.public.blastapi.io",
] as const;

async function tryRpcRequest(rpcUrl: string, body: any): Promise<Response> {
  return fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get chainId from query parameters (default to Sepolia)
  const chainId = req.query.chainId ? String(req.query.chainId) : "11155111";

  // Get private RPC URL based on chainId (NOT exposed to frontend)
  let privateRpcUrl: string | undefined;
  if (chainId === "11155420") {
    privateRpcUrl = process.env.OP_SEPOLIA_RPC_URL;
  } else {
    // Default to Sepolia (11155111)
    privateRpcUrl = process.env.SEPOLIA_RPC_URL;
  }

  // Debug: Log environment variable status (without revealing the full URL)
  if (privateRpcUrl) {
    const maskedUrl = privateRpcUrl.replace(/\/v2\/.*$/, "/v2/***");
    console.log(`🔐 Private RPC configured: ${maskedUrl}`);
  } else {
    console.log(`⚠️ SEPOLIA_RPC_URL environment variable not found`);
    console.log(
      `   Available env vars: ${Object.keys(process.env)
        .filter((k) => k.includes("RPC"))
        .join(", ")}`,
    );
  }

  let lastError: Error | null = null;

  // Try private RPC first if configured
  if (privateRpcUrl) {
    try {
      console.log("🔐 Trying private RPC endpoint...");
      const response = await tryRpcRequest(privateRpcUrl, req.body);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Private RPC request successful");
        return res.status(response.status).json(data);
      }

      lastError = new Error(`Private RPC returned status ${response.status}`);
      console.warn(
        "⚠️ Private RPC failed, falling back to public RPCs:",
        lastError.message,
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      console.warn(
        "⚠️ Private RPC error, falling back to public RPCs:",
        lastError.message,
      );
    }
  } else {
    console.log("🌐 No private RPC configured, using public RPCs");
  }

  // Fallback to public RPCs
  for (const publicRpc of PUBLIC_SEPOLIA_RPCS) {
    try {
      console.log(`🌐 Trying public RPC: ${publicRpc}`);
      const response = await tryRpcRequest(publicRpc, req.body);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Public RPC request successful: ${publicRpc}`);
        return res.status(response.status).json(data);
      }

      lastError = new Error(
        `Public RPC ${publicRpc} returned status ${response.status}`,
      );
      console.warn(`⚠️ Public RPC failed: ${publicRpc}`, lastError.message);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      console.warn(`⚠️ Public RPC error: ${publicRpc}`, lastError.message);
      // Continue to next public RPC
    }
  }

  // All RPCs failed
  console.error("❌ All RPC endpoints failed");
  return res.status(500).json({
    error: "All RPC endpoints failed",
    message: lastError?.message || "Unknown error",
    details: "Both private and public RPC endpoints are unavailable",
  });
}
