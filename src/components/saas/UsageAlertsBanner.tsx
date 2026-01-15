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
  Bell 
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

export function UsageAlertsBanner({ 
  className, 
  compact = false,
  maxAlerts = 3 
}: UsageAlertsBannerProps) {
  const { alerts, dismissAlert } = useSaasManagement();
  const { createCheckout, plan } = useSubscription();
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

  const getAlertIcon = (alert: UsageAlert) => {
    if (alert.threshold_percent >= 100) {
      return <AlertTriangle className="w-4 h-4 text-destructive" />;
    }
    if (alert.threshold_percent >= 90) {
      return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    }
    return <TrendingUp className="w-4 h-4 text-amber-500" />;
  };

  const getAlertColor = (alert: UsageAlert) => {
    if (alert.threshold_percent >= 100) {
      return "border-destructive/50 bg-destructive/5";
    }
    if (alert.threshold_percent >= 90) {
      return "border-amber-500/50 bg-amber-500/5";
    }
    return "border-amber-500/30 bg-amber-500/5";
  };

  const getSuggestedPlan = () => {
    if (plan === "free") return "basic";
    if (plan === "basic") return "pro";
    return "agency";
  };

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {visibleAlerts.map((alert) => (
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
                {alert.message}
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
        ))}
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
                <h4 className="font-medium text-foreground">Alertas de Utilização</h4>
                <p className="text-sm text-muted-foreground">
                  {alerts.length} alerta{alerts.length !== 1 ? "s" : ""} ativo{alerts.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => createCheckout(getSuggestedPlan() as "basic" | "pro" | "agency")}
                className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                <Crown className="w-3.5 h-3.5" />
                Fazer Upgrade
              </Button>
            </div>

            <div className="space-y-2">
              {visibleAlerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg border",
                    getAlertColor(alert),
                    dismissingIds.has(alert.id) && "opacity-50"
                  )}
                >
                  {getAlertIcon(alert)}
                  <span className="flex-1 text-sm">{alert.message}</span>
                  <Badge variant="outline" className="text-xs">
                    {alert.threshold_percent}%
                  </Badge>
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
              ))}
            </div>

            {hasMoreAlerts && (
              <Button variant="ghost" size="sm" className="w-full gap-1 text-muted-foreground">
                Ver todos os {alerts.length} alertas
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
