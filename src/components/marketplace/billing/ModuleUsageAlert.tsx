import { AlertTriangle, Zap, X, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ModuleUsageAlertProps {
  usagePercentage: number;
  creditsRemaining: number;
  creditsTotal: number;
  moduleName?: string;
  onPurchaseCredits?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ModuleUsageAlert({
  usagePercentage,
  creditsRemaining,
  creditsTotal,
  moduleName,
  onPurchaseCredits,
  onDismiss,
  className,
}: ModuleUsageAlertProps) {
  const isAtLimit = creditsRemaining <= 0;
  const isCritical = usagePercentage >= 95;
  const isWarning = usagePercentage >= 80 && !isCritical;

  // Don't show if usage is below warning threshold
  if (usagePercentage < 80) return null;

  const getAlertVariant = () => {
    if (isAtLimit || isCritical) return "destructive";
    return "default";
  };

  const getIcon = () => {
    if (isAtLimit) return <AlertTriangle className="h-5 w-5" />;
    if (isCritical) return <AlertTriangle className="h-5 w-5" />;
    return <TrendingUp className="h-5 w-5" />;
  };

  const getTitle = () => {
    if (isAtLimit) return "Limite de créditos atingido";
    if (isCritical) return "Créditos quase esgotados";
    return "Uso elevado de créditos";
  };

  const getMessage = () => {
    const moduleText = moduleName ? ` do ${moduleName}` : "";
    
    if (isAtLimit) {
      return `Os créditos${moduleText} foram esgotados. Compra mais créditos para continuar a usar as funcionalidades.`;
    }
    if (isCritical) {
      return `Restam apenas ${creditsRemaining.toLocaleString()} créditos${moduleText}. Considera comprar mais para evitar interrupções.`;
    }
    return `Já utilizaste ${usagePercentage}% dos créditos${moduleText} este período.`;
  };

  return (
    <Alert 
      variant={getAlertVariant()} 
      className={cn(
        "relative",
        isWarning && "border-warning bg-warning/10",
        className
      )}
    >
      {onDismiss && !isAtLimit && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      
      <div className="flex items-start gap-3">
        <div className={cn(
          "mt-0.5",
          isAtLimit || isCritical ? "text-destructive" : "text-warning"
        )}>
          {getIcon()}
        </div>
        
        <div className="flex-1 space-y-3">
          <div>
            <AlertTitle className="mb-1">{getTitle()}</AlertTitle>
            <AlertDescription>{getMessage()}</AlertDescription>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <Progress 
              value={Math.min(usagePercentage, 100)} 
              className={cn(
                "h-2",
                (isAtLimit || isCritical) && "[&>div]:bg-destructive",
                isWarning && "[&>div]:bg-warning"
              )}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{(creditsTotal - creditsRemaining).toLocaleString()} usados</span>
              <span>{creditsTotal.toLocaleString()} total</span>
            </div>
          </div>

          {/* Action button */}
          {onPurchaseCredits && (
            <Button 
              size="sm" 
              variant={isAtLimit || isCritical ? "default" : "outline"}
              onClick={onPurchaseCredits}
              className="mt-2"
            >
              <Zap className="h-4 w-4 mr-2" />
              {isAtLimit ? "Comprar Créditos Agora" : "Comprar Mais Créditos"}
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}
