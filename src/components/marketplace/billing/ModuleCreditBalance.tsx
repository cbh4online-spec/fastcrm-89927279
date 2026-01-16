import { Coins, TrendingUp, AlertTriangle, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ModuleCreditBalance as CreditBalanceType } from "@/hooks/useModuleBilling";

interface ModuleCreditBalanceProps {
  balance: CreditBalanceType | null;
  isLoading?: boolean;
  onPurchaseCredits?: () => void;
  compact?: boolean;
  className?: string;
}

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
          <p className="text-sm">Sem dados de créditos</p>
        </CardContent>
      </Card>
    );
  }

  const usagePercentage = Math.round(
    (balance.credits_used / balance.credits_total) * 100
  );
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = balance.credits_remaining <= 0;
  const isCritical = usagePercentage >= 95;

  const getStatusColor = () => {
    if (isAtLimit || isCritical) return "text-destructive";
    if (isNearLimit) return "text-warning";
    return "text-primary";
  };

  const getProgressColor = () => {
    if (isAtLimit || isCritical) return "bg-destructive";
    if (isNearLimit) return "bg-warning";
    return "bg-primary";
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
        {isAtLimit && onPurchaseCredits && (
          <Button size="sm" variant="outline" onClick={onPurchaseCredits}>
            <Zap className="h-3 w-3 mr-1" />
            Comprar
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Balanço de Créditos
          </CardTitle>
          {isNearLimit && !isAtLimit && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Perto do limite
            </Badge>
          )}
          {isAtLimit && (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Limite atingido
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main balance display */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold tracking-tight">
              {balance.credits_remaining.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">créditos disponíveis</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Incluídos no plano</p>
            <p className="text-lg font-semibold">
              {balance.credits_total.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Usage progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Utilização este período</span>
            <span className={cn("font-medium", getStatusColor())}>
              {usagePercentage}%
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={Math.min(usagePercentage, 100)} 
              className="h-2"
            />
            <div 
              className={cn(
                "absolute top-0 h-full rounded-full transition-all",
                getProgressColor()
              )} 
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{balance.credits_used.toLocaleString()} usados</span>
            <span>de {balance.credits_total.toLocaleString()}</span>
          </div>
        </div>

        {/* Period info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
          <TrendingUp className="h-4 w-4" />
          <span>
            Período: {new Date(balance.period_start).toLocaleDateString("pt-PT")} -{" "}
            {new Date(balance.period_end).toLocaleDateString("pt-PT")}
          </span>
        </div>

        {/* Purchase button */}
        {onPurchaseCredits && (
          <Button 
            onClick={onPurchaseCredits} 
            className="w-full"
            variant={isAtLimit ? "default" : "outline"}
          >
            <Zap className="h-4 w-4 mr-2" />
            {isAtLimit ? "Comprar Créditos Agora" : "Comprar Mais Créditos"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
