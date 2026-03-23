import { Coins, TrendingUp, AlertTriangle, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** @deprecated Credit balances are deprecated. Use subscription model instead. */
interface ModuleCreditBalanceData {
  credits_total: number;
  credits_used: number;
  credits_remaining: number;
  period_start: string;
  period_end: string;
}

interface ModuleCreditBalanceProps {
  balance: ModuleCreditBalanceData | null;
  isLoading?: boolean;
  onPurchaseCredits?: () => void;
  compact?: boolean;
  className?: string;
}

/** @deprecated This component is kept for backward compatibility. */
export function ModuleCreditBalance({
  balance,
  isLoading,
  onPurchaseCredits,
  compact = false,
  className,
}: ModuleCreditBalanceProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className={compact ? "pb-2" : undefined}>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  if (!balance) {
    return (
      <Card className={className}>
        <CardContent className="py-6 text-center text-muted-foreground">
          <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Módulo com subscrição activa — sem créditos necessários</p>
        </CardContent>
      </Card>
    );
  }

  const usagePercentage = balance.credits_total > 0
    ? Math.round((balance.credits_used / balance.credits_total) * 100)
    : 0;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = balance.credits_remaining <= 0;

  const getStatusColor = () => {
    if (isAtLimit) return "text-destructive";
    if (isNearLimit) return "text-warning";
    return "text-primary";
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 p-3 rounded-lg border bg-card", className)}>
        <div className={cn("p-2 rounded-full", isAtLimit ? "bg-destructive/10" : "bg-primary/10")}>
          <Coins className={cn("h-4 w-4", getStatusColor())} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium truncate">Créditos</span>
            <span className={cn("text-sm font-bold", getStatusColor())}>
              {balance.credits_remaining.toLocaleString()}
            </span>
          </div>
          <Progress value={usagePercentage} className="h-1.5" />
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="py-6 text-center text-muted-foreground">
        <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Sistema de créditos descontinuado</p>
        <p className="text-xs mt-1">Utilize o modelo de subscrição</p>
      </CardContent>
    </Card>
  );
}
