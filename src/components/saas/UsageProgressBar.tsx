import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp } from "lucide-react";

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
  const isNearLimit = percent >= 80 && percent < 100;
  const isAtLimit = percent >= 100;

  const getProgressColor = () => {
    if (isUnlimited) return "bg-emerald-500";
    if (isAtLimit) return "bg-destructive";
    if (isNearLimit) return "bg-amber-500";
    return "bg-primary";
  };

  const getStatusBadge = () => {
    if (isUnlimited) {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
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
    if (isNearLimit) {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
          <TrendingUp className="w-3 h-3" />
          Quase no limite
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
            isNearLimit && "text-amber-600"
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
          isNearLimit && "text-amber-600 font-medium",
          !isAtLimit && !isNearLimit && "text-muted-foreground"
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
          isNearLimit && "[&>div]:bg-amber-500",
          isUnlimited && "[&>div]:bg-emerald-500"
        )}
      />
    </div>
  );
}
