import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Zap, Crown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrialStatus } from "@/hooks/useModuleTrial";

interface TrialStatusBadgeProps {
  status: TrialStatus | null;
  variant?: "compact" | "full" | "sidebar";
  className?: string;
}

export function TrialStatusBadge({ status, variant = "compact", className }: TrialStatusBadgeProps) {
  if (!status || !status.installed) {
    return null;
  }

  // Paid user
  if (status.is_paid) {
    if (variant === "sidebar") {
      return (
        <Badge variant="outline" className={cn("text-xs bg-emerald-500/10 text-emerald-600 border-emerald-200", className)}>
          <Crown className="w-3 h-3 mr-1" />
          Ativo
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className={cn("bg-emerald-50 text-emerald-700 border-emerald-200", className)}>
        <Crown className="w-3 h-3 mr-1" />
        Plano Ativo
      </Badge>
    );
  }

  // Trial user
  if (status.is_trial) {
    const usagePercent = status.usage_percent || 0;
    const usesRemaining = status.uses_remaining;
    const isLow = usagePercent >= 70;
    const isCritical = usagePercent >= 90;

    if (variant === "sidebar") {
      return (
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs",
            isCritical ? "bg-red-500/10 text-red-600 border-red-200" :
            isLow ? "bg-amber-500/10 text-amber-600 border-amber-200" :
            "bg-blue-500/10 text-blue-600 border-blue-200",
            className
          )}
        >
          <Zap className="w-3 h-3 mr-1" />
          {usesRemaining}
        </Badge>
      );
    }

    if (variant === "full") {
      return (
        <div className={cn("space-y-2", className)}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Trial</span>
            <Badge 
              variant="outline" 
              className={cn(
                isCritical ? "bg-red-50 text-red-700 border-red-200" :
                isLow ? "bg-amber-50 text-amber-700 border-amber-200" :
                "bg-blue-50 text-blue-700 border-blue-200"
              )}
            >
              {usesRemaining} de {status.uses_limit} restantes
            </Badge>
          </div>
          <Progress 
            value={usagePercent} 
            className={cn(
              "h-2",
              isCritical ? "[&>div]:bg-red-500" :
              isLow ? "[&>div]:bg-amber-500" :
              "[&>div]:bg-blue-500"
            )}
          />
          {status.days_remaining !== null && status.days_remaining <= 3 && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <Clock className="w-3 h-3" />
              {status.days_remaining === 0 ? "Último dia!" : `${status.days_remaining} dias restantes`}
            </div>
          )}
        </div>
      );
    }

    // Compact variant
    return (
      <Badge 
        variant="outline" 
        className={cn(
          isCritical ? "bg-red-50 text-red-700 border-red-200" :
          isLow ? "bg-amber-50 text-amber-700 border-amber-200" :
          "bg-blue-50 text-blue-700 border-blue-200",
          className
        )}
      >
        {isCritical && <AlertTriangle className="w-3 h-3 mr-1" />}
        <Zap className="w-3 h-3 mr-1" />
        {usesRemaining}/{status.uses_limit}
      </Badge>
    );
  }

  // Expired
  if (status.status === "expired") {
    return (
      <Badge variant="outline" className={cn("bg-red-50 text-red-700 border-red-200", className)}>
        <AlertTriangle className="w-3 h-3 mr-1" />
        Expirado
      </Badge>
    );
  }

  return null;
}
