import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  TrendingUp, 
  Moon, 
  AlertCircle, 
  Clock,
  ArrowRight,
  ChevronRight,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import type { ActivationAlert } from "@/types/sjActivation";
import { PRIORITY_CONFIG } from "@/types/sjActivation";

interface ActivationAlertsCardProps {
  alerts: ActivationAlert[];
  maxItems?: number;
}

const ALERT_TYPE_CONFIG = {
  ready_for_upsell: { 
    label: "Upsell", 
    icon: TrendingUp, 
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30"
  },
  cooling_period_ended: { 
    label: "Pronto", 
    icon: Clock, 
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30"
  },
  dormant_alumni: { 
    label: "Adormecido", 
    icon: Moon, 
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30"
  },
  lead_stale: { 
    label: "Lead Parado", 
    icon: AlertCircle, 
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30"
  },
  follow_up_overdue: { 
    label: "Atrasado", 
    icon: Clock, 
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30"
  },
  high_value_inactive: { 
    label: "Alto Valor", 
    icon: Zap, 
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30"
  },
};

export function ActivationAlertsCard({ alerts, maxItems = 10 }: ActivationAlertsCardProps) {
  const displayedAlerts = alerts.slice(0, maxItems);
  const urgentCount = alerts.filter(a => a.priority === 'urgent').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            Alertas de Ativação
          </CardTitle>
          <div className="flex items-center gap-2">
            {urgentCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5">
                {urgentCount} urgentes
              </Badge>
            )}
            <Badge variant="secondary">
              {alerts.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[400px]">
          {displayedAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm font-medium">Sem alertas pendentes</p>
              <p className="text-xs">Tudo em dia! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedAlerts.map((alert) => {
                const typeConfig = ALERT_TYPE_CONFIG[alert.type];
                const priorityConfig = PRIORITY_CONFIG[alert.priority];
                const TypeIcon = typeConfig?.icon || Bell;
                
                return (
                  <Link 
                    key={alert.id} 
                    to={`/dashboard/student-journey/profiles/${alert.profile.id}`}
                    className="block"
                  >
                    <div className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group",
                      alert.priority === 'urgent' && "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20"
                    )}>
                      {/* Icon */}
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        typeConfig?.bgColor || "bg-muted"
                      )}>
                        <TypeIcon className={cn("h-4 w-4", typeConfig?.color || "text-muted-foreground")} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-sm truncate">{alert.profile.full_name}</p>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] px-1.5 py-0 border-0 shrink-0",
                              priorityConfig.bgColor, 
                              priorityConfig.color
                            )}
                          >
                            {priorityConfig.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{alert.message}</p>
                        <p className="text-xs text-primary mt-1 flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          {alert.suggestedAction}
                        </p>
                      </div>
                      
                      {/* Arrow */}
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-2" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
