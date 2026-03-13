import { useDependencyHealth, type HealthStatus } from "@/hooks/useDependencyHealth";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const healthConfig: Record<HealthStatus, { label: string; color: string; pulse: boolean }> = {
  healthy: { label: "Todos os módulos operacionais", color: "text-green-500", pulse: false },
  degraded: { label: "Alguns módulos degradados", color: "text-amber-500", pulse: true },
  critical: { label: "Módulos críticos indisponíveis", color: "text-destructive", pulse: true },
};

export function DependencyHealthIndicator({ className }: { className?: string }) {
  const { overallHealth, modules } = useDependencyHealth();
  const config = healthConfig[overallHealth];
  const problemModules = modules.filter((m) => m.state !== "CLOSED");

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1.5 cursor-default", config.color, className)}>
            <Activity className={cn("h-4 w-4", config.pulse && "animate-pulse")} />
            <span className="text-xs font-medium hidden sm:inline">{overallHealth === "healthy" ? "OK" : overallHealth}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-semibold mb-1">{config.label}</p>
          {problemModules.length > 0 && (
            <ul className="text-xs space-y-0.5">
              {problemModules.map((m) => (
                <li key={m.moduleId}>
                  {m.displayName}: {m.state} ({m.failureCount} falhas)
                </li>
              ))}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
