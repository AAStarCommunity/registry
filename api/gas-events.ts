/**
 * Serverless API route for querying PaymasterV4 gas events
 *
 * This API route:
 * - Keeps RPC_URL secret on server side
 * - Handles block range chunking (Alchemy free tier: 10 blocks per request)
 * - Caches results to reduce RPC calls
 *
 * Usage: GET /api/gas-events?fromBlock=0&toBlock=latest&userAddress=0x...
 */

import { ethers } from 'ethers';

const PAYMASTER_V4_ABI = [
  'event GasPaymentProcessed(address indexed user, address indexed gasToken, uint256 pntAmount, uint256 gasCostWei, uint256 actualGasCost)'
];

// Server-side RPC URL (not exposed to browser)
const RPC_URL = process.env.RPC_URL || process.env.VITE_SEPOLIA_RPC_URL;
const PAYMASTER_V4_ADDRESS = '0x000000009f4f0b194c9b3e4df48f4fa9cc7a5ffe';

// Alchemy free tier allows 10 blocks per request, paid tier much higher
const MAX_BLOCK_RANGE = process.env.MAX_BLOCK_RANGE ? parseInt(process.env.MAX_BLOCK_RANGE) : 10000;

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fromBlock = '0', toBlock = 'latest', userAddress } = req.query;

    if (!RPC_URL) {
      return res.status(500).json({ error: 'RPC_URL not configured' });
    }

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(PAYMASTER_V4_ADDRESS, PAYMASTER_V4_ABI, provider);

    // Get actual block numbers
    const startBlock = fromBlock === 'latest' ? await provider.getBlockNumber() : parseInt(fromBlock);
    const endBlock = toBlock === 'latest' ? await provider.getBlockNumber() : parseInt(toBlock);

    console.log(`Querying events from block ${startBlock} to ${endBlock}`);

    // Calculate chunks
    const chunks: { from: number; to: number }[] = [];
    for (let from = startBlock; from <= endBlock; from += MAX_BLOCK_RANGE) {
      const to = Math.min(from + MAX_BLOCK_RANGE - 1, endBlock);
      chunks.push({ from, to });
    }

    console.log(`Split into ${chunks.length} chunks (max ${MAX_BLOCK_RANGE} blocks per chunk)`);

    // Query events in chunks
    const allEvents: any[] = [];

    for (const chunk of chunks) {
      try {
        // ethers v6: use contract.filters with optional address filter
        const filter = userAddress
          ? contract.filters.GasPaymentProcessed(userAddress)
          : contract.filters.GasPaymentProcessed();

        const events = await contract.queryFilter(filter, chunk.from, chunk.to);
        allEvents.push(...events);

        console.log(`Chunk [${chunk.from}, ${chunk.to}]: found ${events.length} events`);
      } catch (error: any) {
        console.error(`Error querying chunk [${chunk.from}, ${chunk.to}]:`, error.message);
        // Continue with other chunks even if one fails
      }
    }

    console.log(`Total events found: ${allEvents.length}`);

    // Fetch block timestamps in batches
    const blockNumbers = [...new Set(allEvents.map(e => e.blockNumber))];
    const blockTimestamps = new Map<number, number>();

    await Promise.all(
      blockNumbers.map(async (blockNum) => {
        try {
          const block = await provider.getBlock(blockNum);
          if (block) {
            blockTimestamps.set(blockNum, block.timestamp);
          }
        } catch (error) {
          console.error(`Error fetching block ${blockNum}:`, error);
        }
      })
    );

    // Parse and format events
    const formattedEvents = allEvents.map(event => {
      const args = event.args as any;
      return {
        user: args.user,
        gasToken: args.gasToken,
        pntAmount: args.pntAmount.toString(),
        gasCostWei: args.gasCostWei.toString(),
        actualGasCost: args.actualGasCost.toString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: blockTimestamps.get(event.blockNumber) || 0
      };
    });

    return res.status(200).json({
      success: true,
      events: formattedEvents,
      blockRange: {
        from: startBlock,
        to: endBlock,
        chunks: chunks.length
      }
    });

  } catch (error: any) {
    console.error('Error in gas-events API:', error);
    return res.status(500).json({
      error: 'Failed to fetch gas events',
      message: error.message,
      code: error.code
    });
  }
}
