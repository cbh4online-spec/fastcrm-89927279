import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  ChevronRight,
  X,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import {
  useSmartAlerts,
  useDismissAlert,
  useActionAlert,
  ALERT_CONFIGS,
  SmartAlert,
} from "@/hooks/useSmartAlerts";

interface DashboardSmartAlertsProps {
  className?: string;
  maxAlerts?: number;
}

export function DashboardSmartAlerts({
  className,
  maxAlerts = 5,
}: DashboardSmartAlertsProps) {
  const navigate = useNavigate();
  const { data: alerts, isLoading } = useSmartAlerts(maxAlerts);
  const dismissAlert = useDismissAlert();
  const actionAlert = useActionAlert();

  const handleAction = (alert: SmartAlert) => {
    actionAlert.mutate(alert.id);
    if (alert.action_url) {
      navigate(alert.action_url);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alertas Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alertas Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mb-3" />
            <p className="font-medium">Tudo em dia!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Nenhum alerta que exija ação
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group alerts by severity
  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const highAlerts = alerts.filter((a) => a.severity === "high");
  const otherAlerts = alerts.filter(
    (a) => a.severity === "medium" || a.severity === "low"
  );

  const sortedAlerts = [...criticalAlerts, ...highAlerts, ...otherAlerts];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alertas Inteligentes
            {alerts.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
          {criticalAlerts.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {criticalAlerts.length} crítico(s)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[300px]">
          <div className="divide-y px-4 pb-2">
            {sortedAlerts.map((alert) => {
              const config = ALERT_CONFIGS[alert.alert_type];
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "py-3 flex items-start gap-3 group",
                    alert.severity === "critical" && "bg-red-50/50 dark:bg-red-900/10 -mx-4 px-4"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0",
                      config.bgColor,
                      config.borderColor,
                      "border"
                    )}
                  >
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={cn("text-sm font-medium", config.color)}>
                          {alert.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {alert.description}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={() => dismissAlert.mutate(alert.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.created_at), {
                          addSuffix: true,
                          locale: pt,
                        })}
                      </span>
                      {alert.action_label && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs gap-1 -mr-2"
                          onClick={() => handleAction(alert)}
                        >
                          {alert.action_label}
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
