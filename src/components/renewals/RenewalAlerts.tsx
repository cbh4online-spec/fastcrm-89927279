import { useNavigate } from "react-router-dom";
import { useRenewalAlerts, type RenewalAlert } from "@/hooks/useRenewalAlerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Calendar, Clock, Package, ArrowRight } from "lucide-react";

const ALERT_CONFIG: Record<RenewalAlert["type"], { icon: typeof AlertTriangle; label: string; color: string; badgeClass: string }> = {
  overdue: { icon: AlertTriangle, label: "Em Atraso", color: "text-red-600", badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  upcoming_7: { icon: Calendar, label: "Próx. 7 dias", color: "text-yellow-600", badgeClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  low_pack: { icon: Clock, label: "Pack Baixo", color: "text-orange-600", badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  expiring: { icon: Package, label: "A Expirar", color: "text-purple-600", badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
};

export function RenewalAlerts() {
  const navigate = useNavigate();
  const { data: alerts = [], isLoading } = useRenewalAlerts();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  const grouped = {
    overdue: alerts.filter(a => a.type === "overdue"),
    upcoming_7: alerts.filter(a => a.type === "upcoming_7"),
    low_pack: alerts.filter(a => a.type === "low_pack"),
    expiring: alerts.filter(a => a.type === "expiring"),
  };

  const hasAlerts = alerts.length > 0;

  if (!hasAlerts) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Alertas</h3>
      
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(grouped) as Array<RenewalAlert["type"]>).map(type => {
          const config = ALERT_CONFIG[type];
          const Icon = config.icon;
          const count = grouped[type].length;
          return (
            <Card key={type} className={count > 0 ? "border-l-4 border-l-current " + config.color : "opacity-50"}>
              <CardContent className="pt-3 pb-2 px-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    <span className="text-xs font-medium">{config.label}</span>
                  </div>
                  <span className={`text-lg font-bold ${count > 0 ? config.color : "text-muted-foreground"}`}>{count}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alert items (show max 8) */}
      {alerts.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {alerts.slice(0, 8).map(alert => {
                const config = ALERT_CONFIG[alert.type];
                const Icon = config.icon;
                return (
                  <div
                    key={alert.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/renewals/${alert.contractId}`)}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.companyName} · {alert.message}</p>
                    </div>
                    <Badge className={`text-[10px] shrink-0 border-0 ${config.badgeClass}`}>
                      {config.label}
                    </Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
