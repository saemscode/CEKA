// src/lib/offlineCache.ts
// Offline-first search result cache using localStorage (Capacitor Preferences-compatible stub)
// Falls back gracefully when running in browser without Capacitor

const FEED_KEY = 'ceka_search_feed';
const SEARCH_KEY = 'ceka_last_search';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedEntry<T> {
  data: T;
  timestamp: number;
  query?: string;
}

async function cacheSet(key: string, value: unknown): Promise<void> {
  try {
    // Capacitor Preferences (if available)
    if (typeof window !== 'undefined' && (window as any).Capacitor?.Plugins?.Preferences) {
      await (window as any).Capacitor.Plugins.Preferences.set({
        key,
        value: JSON.stringify(value),
      });
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Silently fail — never block render
  }
}

async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    let raw: string | null = null;
    if (typeof window !== 'undefined' && (window as any).Capacitor?.Plugins?.Preferences) {
      const result = await (window as any).Capacitor.Plugins.Preferences.get({ key });
      raw = result?.value ?? null;
    } else {
      raw = localStorage.getItem(key);
    }
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const offlineCache = {
  /**
   * Persist the discovery/personalised feed for offline use
   */
  async saveFeed<T>(data: T[]): Promise<void> {
    await cacheSet(FEED_KEY, { data, timestamp: Date.now() } as CachedEntry<T[]>);
  },

  /**
   * Load feed from cache. Returns null if stale (>24h) or absent.
   */
  async loadFeed<T>(): Promise<T[] | null> {
    const entry = await cacheGet<CachedEntry<T[]>>(FEED_KEY);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > MAX_AGE_MS) return null;
    return entry.data;
  },

  /**
   * Persist last search results (for offline fallback)
   */
  async saveSearch<T>(query: string, data: T[]): Promise<void> {
    await cacheSet(SEARCH_KEY, { data, query, timestamp: Date.now() } as CachedEntry<T[]>);
  },

  /**
   * Load last search results. Returns null if stale.
   */
  async loadSearch<T>(): Promise<{ query: string; data: T[] } | null> {
    const entry = await cacheGet<CachedEntry<T[]> & { query: string }>(SEARCH_KEY);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > MAX_AGE_MS) return null;
    return { query: entry.query, data: entry.data };
  },
};
