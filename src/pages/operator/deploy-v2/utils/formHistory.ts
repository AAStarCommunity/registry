/**
 * Form History Manager
 *
 * Manages form field history in LocalStorage
 * Supports saving, loading, and clearing history for form fields
 */

const HISTORY_KEY_PREFIX = "deploy_form_history_";
const MAX_HISTORY_ITEMS = 5;

export type HistoryItem = {
  value: string;
  timestamp: number;
  label?: string; // Optional display label
};

/**
 * Save a value to history
 */
export function saveToHistory(
  fieldName: string,
  value: string,
  label?: string,
): void {
  if (!value || !value.trim()) return;

  const key = `${HISTORY_KEY_PREFIX}${fieldName}`;
  const existing = loadHistory(fieldName);

  // Remove duplicates (case-insensitive for addresses)
  const filtered = existing.filter((item) => {
    if (fieldName === "treasury") {
      return item.value.toLowerCase() !== value.toLowerCase();
    }
    return item.value !== value;
  });

  // Add new item to the beginning
  const updated: HistoryItem[] = [
    {
      value: value.trim(),
      timestamp: Date.now(),
      label,
    },
    ...filtered,
  ].slice(0, MAX_HISTORY_ITEMS);

  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save history:", error);
  }
}

/**
 * Load history for a specific field
 */
export function loadHistory(fieldName: string): HistoryItem[] {
  const key = `${HISTORY_KEY_PREFIX}${fieldName}`;
  const data = localStorage.getItem(key);

  if (!data) return [];

  try {
    const items = JSON.parse(data);

    // Validate and filter expired items (older than 90 days)
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    return items.filter((item: HistoryItem) => {
      return item.value && item.timestamp && item.timestamp > ninetyDaysAgo;
    });
  } catch (error) {
    console.error("Failed to load history:", error);
    return [];
  }
}

/**
 * Clear history for a specific field
 */
export function clearHistory(fieldName: string): void {
  const key = `${HISTORY_KEY_PREFIX}${fieldName}`;
  localStorage.removeItem(key);
}

/**
 * Clear all form history
 */
export function clearAllHistory(): void {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(HISTORY_KEY_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error("Failed to clear all history:", error);
  }
}

/**
 * Get most recent value from history
 */
export function getMostRecent(fieldName: string): string | null {
  const history = loadHistory(fieldName);
  return history.length > 0 ? history[0].value : null;
}

/**
 * Check if a field has history
 */
export function hasHistory(fieldName: string): boolean {
  return loadHistory(fieldName).length > 0;
}

/**
 * Get history statistics
 */
export function getHistoryStats(): {
  totalFields: number;
  totalItems: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
} {
  const allKeys = Object.keys(localStorage).filter((key) =>
    key.startsWith(HISTORY_KEY_PREFIX),
  );

  let totalItems = 0;
  let oldestTimestamp: number | null = null;
  let newestTimestamp: number | null = null;

  allKeys.forEach((key) => {
    const fieldName = key.replace(HISTORY_KEY_PREFIX, "");
    const items = loadHistory(fieldName);

    totalItems += items.length;

    items.forEach((item) => {
      if (!oldestTimestamp || item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
      }
      if (!newestTimestamp || item.timestamp > newestTimestamp) {
        newestTimestamp = item.timestamp;
      }
    });
  });

  return {
    totalFields: allKeys.length,
    totalItems,
    oldestTimestamp,
    newestTimestamp,
  };
}
