import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface QuotaIndicatorProps {
  used: number;
  total: number;
  extraCredits?: number;
  isFounder?: boolean;
  className?: string;
}

export function QuotaIndicator({ used, total, extraCredits = 0, isFounder, className }: QuotaIndicatorProps) {
  const percent = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const remaining = Math.max(0, total - used);

  const barColor = percent >= 100
    ? "bg-destructive"
    : percent >= 75
      ? "bg-yellow-500"
      : "bg-primary";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Matches este mês
          {isFounder && (
            <span className="ml-1.5 text-xs font-medium text-amber-600">Fundador</span>
          )}
        </span>
        <span className="font-semibold text-foreground">
          {used}/{total}
        </span>
      </div>
      <Progress
        value={percent}
        className="h-2"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{remaining} restante{remaining !== 1 ? "s" : ""}</span>
        {extraCredits > 0 && (
          <span>+{extraCredits} crédito{extraCredits !== 1 ? "s" : ""} extra</span>
        )}
      </div>
    </div>
  );
}
