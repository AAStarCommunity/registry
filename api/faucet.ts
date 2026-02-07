import type { VercelRequest, VercelResponse } from "@vercel/node";
import { 
    createPublicClient, 
    createWalletClient, 
    http, 
    parseEther, 
    type Address 
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { SepoliaFaucetAPI } from '@aastar/sdk';
import { getCoreContracts } from '@aastar/shared-config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { target, ownerKey } = req.body;

  if (!target) {
    return res.status(400).json({ error: "Target address is required" });
  }

  // Admin Private Key must be set in Environment Variables (Vercel/Local)
  // This key must have both MINTER_ROLE on GToken and funds for gas.
  const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.PRIVATE_KEY_SUPPLIER;
  
  if (!PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY is not configured in environment variables");
    return res.status(500).json({ error: "Faucet backend: Admin key not configured" });
  }

  try {
    const network = 'sepolia';
    const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
    const contracts = getCoreContracts(network);

    console.log(`🚰 Initiating SDK Faucet Setup for ${target}...`);
    console.log(`   Network: ${network}, Registry: ${contracts.registry}`);

    const adminAccount = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    const adminWallet = createWalletClient({ 
        account: adminAccount, 
        chain: sepolia, 
        transport: http(rpcUrl) 
    });
    const publicClient = createPublicClient({ 
        chain: sepolia, 
        transport: http(rpcUrl) 
    });

    // Execute full L4 onboarding setup (ETH, Role, GTokens)
    // SepoliaFaucetAPI.prepareTestAccount handles the orchestration logic from SDK
    const results = await SepoliaFaucetAPI.prepareTestAccount(
        adminWallet,
        publicClient as any,
        {
          targetAA: target as Address,
          token: contracts.gToken as Address,
          registry: contracts.registry as Address,
          ethAmount: parseEther('0.05'), // Sufficient for many test operations
          tokenAmount: parseEther('1000') // Standard test allocation
        }
    );

    console.log("✅ SDK Faucet setup complete:", results);
    return res.status(200).json({
        success: true,
        results,
        target,
        registry: contracts.registry
    });

  } catch (error) {
    console.error("❌ SDK Faucet Error:", error);
    return res.status(500).json({ 
      error: "Internal Server Error", 
      message: error instanceof Error ? error.message : String(error) 
    });
  }
}
