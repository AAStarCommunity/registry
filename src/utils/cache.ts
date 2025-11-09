/**
 * localStorage Cache Utility
 *
 * Provides caching functionality with TTL support for SuperPaymaster Registry
 *
 * @module utils/cache
 */

const CACHE_PREFIX = "spm_";
const DEFAULT_TTL = 3600; // 1 hour in seconds
const FORTY_EIGHT_HOURS = 172800; // 48 hours in seconds

// Data freshness limit for analytics (48 hours)
const DATA_FRESHNESS_LIMIT_MS = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

export interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Load data from localStorage cache
 *
 * @param key - Cache key (will be prefixed with 'spm_')
 * @returns Cached data object or null if not found/expired
 */
export function loadFromCache<T>(key: string): CachedData<T> | null {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;

    const parsed: CachedData<T> = JSON.parse(cached);

    // Check if cache is expired
    if (isCacheExpired(parsed.timestamp, parsed.ttl)) {
      // Remove expired cache
      clearCache(key);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error(`[Cache] Failed to load from cache (${key}):`, error);
    return null;
  }
}

/**
 * Save data to localStorage cache
 *
 * @param key - Cache key (will be prefixed with 'spm_')
 * @param data - Data to cache
 * @param ttl - Time to live in seconds (default: 3600)
 */
export function saveToCache<T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_TTL,
): void {
  try {
    const cacheData: CachedData<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`[Cache] Failed to save to cache (${key}):`, error);

    // Handle quota exceeded error
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.warn("[Cache] localStorage quota exceeded, clearing old caches");
      clearOldCaches();

      // Try again after clearing
      try {
        const cacheData: CachedData<T> = {
          data,
          timestamp: Date.now(),
          ttl,
        };
        localStorage.setItem(
          `${CACHE_PREFIX}${key}`,
          JSON.stringify(cacheData),
        );
      } catch (retryError) {
        console.error(
          "[Cache] Failed to save even after clearing:",
          retryError,
        );
      }
    }
  }
}

/**
 * Check if cache is expired
 *
 * @param timestamp - Cache creation timestamp
 * @param ttl - Time to live in seconds
 * @returns True if cache is expired
 */
export function isCacheExpired(timestamp: number, ttl: number): boolean {
  return Date.now() - timestamp > ttl * 1000;
}

/**
 * Clear specific cache or all caches matching a pattern
 *
 * @param pattern - Optional pattern to match cache keys. If not provided, clears all SPM caches
 */
export function clearCache(pattern?: string): void {
  try {
    if (!pattern) {
      // Clear all SPM caches
      Object.keys(localStorage)
        .filter((key) => key.startsWith(CACHE_PREFIX))
        .forEach((key) => localStorage.removeItem(key));

      console.log("[Cache] Cleared all SuperPaymaster caches");
    } else {
      // Clear caches matching pattern
      Object.keys(localStorage)
        .filter((key) => key.startsWith(CACHE_PREFIX) && key.includes(pattern))
        .forEach((key) => localStorage.removeItem(key));

      console.log(`[Cache] Cleared caches matching pattern: ${pattern}`);
    }
  } catch (error) {
    console.error("[Cache] Failed to clear cache:", error);
  }
}

/**
 * Clear old/expired caches to free up space
 *
 * Removes the oldest 50% of caches
 */
export function clearOldCaches(): void {
  try {
    const caches: Array<{ key: string; timestamp: number }> = [];

    // Collect all SPM caches with timestamps
    Object.keys(localStorage)
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .forEach((key) => {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached);
            caches.push({ key, timestamp: parsed.timestamp || 0 });
          }
        } catch (error) {
          // If parse fails, add with timestamp 0 (will be cleared first)
          caches.push({ key, timestamp: 0 });
        }
      });

    // Sort by timestamp (oldest first)
    caches.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest 50%
    const toRemove = Math.ceil(caches.length / 2);
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(caches[i].key);
    }

    console.log(`[Cache] Cleared ${toRemove} old caches`);
  } catch (error) {
    console.error("[Cache] Failed to clear old caches:", error);
  }
}

/**
 * Get cache statistics
 *
 * @returns Cache statistics
 */
export function getCacheStats(): {
  totalCaches: number;
  totalSize: number;
  oldestCache: number | null;
  newestCache: number | null;
} {
  const caches: Array<{ key: string; timestamp: number; size: number }> = [];

  Object.keys(localStorage)
    .filter((key) => key.startsWith(CACHE_PREFIX))
    .forEach((key) => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          caches.push({
            key,
            timestamp: parsed.timestamp || 0,
            size: new Blob([cached]).size,
          });
        }
      } catch (error) {
        // Skip invalid caches
      }
    });

  const totalSize = caches.reduce((sum, c) => sum + c.size, 0);
  const timestamps = caches.map((c) => c.timestamp).filter((t) => t > 0);

  return {
    totalCaches: caches.length,
    totalSize,
    oldestCache: timestamps.length > 0 ? Math.min(...timestamps) : null,
    newestCache: timestamps.length > 0 ? Math.max(...timestamps) : null,
  };
}

/**
 * Format cache age for display
 *
 * @param timestamp - Cache creation timestamp
 * @returns Human-readable age string
 */
export function formatCacheAge(timestamp: number): string {
  const ageMs = Date.now() - timestamp;
  const ageSeconds = Math.floor(ageMs / 1000);

  if (ageSeconds < 60) {
    return `${ageSeconds}s ago`;
  } else if (ageSeconds < 3600) {
    const minutes = Math.floor(ageSeconds / 60);
    return `${minutes}m ago`;
  } else if (ageSeconds < 86400) {
    const hours = Math.floor(ageSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(ageSeconds / 86400);
    return `${days}d ago`;
  }
}

/**
 * Check if data is within 48-hour freshness window
 *
 * @param timestamp - Data creation timestamp in milliseconds
 * @returns True if data is fresh (within 48 hours)
 */
export function isDataFresh(timestamp: number): boolean {
  return Date.now() - timestamp <= DATA_FRESHNESS_LIMIT_MS;
}

/**
 * Filter array items by 48-hour freshness
 *
 * @param items - Array of items with timestamp field
 * @param timestampField - Name of the timestamp field (default: 'timestamp')
 * @returns Filtered array with only fresh data (within 48 hours)
 *
 * @example
 * const transactions = [
 *   { hash: '0x1', timestamp: Date.now() - 1000 * 60 * 60 }, // 1 hour ago - KEEP
 *   { hash: '0x2', timestamp: Date.now() - 1000 * 60 * 60 * 50 }, // 50 hours ago - REMOVE
 * ];
 * const fresh = filterByFreshness(transactions); // Only returns first item
 */
export function filterByFreshness<T extends Record<string, any>>(
  items: T[],
  timestampField: string = 'timestamp'
): T[] {
  return items.filter((item) => {
    const timestamp = item[timestampField];
    if (typeof timestamp !== 'number') {
      console.warn(`[Cache] Invalid timestamp field "${timestampField}" in item:`, item);
      return false;
    }
    return isDataFresh(timestamp);
  });
}

/**
 * Export constants for external use
 */
export const CACHE_CONSTANTS = {
  FORTY_EIGHT_HOURS,
  DATA_FRESHNESS_LIMIT_MS,
  DEFAULT_TTL,
};
