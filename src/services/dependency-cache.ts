/**
 * Dependency Cache Service
 * In-memory cache with TTL and fallback support for circuit breaker scenarios.
 */

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

class DependencyCacheService {
  private cache = new Map<string, CacheEntry>();
  private metrics = new Map<string, { hits: number; misses: number; lastInvalidation: number | null }>();

  private getMetrics(moduleId: string) {
    if (!this.metrics.has(moduleId)) {
      this.metrics.set(moduleId, { hits: 0, misses: 0, lastInvalidation: null });
    }
    return this.metrics.get(moduleId)!;
  }

  private makeKey(moduleId: string, queryKey: string): string {
    return `${moduleId}::${queryKey}`;
  }

  get<T>(moduleId: string, queryKey: string): { data: T; isFromCache: true } | null {
    const key = this.makeKey(moduleId, queryKey);
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.getMetrics(moduleId).misses++;
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      this.getMetrics(moduleId).misses++;
      return null;
    }

    this.getMetrics(moduleId).hits++;
    return { data: entry.data, isFromCache: true };
  }

  set<T>(moduleId: string, queryKey: string, data: T, ttl: number): void {
    const key = this.makeKey(moduleId, queryKey);
    this.cache.set(key, { data, timestamp: Date.now(), ttl });

    // Enforce max cache size per module (simple LRU-like: just clear oldest)
    const moduleKeys = Array.from(this.cache.keys()).filter((k) => k.startsWith(moduleId + "::"));
    const maxSize = 500;
    if (moduleKeys.length > maxSize) {
      const toRemove = moduleKeys.slice(0, moduleKeys.length - maxSize);
      toRemove.forEach((k) => this.cache.delete(k));
    }
  }

  invalidate(moduleId: string, queryKey?: string): void {
    if (queryKey) {
      this.cache.delete(this.makeKey(moduleId, queryKey));
    } else {
      // Invalidate all keys for module
      for (const key of this.cache.keys()) {
        if (key.startsWith(moduleId + "::")) {
          this.cache.delete(key);
        }
      }
    }
    this.getMetrics(moduleId).lastInvalidation = Date.now();
  }

  clearAll(): void {
    this.cache.clear();
  }

  getModuleMetrics(moduleId: string) {
    return { ...this.getMetrics(moduleId) };
  }

  getAllMetrics() {
    const result: Record<string, { hits: number; misses: number; lastInvalidation: number | null; entryCount: number }> = {};
    for (const [moduleId, m] of this.metrics.entries()) {
      const entryCount = Array.from(this.cache.keys()).filter((k) => k.startsWith(moduleId + "::")).length;
      result[moduleId] = { ...m, entryCount };
    }
    return result;
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

// Singleton
export const dependencyCache = new DependencyCacheService();
