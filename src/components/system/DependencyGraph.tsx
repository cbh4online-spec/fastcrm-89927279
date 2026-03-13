import { useMemo } from "react";
import { CRITICAL_MODULES } from "@/config/critical-modules";
import { useDependencyHealth } from "@/hooks/useDependencyHealth";
import { cn } from "@/lib/utils";
import { CircuitBreakerBadge } from "./CircuitBreakerBadge";
import type { CircuitState } from "@/services/circuit-breaker";

const stateColors: Record<CircuitState, string> = {
  CLOSED: "border-green-500/50 bg-green-500/5",
  HALF_OPEN: "border-amber-500/50 bg-amber-500/5",
  OPEN: "border-destructive/50 bg-destructive/5",
};

export function DependencyGraph() {
  const { modules } = useDependencyHealth();

  const moduleMap = useMemo(() => {
    const map: Record<string, { state: CircuitState; failureCount: number }> = {};
    modules.forEach((m) => {
      map[m.moduleId] = { state: m.state, failureCount: m.failureCount };
    });
    return map;
  }, [modules]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Object.entries(CRITICAL_MODULES).map(([moduleId, config]) => {
        const health = moduleMap[moduleId] ?? { state: "CLOSED" as CircuitState, failureCount: 0 };
        return (
          <div
            key={moduleId}
            className={cn(
              "rounded-xl border-2 p-4 space-y-3 transition-colors",
              stateColors[health.state]
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{config.displayName}</h3>
                <p className="text-xs text-muted-foreground">{moduleId}</p>
              </div>
              <CircuitBreakerBadge state={health.state} moduleId={moduleId} />
            </div>

            <div className="text-xs text-muted-foreground">
              <span className="font-medium">{config.dependents.length}</span> módulos dependentes
            </div>

            <div className="flex flex-wrap gap-1.5">
              {config.dependents.map((dep) => (
                <span
                  key={dep}
                  className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border"
                >
                  {dep}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
