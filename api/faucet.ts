import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { target, ownerKey } = req.body;

  if (!target) {
    return res.status(400).json({ error: "Target address is required" });
  }

  const FAUCET_SECRET = process.env.FAUCET_SECRET;
  
  if (!FAUCET_SECRET) {
    console.error("❌ FAUCET_SECRET is not configured in environment variables");
    return res.status(500).json({ error: "Faucet service not configured" });
  }

  try {
    console.log(`🚰 Proxying faucet request for ${target}...`);
    
    // We call the external AAStar Faucet Service directly
    const response = await fetch("https://faucet.aastar.io/faucet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FAUCET_SECRET}`,
      },
      body: JSON.stringify({
        target,
        ownerKey, // Optional or required depending on the specific onboarding flow
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ External Faucet Error:", data);
      return res.status(response.status).json(data);
    }

    console.log("✅ Faucet request successful:", data);
    return res.status(200).json(data);
  } catch (error) {
    console.error("❌ Faucet Proxy Error:", error);
    return res.status(500).json({ 
      error: "Internal Server Error", 
      message: error instanceof Error ? error.message : String(error) 
    });
  }
}
