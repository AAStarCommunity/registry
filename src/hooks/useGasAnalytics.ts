import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

/*==============================================================================
  CORRECT ANALYTICS ARCHITECTURE

  Query Flow:
  1. Registry.getActivePaymasters() → Get all 7 Paymaster addresses
  2. For each Paymaster:
     - Check cached block ranges
     - Query only uncached blocks
     - Cache new events
  3. Compute ALL statistics from cache
  4. User queries filter from cache
==============================================================================*/

// Contract Addresses
const REGISTRY_ADDRESS =
  import.meta.env.VITE_REGISTRY_ADDRESS ||
  "0x838da93c815a6E45Aa50429529da9106C0621eF0";

// ABIs
const REGISTRY_ABI = [
  "function getActivePaymasters() external view returns (address[])",
  "function getPaymasterCount() external view returns (uint256)",
];

const PAYMASTER_ABI = [
  "event GasPaymentProcessed(address indexed user, address indexed gasToken, uint256 pntAmount, uint256 gasCostWei, uint256 actualGasCost)",
];

// RPC Configuration
const RPC_URL =
  import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";

// Cache Keys
const CACHE_KEYS = {
  PAYMASTERS: "analytics_paymasters_list",
  EVENTS: "analytics_events_by_paymaster",
  LAST_SYNC: "analytics_last_sync_time",
};

// Query Configuration
const CHUNK_SIZE = 10; // Alchemy free tier: max 10 blocks per query
const BATCH_SIZE = 10; // Process 10 chunks in parallel
const DELAY_BETWEEN_BATCHES_MS = 1000; // 1s delay between batches

/*==============================================================================
  TYPE DEFINITIONS
==============================================================================*/

export interface GasPaymentEvent {
  paymasterAddress: string; // Which Paymaster sponsored this
  user: string;
  gasToken: string;
  actualGasCost: string; // BigInt as string
  pntAmount: string; // BigInt as string
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

interface QueriedRange {
  from: number;
  to: number;
  queriedAt: number;
}

interface PaymasterCache {
  address: string;
  events: GasPaymentEvent[];
  queriedRanges: QueriedRange[];
}

interface EventsCache {
  [paymasterAddress: string]: PaymasterCache;
}

export interface PaymasterStats {
  address: string;
  operations: number;
  totalGas: string; // Formatted ETH
  totalPnt: string; // Formatted PNT
  uniqueUsers: number;
}

export interface UserStats {
  address: string;
  operations: number;
  totalGas: bigint;
  totalPnt: bigint;
  paymasters: string[]; // Which Paymasters this user used
  firstTx: number;
  lastTx: number;
}

export interface GasAnalytics {
  // Global Stats
  totalOperations: number;
  totalGasSponsored: string; // Formatted ETH
  totalPntPaid: string; // Formatted PNT
  uniqueUsers: number;
  activePaymasters: number;
  lastUpdated?: number; // Timestamp of last update

  // Per-Paymaster Stats
  paymasterStats: PaymasterStats[];

  // Per-User Stats
  topUsers: Array<{
    address: string;
    operations: number;
    totalGas: string;
    totalPnt: string;
    avgGasPerOp: string;
    lastTxTime: number;
  }>;

  // Recent Transactions
  recentTransactions: GasPaymentEvent[];

  // Daily Trends
  dailyTrends: Array<{
    date: string;
    operations: number;
    gas: string;
    pnt: string;
  }>;
}

/*==============================================================================
  CACHE UTILITIES
==============================================================================*/

function loadEventsCache(): EventsCache {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.EVENTS);
    return cached ? JSON.parse(cached) : {};
  } catch (error) {
    console.error("Failed to load cache:", error);
    return {};
  }
}

function saveEventsCache(cache: EventsCache): void {
  try {
    localStorage.setItem(CACHE_KEYS.EVENTS, JSON.stringify(cache));
    localStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
  } catch (error) {
    console.error("Failed to save cache:", error);
  }
}

function loadPaymastersList(): string[] {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.PAYMASTERS);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    return [];
  }
}

function savePaymastersList(paymasters: string[]): void {
  try {
    localStorage.setItem(CACHE_KEYS.PAYMASTERS, JSON.stringify(paymasters));
  } catch (error) {
    console.error("Failed to save Paymasters list:", error);
  }
}

/*==============================================================================
  QUERY UTILITIES
==============================================================================*/

/**
 * Find block ranges that haven't been queried yet
 */
function findUnqueriedRanges(
  queriedRanges: QueriedRange[],
  targetFrom: number,
  targetTo: number,
): Array<{ from: number; to: number }> {
  if (queriedRanges.length === 0) {
    return [{ from: targetFrom, to: targetTo }];
  }

  // Sort ranges by start block
  const sorted = [...queriedRanges].sort((a, b) => a.from - b.from);

  // Merge overlapping ranges
  const merged: QueriedRange[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];

    if (current.from <= last.to + 1) {
      // Overlapping or adjacent, merge
      last.to = Math.max(last.to, current.to);
    } else {
      merged.push(current);
    }
  }

  // Find gaps
  const unqueried: Array<{ from: number; to: number }> = [];

  // Check before first range
  if (targetFrom < merged[0].from) {
    unqueried.push({
      from: targetFrom,
      to: Math.min(targetTo, merged[0].from - 1),
    });
  }

  // Check gaps between ranges
  for (let i = 0; i < merged.length - 1; i++) {
    const gapStart = merged[i].to + 1;
    const gapEnd = merged[i + 1].from - 1;

    if (gapStart <= gapEnd && gapStart <= targetTo && gapEnd >= targetFrom) {
      unqueried.push({
        from: Math.max(gapStart, targetFrom),
        to: Math.min(gapEnd, targetTo),
      });
    }
  }

  // Check after last range
  if (targetTo > merged[merged.length - 1].to) {
    unqueried.push({
      from: Math.max(targetFrom, merged[merged.length - 1].to + 1),
      to: targetTo,
    });
  }

  return unqueried;
}

/**
 * Query events from a Paymaster in a specific block range
 */
async function queryPaymasterRange(
  provider: ethers.JsonRpcProvider,
  paymasterAddress: string,
  fromBlock: number,
  toBlock: number,
): Promise<GasPaymentEvent[]> {
  const contract = new ethers.Contract(
    paymasterAddress,
    PAYMASTER_ABI,
    provider,
  );

  // Generate chunks
  const chunks: Array<{ start: number; end: number }> = [];
  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    chunks.push({
      start,
      end: Math.min(start + CHUNK_SIZE - 1, toBlock),
    });
  }

  console.log(
    `  Total chunks: ${chunks.length}, processing in batches of ${BATCH_SIZE}`,
  );

  const allEvents: any[] = [];

  // Process in batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

    console.log(`  Batch ${batchNum}/${totalBatches}`);

    // Query batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map(async ({ start, end }) => {
        const filter = contract.filters.GasPaymentProcessed();
        const events = await contract.queryFilter(filter, start, end);
        return { start, end, events };
      }),
    );

    // Collect results
    batchResults.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        const { start, end, events } = result.value;
        allEvents.push(...events);
        if (events.length > 0) {
          console.log(`    [${start}, ${end}]: ${events.length} events`);
        }
      } else {
        const chunk = batch[idx];
        console.error(
          `    [${chunk.start}, ${chunk.end}]: ${result.reason?.message}`,
        );
      }
    });

    // Delay between batches
    if (i + BATCH_SIZE < chunks.length) {
      await new Promise((resolve) =>
        setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS),
      );
    }
  }

  // Fetch block timestamps
  const blockNumbers = [...new Set(allEvents.map((e) => e.blockNumber))];
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
  const parsedEvents: GasPaymentEvent[] = allEvents.map((event) => ({
    paymasterAddress,
    user: event.args.user,
    gasToken: event.args.gasToken,
    actualGasCost: event.args.actualGasCost.toString(),
    pntAmount: event.args.pntAmount.toString(),
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash,
    timestamp: blockTimestamps.get(event.blockNumber) || 0,
  }));

  console.log(`  Found ${parsedEvents.length} events`);

  return parsedEvents;
}

/*==============================================================================
  MAIN QUERY FUNCTION
==============================================================================*/

export async function fetchAllPaymastersAnalytics(
  fromBlock?: number,
  toBlock?: number,
): Promise<GasAnalytics> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  console.log("🔍 Fetching Analytics from ALL Paymasters");
  console.log("=".repeat(70));

  // Step 1: Get Paymasters from Registry
  console.log("\n📡 Step 1: Query Registry for Paymasters...");
  const registry = new ethers.Contract(
    REGISTRY_ADDRESS,
    REGISTRY_ABI,
    provider,
  );

  let paymasters: string[];
  try {
    paymasters = await registry.getActivePaymasters();
    console.log(`✅ Found ${paymasters.length} active Paymasters`);
    paymasters.forEach((pm, i) => console.log(`  ${i + 1}. ${pm}`));

    savePaymastersList(paymasters);
  } catch (error) {
    console.error("❌ Failed to query Registry, using cached list");
    paymasters = loadPaymastersList();

    if (paymasters.length === 0) {
      throw new Error("No Paymasters available");
    }
  }

  // Step 2: Load cache
  // TODO: Future enhancement - load from KV DB instead of localStorage
  // const cache = await loadFromKVDB();
  console.log("\n💾 Step 2: Load existing cache...");
  const cache = loadEventsCache();
  console.log(`Cached Paymasters: ${Object.keys(cache).length}`);

  // Step 3: Determine block range (incremental query)
  const currentBlock = await provider.getBlockNumber();

  // Find the highest queried block across all Paymasters
  let maxQueriedBlock = 0;
  Object.values(cache).forEach((pmCache) => {
    pmCache.queriedRanges.forEach((range) => {
      maxQueriedBlock = Math.max(maxQueriedBlock, range.to);
    });
  });

  let queryFromBlock: number;
  let queryToBlock: number;

  if (maxQueriedBlock === 0) {
    // No cache: initial historical query
    queryFromBlock =
      fromBlock || parseInt(import.meta.env.VITE_HISTORICAL_FROM_BLOCK || "0");
    queryToBlock =
      toBlock ||
      parseInt(
        import.meta.env.VITE_HISTORICAL_TO_BLOCK || currentBlock.toString(),
      );
    console.log(
      `\n🔍 Step 3: Initial cache build - querying blocks ${queryFromBlock} → ${queryToBlock}`,
    );
  } else {
    // Has cache: incremental query from last cached block to current
    queryFromBlock = maxQueriedBlock + 1;
    queryToBlock = currentBlock;
    console.log(
      `\n⚡ Step 3: Incremental query - from block ${queryFromBlock} → ${queryToBlock} (${queryToBlock - queryFromBlock + 1} new blocks)`,
    );

    // If no new blocks, skip querying
    if (queryFromBlock > queryToBlock) {
      console.log(`✅ No new blocks to query`);
      const analytics = computeAnalyticsFromCache(cache);
      return analytics;
    }
  }

  // Step 4: Query each Paymaster
  console.log("\n⚡ Step 4: Query events from each Paymaster...");
  console.log("=".repeat(70));

  for (const pmAddress of paymasters) {
    console.log(`\n📍 Paymaster: ${pmAddress}`);

    // Initialize cache for this Paymaster
    if (!cache[pmAddress]) {
      cache[pmAddress] = {
        address: pmAddress,
        events: [],
        queriedRanges: [],
      };
    }

    const pmCache = cache[pmAddress];

    // Find unqueried ranges using the determined query range
    const toQuery = findUnqueriedRanges(
      pmCache.queriedRanges,
      queryFromBlock,
      queryToBlock,
    );

    if (toQuery.length === 0) {
      console.log(`  ✅ All blocks cached (${pmCache.events.length} events)`);
      continue;
    }

    console.log(`  📦 Need to query ${toQuery.length} range(s):`);
    toQuery.forEach((r) => console.log(`    - [${r.from}, ${r.to}]`));

    // Query each unqueried range
    for (const range of toQuery) {
      const newEvents = await queryPaymasterRange(
        provider,
        pmAddress,
        range.from,
        range.to,
      );

      // Add to cache (deduplicate by txHash)
      const existingTxHashes = new Set(
        pmCache.events.map((e) => e.transactionHash),
      );
      const uniqueNewEvents = newEvents.filter(
        (e) => !existingTxHashes.has(e.transactionHash),
      );

      pmCache.events.push(...uniqueNewEvents);
      pmCache.queriedRanges.push({
        from: range.from,
        to: range.to,
        queriedAt: Date.now(),
      });

      console.log(`  ✅ Added ${uniqueNewEvents.length} new events`);
    }

    console.log(
      `  📊 Total events for this Paymaster: ${pmCache.events.length}`,
    );
  }

  // Step 5: Save cache
  console.log("\n💾 Step 5: Save cache...");
  saveEventsCache(cache);
  console.log("✅ Cache saved");

  // Step 6: Compute statistics from cache
  console.log("\n📊 Step 6: Compute statistics from cache...");
  const analytics = computeAnalyticsFromCache(cache);

  console.log("\n✅ Analytics computation complete");
  console.log(`Total Operations: ${analytics.totalOperations}`);
  console.log(`Unique Users: ${analytics.uniqueUsers}`);
  console.log(`Active Paymasters: ${analytics.activePaymasters}`);

  return analytics;
}

/*==============================================================================
  STATISTICS COMPUTATION
==============================================================================*/

function computeAnalyticsFromCache(cache: EventsCache): GasAnalytics {
  // Flatten all events
  const allEvents: GasPaymentEvent[] = Object.values(cache).flatMap(
    (pm) => pm.events,
  );

  if (allEvents.length === 0) {
    return {
      totalOperations: 0,
      totalGasSponsored: "0",
      totalPntPaid: "0",
      uniqueUsers: 0,
      activePaymasters: 0,
      lastUpdated: Date.now(),
      paymasterStats: [],
      topUsers: [],
      recentTransactions: [],
      dailyTrends: [],
    };
  }

  // Global stats
  const totalGas = allEvents.reduce(
    (sum, e) => sum + BigInt(e.actualGasCost),
    0n,
  );
  const totalPnt = allEvents.reduce((sum, e) => sum + BigInt(e.pntAmount), 0n);
  const uniqueUsers = new Set(allEvents.map((e) => e.user.toLowerCase())).size;
  const activePaymasters = Object.values(cache).filter(
    (pm) => pm.events.length > 0,
  ).length;

  // Per-Paymaster stats (include all Paymasters, even with 0 events)
  const paymasterStats: PaymasterStats[] = Object.values(cache)
    .map((pm) => {
      const pmGas = pm.events.reduce(
        (sum, e) => sum + BigInt(e.actualGasCost),
        0n,
      );
      const pmPnt = pm.events.reduce((sum, e) => sum + BigInt(e.pntAmount), 0n);
      const pmUsers = new Set(pm.events.map((e) => e.user.toLowerCase())).size;

      return {
        address: pm.address,
        operations: pm.events.length,
        totalGas: ethers.formatEther(pmGas),
        totalPnt: ethers.formatUnits(pmPnt, 18),
        uniqueUsers: pmUsers,
      };
    })
    .sort((a, b) => b.operations - a.operations);

  // Per-User stats
  const userMap = new Map<string, GasPaymentEvent[]>();
  allEvents.forEach((event) => {
    const userKey = event.user.toLowerCase();
    if (!userMap.has(userKey)) {
      userMap.set(userKey, []);
    }
    userMap.get(userKey)!.push(event);
  });

  const topUsers = Array.from(userMap.entries())
    .map(([address, events]) => {
      const userGas = events.reduce(
        (sum, e) => sum + BigInt(e.actualGasCost),
        0n,
      );
      const userPnt = events.reduce((sum, e) => sum + BigInt(e.pntAmount), 0n);
      const avgGas = userGas / BigInt(events.length);
      const lastTx = Math.max(...events.map((e) => e.timestamp));

      return {
        address,
        operations: events.length,
        totalGas: ethers.formatEther(userGas),
        totalPnt: ethers.formatUnits(userPnt, 18),
        avgGasPerOp: ethers.formatEther(avgGas),
        lastTxTime: lastTx,
      };
    })
    .sort((a, b) => b.operations - a.operations);

  // Recent transactions
  const recentTransactions = [...allEvents]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);

  // Daily trends
  const dailyMap = new Map<string, { ops: number; gas: bigint; pnt: bigint }>();
  allEvents.forEach((event) => {
    const date = new Date(event.timestamp * 1000).toISOString().split("T")[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { ops: 0, gas: 0n, pnt: 0n });
    }
    const day = dailyMap.get(date)!;
    day.ops++;
    day.gas += BigInt(event.actualGasCost);
    day.pnt += BigInt(event.pntAmount);
  });

  const dailyTrends = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      operations: data.ops,
      gas: ethers.formatEther(data.gas),
      pnt: ethers.formatUnits(data.pnt, 18),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalOperations: allEvents.length,
    totalGasSponsored: ethers.formatEther(totalGas),
    totalPntPaid: ethers.formatUnits(totalPnt, 18),
    uniqueUsers,
    activePaymasters,
    lastUpdated: Date.now(),
    paymasterStats,
    topUsers,
    recentTransactions,
    dailyTrends,
  };
}

/*==============================================================================
  REACT HOOK
==============================================================================*/

interface UseGasAnalyticsOptions {
  userAddress?: string;
  enableBackgroundRefresh?: boolean;
}

export function useGasAnalytics(options?: UseGasAnalyticsOptions | string) {
  // Support both old signature (string) and new signature (options object)
  const userAddress =
    typeof options === "string" ? options : options?.userAddress;

  const [analytics, setAnalytics] = useState<GasAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      // Step 1: Load from cache immediately and display
      console.log("📦 Loading from cache...");
      const cache = loadEventsCache();

      if (Object.keys(cache).length > 0) {
        // Has cache: display immediately
        setIsLoading(false);

        let cachedAnalytics;
        if (userAddress) {
          const userEvents = Object.values(cache)
            .flatMap((pm) => pm.events)
            .filter((e) => e.user.toLowerCase() === userAddress.toLowerCase());
          const userCache: EventsCache = {
            "user-filter": {
              address: userAddress,
              events: userEvents,
              queriedRanges: [],
            },
          };
          cachedAnalytics = computeAnalyticsFromCache(userCache);
        } else {
          cachedAnalytics = computeAnalyticsFromCache(cache);
        }

        console.log("✅ Setting cached analytics:", {
          totalOperations: cachedAnalytics.totalOperations,
          uniqueUsers: cachedAnalytics.uniqueUsers,
          hasLastUpdated: !!cachedAnalytics.lastUpdated,
        });
        setAnalytics(cachedAnalytics);
      } else {
        // No cache: show loading
        setIsLoading(true);
      }

      // Step 2: Background query for new blocks
      console.log("🔄 Background sync: checking for new blocks...");
      const data = await fetchAllPaymastersAnalytics();

      // Step 3: Update display with fresh data
      let freshAnalytics;
      if (userAddress) {
        const updatedCache = loadEventsCache();
        const userEvents = Object.values(updatedCache)
          .flatMap((pm) => pm.events)
          .filter((e) => e.user.toLowerCase() === userAddress.toLowerCase());
        const userCache: EventsCache = {
          "user-filter": {
            address: userAddress,
            events: userEvents,
            queriedRanges: [],
          },
        };
        freshAnalytics = computeAnalyticsFromCache(userCache);
      } else {
        freshAnalytics = data;
      }

      console.log("✅ Background sync complete, setting fresh analytics:", {
        totalOperations: freshAnalytics.totalOperations,
        uniqueUsers: freshAnalytics.uniqueUsers,
        hasLastUpdated: !!freshAnalytics.lastUpdated,
      });
      setAnalytics(freshAnalytics);
      setIsLoading(false);
    } catch (err: any) {
      setError(
        err instanceof Error ? err : new Error(err.message || "Unknown error"),
      );
      console.error("Failed to fetch analytics:", err);
      setIsLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    analytics,
    isLoading,
    error,
    refetch: fetchData,
    refresh: fetchData, // Alias for backward compatibility
  };
}
