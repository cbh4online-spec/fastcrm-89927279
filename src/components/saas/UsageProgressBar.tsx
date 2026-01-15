import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Infinity } from "lucide-react";

interface UsageProgressBarProps {
  label: string;
  current: number;
  limit: number;
  icon?: React.ReactNode;
  showPercent?: boolean;
  compact?: boolean;
  className?: string;
}

export function UsageProgressBar({
  label,
  current,
  limit,
  icon,
  showPercent = true,
  compact = false,
  className,
}: UsageProgressBarProps) {
  // Handle unlimited (-1) case
  const isUnlimited = limit === -1;
  const percent = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isWarning = percent >= 80 && percent < 90;
  const isCritical = percent >= 90 && percent < 100;
  const isAtLimit = percent >= 100;

  const getProgressColor = () => {
    if (isUnlimited) return "bg-emerald-500";
    if (isAtLimit) return "bg-destructive";
    if (isCritical) return "bg-amber-500";
    if (isWarning) return "bg-amber-400";
    return "bg-primary";
  };

  // Microcopy baseado nas diretrizes UX
  const getStatusMessage = () => {
    if (isUnlimited) return null;
    if (isAtLimit) return "Atingiste o limite do teu plano.";
    if (isCritical) return "Estás quase a atingir o limite.";
    if (isWarning) return "Tens usado bastante este recurso.";
    return null;
  };

  const getStatusBadge = () => {
    if (isUnlimited) {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
          <Infinity className="w-3 h-3" />
          Ilimitado
        </Badge>
      );
    }
    if (isAtLimit) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          Limite atingido
        </Badge>
      );
    }
    if (isCritical) {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
          <AlertTriangle className="w-3 h-3" />
          A {Math.round(percent)}%
        </Badge>
      );
    }
    if (isWarning) {
      return (
        <Badge variant="outline" className="bg-amber-400/10 text-amber-600 border-amber-400/30 gap-1">
          <TrendingUp className="w-3 h-3" />
          A {Math.round(percent)}%
        </Badge>
      );
    }
    return null;
  };

  if (compact) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5">
            {icon}
            {label}
          </span>
          <span className={cn(
            "font-medium",
            isAtLimit && "text-destructive",
            (isCritical || isWarning) && "text-amber-600"
          )}>
            {isUnlimited ? "∞" : `${current}/${limit}`}
          </span>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full transition-all", getProgressColor())}
            style={{ width: isUnlimited ? "100%" : `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <span className="text-sm font-medium">{label}</span>
          {getStatusBadge()}
        </div>
        <span className={cn(
          "text-sm",
          isAtLimit && "text-destructive font-medium",
          (isCritical || isWarning) && "text-amber-600 font-medium",
          !isAtLimit && !isCritical && !isWarning && "text-muted-foreground"
        )}>
          {isUnlimited ? (
            <span className="text-emerald-600">Ilimitado</span>
          ) : (
            <>
              <span className="font-medium">{current.toLocaleString()}</span>
              <span className="text-muted-foreground"> / {limit.toLocaleString()}</span>
              {showPercent && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({Math.round(percent)}%)
                </span>
              )}
            </>
          )}
        </span>
      </div>
      <Progress 
        value={isUnlimited ? 100 : percent} 
        className={cn(
          "h-2",
          isAtLimit && "[&>div]:bg-destructive",
          isCritical && "[&>div]:bg-amber-500",
          isWarning && "[&>div]:bg-amber-400",
          isUnlimited && "[&>div]:bg-emerald-500"
        )}
      />
      {/* Microcopy contextual */}
      {getStatusMessage() && (
        <p className={cn(
          "text-xs",
          isAtLimit && "text-destructive",
          (isCritical || isWarning) && "text-amber-600"
        )}>
          {getStatusMessage()}
        </p>
      )}
    </div>
  );
}
