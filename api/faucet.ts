import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Faucet API Proxy
 * 
 * Proxies requests to the remote AAStar Faucet Service (https://faucet-aastar.vercel.app).
 * This avoids requiring a local PRIVATE_KEY and ensures the latest contract logic is used.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { target, ownerKey } = req.body;

  if (!target) {
    return res.status(400).json({ error: "Target address is required" });
  }

  const FAUCET_SECRET = process.env.FAUCET_SECRET;
  const FAUCET_API_URL = "https://faucet.aastar.io/faucet";
  
  if (!FAUCET_SECRET) {
    console.error("❌ FAUCET_SECRET is not configured in environment variables");
    return res.status(500).json({ error: "Faucet service not configured (Missing Secret)" });
  }

  try {
    console.log(`🚰 Proxying faucet request for ${target} to remote service...`);
    
    const response = await fetch(FAUCET_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FAUCET_SECRET}`,
      },
      body: JSON.stringify({
        target,
        ownerKey, // Optional: for full L4 registration/staking
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Remote Faucet Error:", data);
      return res.status(response.status).json(data);
    }

    console.log("✅ Remote Faucet request successful:", data);
    return res.status(200).json(data);
  } catch (error) {
    console.error("❌ Faucet Proxy Error:", error);
    return res.status(500).json({ 
      error: "Internal Server Error", 
      message: error instanceof Error ? error.message : String(error) 
    });
  }
}
