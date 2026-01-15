import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  TrendingUp, 
  X, 
  ChevronRight, 
  Crown,
  Bell,
  CreditCard
} from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useSaasManagement } from "@/hooks/useSaasManagement";
import { cn } from "@/lib/utils";
import type { UsageAlert } from "@/types/saas";

interface UsageAlertsBannerProps {
  className?: string;
  compact?: boolean;
  maxAlerts?: number;
}

// Microcopy baseado nas diretrizes UX
const getAlertMicrocopy = (alert: UsageAlert) => {
  const threshold = alert.threshold_percent;
  
  // Pagamento falhado - tratamento especial
  if (alert.alert_type === "payment_failed") {
    return {
      title: "Pagamento não concluído",
      message: "Atualiza o método de pagamento para evitar interrupções.",
      action: "Atualizar método de pagamento",
      isPayment: true,
    };
  }
  
  if (threshold >= 100) {
    return {
      title: "Limite atingido",
      message: "Atingiste o limite do teu plano. Faz upgrade para continuar sem interrupções.",
      action: "Fazer upgrade",
      isPayment: false,
    };
  }
  
  if (threshold >= 90) {
    return {
      title: "Quase no limite",
      message: "Estás quase a atingir o limite. Para não interromper o trabalho, considera um upgrade.",
      action: "Ver planos",
      isPayment: false,
    };
  }
  
  return {
    title: "A usar bastante",
    message: `Tens usado bastante este recurso. Estás a ${threshold}% do teu plano atual.`,
    action: "Ver planos",
    isPayment: false,
  };
};

export function UsageAlertsBanner({ 
  className, 
  compact = false,
  maxAlerts = 3 
}: UsageAlertsBannerProps) {
  const { alerts, dismissAlert } = useSaasManagement();
  const { createCheckout, openCustomerPortal, plan } = useSubscription();
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts.slice(0, maxAlerts);
  const hasMoreAlerts = alerts.length > maxAlerts;

  if (alerts.length === 0) {
    return null;
  }

  const handleDismiss = async (alertId: string) => {
    setDismissingIds(prev => new Set(prev).add(alertId));
    try {
      await dismissAlert.mutateAsync(alertId);
    } finally {
      setDismissingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const handleAction = (alert: UsageAlert) => {
    const microcopy = getAlertMicrocopy(alert);
    if (microcopy.isPayment) {
      openCustomerPortal();
    } else {
      const suggestedPlan = plan === "free" ? "basic" : plan === "basic" ? "pro" : "agency";
      createCheckout(suggestedPlan as "basic" | "pro" | "agency");
    }
  };

  const getAlertIcon = (alert: UsageAlert) => {
    if (alert.alert_type === "payment_failed") {
      return <CreditCard className="w-4 h-4 text-destructive" />;
    }
    if (alert.threshold_percent >= 100) {
      return <AlertTriangle className="w-4 h-4 text-destructive" />;
    }
    if (alert.threshold_percent >= 90) {
      return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    }
    return <TrendingUp className="w-4 h-4 text-amber-500" />;
  };

  const getAlertColor = (alert: UsageAlert) => {
    if (alert.alert_type === "payment_failed" || alert.threshold_percent >= 100) {
      return "border-destructive/50 bg-destructive/5";
    }
    if (alert.threshold_percent >= 90) {
      return "border-amber-500/50 bg-amber-500/5";
    }
    return "border-amber-500/30 bg-amber-500/5";
  };

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {visibleAlerts.map((alert) => {
          const microcopy = getAlertMicrocopy(alert);
          return (
            <Alert 
              key={alert.id} 
              className={cn(
                "py-2",
                getAlertColor(alert),
                dismissingIds.has(alert.id) && "opacity-50"
              )}
            >
              <div className="flex items-center gap-2">
                {getAlertIcon(alert)}
                <AlertDescription className="flex-1 text-xs">
                  {microcopy.message}
                </AlertDescription>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => handleDismiss(alert.id)}
                  disabled={dismissingIds.has(alert.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </Alert>
          );
        })}
      </div>
    );
  }

  return (
    <Card className={cn("border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5", className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground">Avisos Importantes</h4>
                <p className="text-sm text-muted-foreground">
                  Tens {alerts.length} aviso{alerts.length !== 1 ? "s" : ""} que requer{alerts.length === 1 ? "" : "em"} atenção
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {visibleAlerts.map((alert) => {
                const microcopy = getAlertMicrocopy(alert);
                return (
                  <div 
                    key={alert.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      getAlertColor(alert),
                      dismissingIds.has(alert.id) && "opacity-50"
                    )}
                  >
                    <div className="mt-0.5">
                      {getAlertIcon(alert)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{microcopy.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {microcopy.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleAction(alert)}
                        className={cn(
                          "gap-1",
                          microcopy.isPayment 
                            ? "bg-destructive hover:bg-destructive/90" 
                            : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                        )}
                      >
                        {microcopy.isPayment ? (
                          <CreditCard className="w-3.5 h-3.5" />
                        ) : (
                          <Crown className="w-3.5 h-3.5" />
                        )}
                        {microcopy.action}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDismiss(alert.id)}
                        disabled={dismissingIds.has(alert.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMoreAlerts && (
              <Button variant="ghost" size="sm" className="w-full gap-1 text-muted-foreground">
                Ver todos os {alerts.length} avisos
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
