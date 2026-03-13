import { useState, useEffect } from "react";
import { circuitBreaker, type CircuitState } from "@/services/circuit-breaker";
import { dependencyCache } from "@/services/dependency-cache";
import { CRITICAL_MODULES } from "@/config/critical-modules";

export type HealthStatus = "healthy" | "degraded" | "critical";

interface ModuleHealth {
  moduleId: string;
  displayName: string;
  state: CircuitState;
  failureCount: number;
  dependentCount: number;
  cacheHits: number;
  cacheMisses: number;
  cacheEntries: number;
}

interface DependencyHealth {
  overallHealth: HealthStatus;
  modules: ModuleHealth[];
  totalCacheSize: number;
}

export function useDependencyHealth(): DependencyHealth {
  const [health, setHealth] = useState<DependencyHealth>({
    overallHealth: "healthy",
    modules: [],
    totalCacheSize: 0,
  });

  useEffect(() => {
    function compute() {
      const modules: ModuleHealth[] = Object.entries(CRITICAL_MODULES).map(
        ([moduleId, config]) => {
          const cbState = circuitBreaker.getState(moduleId);
          const cacheMetrics = dependencyCache.getModuleMetrics(moduleId);
          return {
            moduleId,
            displayName: config.displayName,
            state: cbState.state,
            failureCount: cbState.failureCount,
            dependentCount: config.dependents.length,
            cacheHits: cacheMetrics.hits,
            cacheMisses: cacheMetrics.misses,
            cacheEntries: 0,
          };
        }
      );

      const openCount = modules.filter((m) => m.state === "OPEN").length;
      const halfOpenCount = modules.filter((m) => m.state === "HALF_OPEN").length;

      let overallHealth: HealthStatus = "healthy";
      if (openCount > 0) overallHealth = "critical";
      else if (halfOpenCount > 0) overallHealth = "degraded";

      setHealth({
        overallHealth,
        modules,
        totalCacheSize: dependencyCache.getCacheSize(),
      });
    }

    compute();

    // Re-compute on state changes
    const unsub = circuitBreaker.onStateChange(() => compute());
    const interval = setInterval(compute, 10000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  return health;
}
