import { useState, useEffect, useCallback, useRef } from "react";
import { dependencyCache } from "@/services/dependency-cache";
import { circuitBreaker, CircuitOpenError } from "@/services/circuit-breaker";
import { CRITICAL_MODULES } from "@/config/critical-modules";
import { toast } from "sonner";

interface UseDependencyCacheOptions<T> {
  ttl?: number;
  fallbackData?: T;
  enabled?: boolean;
}

export function useDependencyCache<T>(
  moduleId: string,
  queryKey: string,
  fetcher: () => Promise<T>,
  options?: UseDependencyCacheOptions<T>
) {
  const config = CRITICAL_MODULES[moduleId];
  const ttl = options?.ttl ?? config?.cache.ttl ?? 300000;
  const enabled = options?.enabled !== false;

  const [data, setData] = useState<T | undefined>(undefined);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await circuitBreaker.execute(moduleId, fetcher);
      if (!mountedRef.current) return;
      dependencyCache.set(moduleId, queryKey, result, ttl);
      setData(result);
      setIsFromCache(false);
    } catch (err) {
      if (!mountedRef.current) return;

      // Try cache fallback
      const cached = dependencyCache.get<T>(moduleId, queryKey);
      if (cached) {
        setData(cached.data);
        setIsFromCache(true);
        if (err instanceof CircuitOpenError) {
          toast.warning(`A usar dados em cache para "${moduleId}"`, {
            id: `cache-fallback-${moduleId}`,
            duration: 4000,
          });
        }
      } else if (options?.fallbackData !== undefined) {
        setData(options.fallbackData);
        setIsFromCache(true);
      } else {
        setError(err as Error);
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [moduleId, queryKey, fetcher, ttl, enabled, options?.fallbackData]);

  useEffect(() => {
    // Check cache first
    const cached = dependencyCache.get<T>(moduleId, queryKey);
    if (cached) {
      setData(cached.data);
      setIsFromCache(true);
    }
    fetchData();
  }, [fetchData]);

  const invalidate = useCallback(() => {
    dependencyCache.invalidate(moduleId, queryKey);
    fetchData();
  }, [moduleId, queryKey, fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, isFromCache, isLoading, error, invalidate, refresh };
}
