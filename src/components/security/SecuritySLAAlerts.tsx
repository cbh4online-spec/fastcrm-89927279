import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Bell, ArrowRight } from "lucide-react";
import { format, isPast, isToday, differenceInDays, differenceInHours, addDays } from "date-fns";

interface Visit {
  id: string;
  scheduled_at: string;
  visit_status: string;
  security_systems?: {
    system_type?: string;
    security_installation_sites?: { site_name?: string };
  };
  security_maintenance_plans?: { frequency_type?: string };
}

interface Plan {
  id: string;
  next_visit_at?: string;
  frequency_type?: string;
  status?: string;
  security_systems?: {
    system_type?: string;
    security_installation_sites?: { site_name?: string };
  };
  security_contracts?: { contract_type?: string; contract_status?: string };
}

interface Props {
  visits: Visit[];
  plans: Plan[];
  onVisitClick: (id: string) => void;
}

interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  visitId?: string;
  planId?: string;
}

export function SecuritySLAAlerts({ visits, plans, onVisitClick }: Props) {
  const now = new Date();
  const alerts: Alert[] = [];

  // Critical: Overdue visits (past scheduled date, still in scheduled)
  visits
    .filter((v) => v.visit_status === "scheduled" && v.scheduled_at && isPast(new Date(v.scheduled_at)) && !isToday(new Date(v.scheduled_at)))
    .forEach((v) => {
      const sys = v.security_systems as any;
      const site = sys?.security_installation_sites as any;
      const daysLate = differenceInDays(now, new Date(v.scheduled_at));
      alerts.push({
        id: `overdue-${v.id}`,
        severity: daysLate > 7 ? "critical" : "warning",
        title: `Visita em atraso: ${site?.site_name || "Visita"}`,
        description: `${daysLate} dia${daysLate !== 1 ? "s" : ""} de atraso · ${sys?.system_type || "—"} · Agendada para ${format(new Date(v.scheduled_at), "dd/MM/yyyy")}`,
        visitId: v.id,
      });
    });

  // Warning: Visits today still not started
  visits
    .filter((v) => v.visit_status === "scheduled" && v.scheduled_at && isToday(new Date(v.scheduled_at)))
    .forEach((v) => {
      const sys = v.security_systems as any;
      const site = sys?.security_installation_sites as any;
      const hoursUntil = differenceInHours(new Date(v.scheduled_at), now);
      alerts.push({
        id: `today-${v.id}`,
        severity: hoursUntil <= 0 ? "warning" : "info",
        title: `Visita hoje: ${site?.site_name || "Visita"}`,
        description: `${format(new Date(v.scheduled_at), "HH:mm")} · ${sys?.system_type || "—"}${hoursUntil <= 0 ? " · Hora já passou!" : ""}`,
        visitId: v.id,
      });
    });

  // Warning: Visits in next 48h
  visits
    .filter((v) => {
      if (v.visit_status !== "scheduled" || !v.scheduled_at) return false;
      const d = new Date(v.scheduled_at);
      return !isPast(d) && !isToday(d) && d <= addDays(now, 2);
    })
    .forEach((v) => {
      const sys = v.security_systems as any;
      const site = sys?.security_installation_sites as any;
      alerts.push({
        id: `upcoming-${v.id}`,
        severity: "info",
        title: `Visita próxima: ${site?.site_name || "Visita"}`,
        description: `${format(new Date(v.scheduled_at), "dd/MM HH:mm")} · ${sys?.system_type || "—"}`,
        visitId: v.id,
      });
    });

  // Warning: Plans with overdue next_visit_at and no scheduled visit
  const scheduledSystemIds = new Set(
    visits.filter((v) => v.visit_status === "scheduled" || v.visit_status === "in_progress").map((v) => (v as any).system_id)
  );

  plans
    .filter((p) => p.status === "active" && p.next_visit_at && isPast(new Date(p.next_visit_at)))
    .forEach((p) => {
      const sys = p.security_systems as any;
      const site = sys?.security_installation_sites as any;
      const daysLate = differenceInDays(now, new Date(p.next_visit_at!));
      if (daysLate > 0) {
        alerts.push({
          id: `plan-overdue-${p.id}`,
          severity: daysLate > 14 ? "critical" : "warning",
          title: `SLA em risco: ${site?.site_name || "Plano"}`,
          description: `Próxima visita deveria ser ${format(new Date(p.next_visit_at!), "dd/MM/yyyy")} (${daysLate}d atraso) · ${p.frequency_type || "—"}`,
          planId: p.id,
        });
      }
    });

  // Sort: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <Card className={criticalCount > 0 ? "border-destructive/50" : warningCount > 0 ? "border-yellow-500/50" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas SLA
            {criticalCount > 0 && <Badge variant="destructive" className="text-[10px]">{criticalCount} crítico{criticalCount > 1 ? "s" : ""}</Badge>}
            {warningCount > 0 && <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 text-[10px]">{warningCount} aviso{warningCount > 1 ? "s" : ""}</Badge>}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.slice(0, 8).map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-2.5 rounded-md border text-sm ${
              alert.severity === "critical"
                ? "bg-destructive/5 border-destructive/20"
                : alert.severity === "warning"
                ? "bg-yellow-500/5 border-yellow-500/20"
                : "bg-muted/30 border-border"
            }`}
          >
            {alert.severity === "critical" ? (
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            ) : alert.severity === "warning" ? (
              <Clock className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            ) : (
              <Bell className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs">{alert.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
            </div>
            {alert.visitId && (
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => onVisitClick(alert.visitId!)}>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
        {alerts.length > 8 && (
          <p className="text-xs text-muted-foreground text-center pt-1">+{alerts.length - 8} alertas adicionais</p>
        )}
      </CardContent>
    </Card>
  );
}
