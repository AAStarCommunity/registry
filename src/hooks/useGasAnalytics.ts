import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { loadFromCache, saveToCache } from "../utils/cache";

// Contract configuration
// Use getAddress() to ensure proper checksum (ethers v6 requirement)
const PAYMASTER_V4_ADDRESS = ethers.getAddress(
  import.meta.env.VITE_PAYMASTER_V4_ADDRESS ||
    "0x000000009f4f0b194c9b3e4df48f4fa9cc7a5ffe",
);
const PAYMASTER_V4_ABI = [
  "event GasPaymentProcessed(address indexed user, address indexed gasToken, uint256 pntAmount, uint256 gasCostWei, uint256 actualGasCost)",
];

// RPC endpoint (Sepolia testnet)
// Note: VITE_ prefix exposes to browser - acceptable for RPC endpoints
// Chunks queries to handle Alchemy rate limits (10k blocks per request on paid tier)
const RPC_URL =
  import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org"; // Fallback (may have CORS issues)

// Cache configuration
const CACHE_KEY_PREFIX = "gas-analytics";
const CACHE_TTL = 3600; // 1 hour

export interface GasPaymentEvent {
  user: string;
  gasToken: string;
  pntAmount: string;
  gasCostWei: string;
  actualGasCost: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface UserStats {
  totalOperations: number;
  totalGasSponsored: string;
  totalPntPaid: string;
  averageGasPerOperation: string;
  firstTransaction: number;
  lastTransaction: number;
}

export interface DailyTrend {
  date: string;
  operations: number;
  gasSponsored: string;
  pntPaid: string;
}

export interface GasAnalytics {
  totalOperations: number;
  totalGasSponsored: string;
  totalPntPaid: string;
  uniqueUsers: number;
  topUsers: Array<{ address: string; stats: UserStats }>;
  dailyTrends: DailyTrend[];
  recentTransactions: GasPaymentEvent[];
  lastUpdated: number;
}

interface UseGasAnalyticsOptions {
  userAddress?: string;
  fromBlock?: number;
  toBlock?: number;
  enableBackgroundRefresh?: boolean;
}

interface UseGasAnalyticsReturn {
  analytics: GasAnalytics | null;
  userStats: UserStats | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and analyze gas payment events from PaymasterV4 contract
 *
 * Features:
 * - Queries GasPaymentProcessed events from blockchain
 * - Aggregates statistics (total ops, gas sponsored, PNT paid, top users, daily trends)
 * - Uses localStorage caching (1-hour TTL)
 * - Supports background refresh
 * - Can filter by specific user address
 *
 * @param options Configuration options
 * @returns Gas analytics data and control functions
 */
export function useGasAnalytics(
  options: UseGasAnalyticsOptions = {},
): UseGasAnalyticsReturn {
  const {
    userAddress,
    fromBlock = 0,
    toBlock,
    enableBackgroundRefresh = true,
  } = options;

  const [analytics, setAnalytics] = useState<GasAnalytics | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch events from blockchain and aggregate statistics
   *
   * Strategy: Query recent blocks only (last ~100,000 blocks = ~2 weeks on Sepolia)
   * to avoid Alchemy free tier block range limitation (10 blocks per request)
   */
  const fetchAnalytics = useCallback(async (): Promise<GasAnalytics> => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(
      PAYMASTER_V4_ADDRESS,
      PAYMASTER_V4_ABI,
      provider,
    );

    // Determine block range - query recent blocks only (configurable)
    const currentBlock = await provider.getBlockNumber();
    // Default: 7200 blocks = ~1 day on Sepolia (~12s per block)
    const BLOCKS_TO_QUERY = import.meta.env.VITE_BLOCKS_TO_QUERY
      ? parseInt(import.meta.env.VITE_BLOCKS_TO_QUERY)
      : 7200;

    const endBlock = toBlock ?? currentBlock;
    const startBlock =
      fromBlock > 0 ? fromBlock : Math.max(0, endBlock - BLOCKS_TO_QUERY);

    console.log(`Querying gas events from block ${startBlock} to ${endBlock}`);

    // Split into chunks to handle Alchemy limits (10k blocks per chunk for paid tier)
    const CHUNK_SIZE = 10000;
    const allEvents: any[] = [];

    for (
      let chunkStart = startBlock;
      chunkStart <= endBlock;
      chunkStart += CHUNK_SIZE
    ) {
      const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, endBlock);

      try {
        const filter = contract.filters.GasPaymentProcessed();
        const chunkEvents = await contract.queryFilter(
          filter,
          chunkStart,
          chunkEnd,
        );
        allEvents.push(...chunkEvents);
        console.log(
          `Chunk [${chunkStart}, ${chunkEnd}]: found ${chunkEvents.length} events`,
        );
      } catch (error: any) {
        console.error(
          `Error querying chunk [${chunkStart}, ${chunkEnd}]:`,
          error.message,
        );
        // Continue with other chunks
      }
    }

    const events = allEvents;

    // Fetch block timestamps in batches
    const blockNumbers = [...new Set(events.map((e) => e.blockNumber))];
    const blockTimestamps = new Map<number, number>();

    await Promise.all(
      blockNumbers.map(async (blockNum) => {
        const block = await provider.getBlock(blockNum);
        if (block) {
          blockTimestamps.set(blockNum, block.timestamp);
        }
      }),
    );

    // Parse events
    const parsedEvents: GasPaymentEvent[] = events.map((event) => {
      const args = event.args as any;
      return {
        user: args.user,
        gasToken: args.gasToken,
        pntAmount: args.pntAmount.toString(),
        gasCostWei: args.gasCostWei.toString(),
        actualGasCost: args.actualGasCost.toString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: blockTimestamps.get(event.blockNumber) ?? 0,
      };
    });

    // Aggregate statistics
    const userStatsMap = new Map<string, UserStats>();
    let totalGasSponsored = BigInt(0);
    let totalPntPaid = BigInt(0);

    parsedEvents.forEach((event) => {
      const user = event.user.toLowerCase();

      // Update global totals
      totalGasSponsored += BigInt(event.actualGasCost);
      totalPntPaid += BigInt(event.pntAmount);

      // Update user stats
      if (!userStatsMap.has(user)) {
        userStatsMap.set(user, {
          totalOperations: 0,
          totalGasSponsored: "0",
          totalPntPaid: "0",
          averageGasPerOperation: "0",
          firstTransaction: event.timestamp,
          lastTransaction: event.timestamp,
        });
      }

      const stats = userStatsMap.get(user)!;
      stats.totalOperations += 1;
      stats.totalGasSponsored = (
        BigInt(stats.totalGasSponsored) + BigInt(event.actualGasCost)
      ).toString();
      stats.totalPntPaid = (
        BigInt(stats.totalPntPaid) + BigInt(event.pntAmount)
      ).toString();
      stats.averageGasPerOperation = (
        BigInt(stats.totalGasSponsored) / BigInt(stats.totalOperations)
      ).toString();
      stats.firstTransaction = Math.min(
        stats.firstTransaction,
        event.timestamp,
      );
      stats.lastTransaction = Math.max(stats.lastTransaction, event.timestamp);
    });

    // Calculate top users (top 10 by total operations)
    const topUsers = Array.from(userStatsMap.entries())
      .sort((a, b) => b[1].totalOperations - a[1].totalOperations)
      .slice(0, 10)
      .map(([address, stats]) => ({ address, stats }));

    // Calculate daily trends (last 30 days)
    const dailyStatsMap = new Map<
      string,
      { operations: number; gasSponsored: bigint; pntPaid: bigint }
    >();

    parsedEvents.forEach((event) => {
      const date = new Date(event.timestamp * 1000).toISOString().split("T")[0];

      if (!dailyStatsMap.has(date)) {
        dailyStatsMap.set(date, {
          operations: 0,
          gasSponsored: BigInt(0),
          pntPaid: BigInt(0),
        });
      }

      const dayStats = dailyStatsMap.get(date)!;
      dayStats.operations += 1;
      dayStats.gasSponsored += BigInt(event.actualGasCost);
      dayStats.pntPaid += BigInt(event.pntAmount);
    });

    const dailyTrends: DailyTrend[] = Array.from(dailyStatsMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0])) // Sort by date descending
      .slice(0, 30) // Last 30 days
      .reverse() // Oldest to newest for chart display
      .map(([date, stats]) => ({
        date,
        operations: stats.operations,
        gasSponsored: stats.gasSponsored.toString(),
        pntPaid: stats.pntPaid.toString(),
      }));

    // Get recent transactions (last 20)
    const recentTransactions = parsedEvents
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);

    return {
      totalOperations: parsedEvents.length,
      totalGasSponsored: totalGasSponsored.toString(),
      totalPntPaid: totalPntPaid.toString(),
      uniqueUsers: userStatsMap.size,
      topUsers,
      dailyTrends,
      recentTransactions,
      lastUpdated: Date.now(),
    };
  }, [fromBlock, toBlock]);

  /**
   * Load analytics from cache or fetch fresh data
   */
  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Construct cache key based on options
      const cacheKey = userAddress
        ? `${CACHE_KEY_PREFIX}-user-${userAddress.toLowerCase()}`
        : `${CACHE_KEY_PREFIX}-global`;

      // Try loading from cache
      const cached = loadFromCache<GasAnalytics>(cacheKey);

      if (cached && !cached.expired) {
        // Use cached data
        setAnalytics(cached.data);

        // Extract user stats if userAddress is provided
        if (userAddress) {
          const userLower = userAddress.toLowerCase();
          const userEntry = cached.data.topUsers.find(
            (u) => u.address.toLowerCase() === userLower,
          );
          setUserStats(userEntry?.stats ?? null);
        }

        setIsLoading(false);

        // Background refresh if enabled
        if (enableBackgroundRefresh) {
          fetchAnalytics()
            .then((freshData) => {
              saveToCache(cacheKey, freshData, CACHE_TTL);
              setAnalytics(freshData);

              if (userAddress) {
                const userLower = userAddress.toLowerCase();
                const userEntry = freshData.topUsers.find(
                  (u) => u.address.toLowerCase() === userLower,
                );
                setUserStats(userEntry?.stats ?? null);
              }
            })
            .catch((err) => console.warn("Background refresh failed:", err));
        }
      } else {
        // Fetch fresh data
        const freshData = await fetchAnalytics();

        // Save to cache
        saveToCache(cacheKey, freshData, CACHE_TTL);

        // Update state
        setAnalytics(freshData);

        // Extract user stats if userAddress is provided
        if (userAddress) {
          const userLower = userAddress.toLowerCase();
          const userEntry = freshData.topUsers.find(
            (u) => u.address.toLowerCase() === userLower,
          );
          setUserStats(userEntry?.stats ?? null);
        }

        setIsLoading(false);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to load analytics"),
      );
      setIsLoading(false);
    }
  }, [userAddress, fetchAnalytics, enableBackgroundRefresh]);

  /**
   * Manual refresh function (bypasses cache)
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const freshData = await fetchAnalytics();

      const cacheKey = userAddress
        ? `${CACHE_KEY_PREFIX}-user-${userAddress.toLowerCase()}`
        : `${CACHE_KEY_PREFIX}-global`;

      saveToCache(cacheKey, freshData, CACHE_TTL);
      setAnalytics(freshData);

      if (userAddress) {
        const userLower = userAddress.toLowerCase();
        const userEntry = freshData.topUsers.find(
          (u) => u.address.toLowerCase() === userLower,
        );
        setUserStats(userEntry?.stats ?? null);
      }

      setIsLoading(false);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to refresh analytics"),
      );
      setIsLoading(false);
    }
  }, [userAddress, fetchAnalytics]);

  // Load analytics on mount and when options change
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    analytics,
    userStats,
    isLoading,
    error,
    refresh,
  };
}
