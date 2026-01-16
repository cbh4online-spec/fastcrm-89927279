import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrialStatus } from "@/hooks/useModuleTrial";

interface TrialUsageCounterProps {
  status: TrialStatus | null;
  onUpgrade: () => void;
  className?: string;
}

export function TrialUsageCounter({ status, onUpgrade, className }: TrialUsageCounterProps) {
  if (!status || !status.installed) {
    return null;
  }

  // Paid user - show success state
  if (status.is_paid) {
    return (
      <div className={cn("p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Plano Ativo</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Utilizações ilimitadas</p>
            </div>
          </div>
          <Badge className="bg-emerald-500 hover:bg-emerald-600">Ativo</Badge>
        </div>
      </div>
    );
  }

  // Trial user
  if (status.is_trial) {
    const usagePercent = status.usage_percent || 0;
    const usesRemaining = status.uses_remaining;
    const usesLimit = status.uses_limit || 0;
    const usesConsumed = status.uses_consumed || 0;
    const isLow = usagePercent >= 70;
    const isCritical = usagePercent >= 90;
    const isExhausted = usesRemaining <= 0;

    return (
      <div className={cn(
        "p-4 rounded-xl border transition-all",
        isCritical ? "bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/50" :
        isLow ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50" :
        "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50",
        className
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isCritical ? (
              <AlertTriangle className={cn(
                "w-5 h-5",
                isCritical ? "text-red-500" : "text-amber-500"
              )} />
            ) : (
              <Zap className="w-5 h-5 text-blue-500" />
            )}
            <span className={cn(
              "text-sm font-medium",
              isCritical ? "text-red-700 dark:text-red-300" :
              isLow ? "text-amber-700 dark:text-amber-300" :
              "text-blue-700 dark:text-blue-300"
            )}>
              Trial Gratuito
            </span>
          </div>
          <Badge variant="outline" className={cn(
            isCritical ? "bg-red-100 text-red-700 border-red-200" :
            isLow ? "bg-amber-100 text-amber-700 border-amber-200" :
            "bg-blue-100 text-blue-700 border-blue-200"
          )}>
            {usesRemaining} de {usesLimit}
          </Badge>
        </div>

        <Progress 
          value={usagePercent} 
          className={cn(
            "h-2 mb-3",
            isCritical ? "[&>div]:bg-red-500" :
            isLow ? "[&>div]:bg-amber-500" :
            "[&>div]:bg-blue-500"
          )}
        />

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {isExhausted ? (
              <span className="text-red-600 font-medium">Trial esgotado</span>
            ) : (
              <span>{usesConsumed} utilizações feitas</span>
            )}
          </div>
          
          {status.days_remaining !== null && status.days_remaining <= 7 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {status.days_remaining === 0 ? "Último dia" : `${status.days_remaining}d restantes`}
            </div>
          )}
        </div>

        {(isLow || isExhausted) && (
          <Button 
            size="sm" 
            className={cn(
              "w-full mt-3",
              isCritical ? "bg-red-600 hover:bg-red-700" :
              "bg-amber-600 hover:bg-amber-700"
            )}
            onClick={onUpgrade}
          >
            <Zap className="w-4 h-4 mr-2" />
            {isExhausted ? "Ativar Módulo" : "Fazer Upgrade"}
          </Button>
        )}
      </div>
    );
  }

  // Expired
  if (status.status === "expired") {
    return (
      <div className={cn("p-4 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/50", className)}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            Trial Expirado
          </span>
        </div>
        <p className="text-xs text-red-600 dark:text-red-400 mb-3">
          O teu trial terminou. Ativa o módulo para continuar a usar.
        </p>
        <Button 
          size="sm" 
          className="w-full bg-red-600 hover:bg-red-700"
          onClick={onUpgrade}
        >
          <Zap className="w-4 h-4 mr-2" />
          Ativar Módulo
        </Button>
      </div>
    );
  }

  return null;
}
