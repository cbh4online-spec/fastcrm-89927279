import { cn } from "@/lib/utils";
import { CircleAlert, CircleCheck, CircleDot } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { CircuitState } from "@/services/circuit-breaker";

interface CircuitBreakerBadgeProps {
  state: CircuitState;
  moduleId: string;
  className?: string;
}

const stateConfig: Record<CircuitState, { icon: typeof CircleCheck; label: string; color: string }> = {
  CLOSED: { icon: CircleCheck, label: "Operacional", color: "text-green-500" },
  HALF_OPEN: { icon: CircleDot, label: "A testar", color: "text-amber-500" },
  OPEN: { icon: CircleAlert, label: "Indisponível", color: "text-destructive" },
};

export function CircuitBreakerBadge({ state, moduleId, className }: CircuitBreakerBadgeProps) {
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1 text-xs font-medium", config.color, className)}>
            <Icon className="h-3.5 w-3.5" />
            {config.label}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Módulo: {moduleId}</p>
          <p>Estado: {config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
