import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityMaintenancePlans, useSecurityMaintenanceVisits } from "@/hooks/security/useSecurityMaintenance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Calendar, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { format, isPast, isToday } from "date-fns";

const visitStatusIcon: Record<string, any> = {
  scheduled: Clock,
  in_progress: Wrench,
  completed: CheckCircle2,
  cancelled: AlertTriangle,
};

const visitStatusColor: Record<string, string> = {
  scheduled: "outline",
  in_progress: "default",
  completed: "secondary",
  cancelled: "destructive",
};

export default function SecurityMaintenancePage() {
  const { t } = useTranslation("security");
  const { plans, isLoading: plansLoading } = useSecurityMaintenancePlans();
  const { visits, isLoading: visitsLoading } = useSecurityMaintenanceVisits();

  const overdueVisits = visits.filter((v: any) => v.visit_status === "scheduled" && v.scheduled_at && isPast(new Date(v.scheduled_at)) && !isToday(new Date(v.scheduled_at)));
  const upcomingVisits = visits.filter((v: any) => v.visit_status === "scheduled" && v.scheduled_at && !isPast(new Date(v.scheduled_at)));
  const completedVisits = visits.filter((v: any) => v.visit_status === "completed");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Wrench className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">{t("maintenance")}</h1>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{plans.length}</p>
              <p className="text-xs text-muted-foreground">Planos Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{overdueVisits.length}</p>
              <p className="text-xs text-muted-foreground">Visitas em Atraso</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{upcomingVisits.length}</p>
              <p className="text-xs text-muted-foreground">Visitas Agendadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{completedVisits.length}</p>
              <p className="text-xs text-muted-foreground">Visitas Concluídas</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="visits">
          <TabsList>
            <TabsTrigger value="visits">Visitas</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
          </TabsList>

          <TabsContent value="visits" className="space-y-3 mt-4">
            {visitsLoading ? (
              <div className="text-center py-12 text-muted-foreground">A carregar...</div>
            ) : visits.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Nenhuma visita agendada</p></CardContent></Card>
            ) : (
              <>
                {/* Overdue first */}
                {overdueVisits.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Em Atraso ({overdueVisits.length})
                    </h3>
                    {overdueVisits.map((v: any) => <VisitCard key={v.id} visit={v} t={t} />)}
                  </div>
                )}
                {upcomingVisits.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Agendadas ({upcomingVisits.length})
                    </h3>
                    {upcomingVisits.map((v: any) => <VisitCard key={v.id} visit={v} t={t} />)}
                  </div>
                )}
                {completedVisits.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Concluídas ({completedVisits.length})
                    </h3>
                    {completedVisits.slice(0, 10).map((v: any) => <VisitCard key={v.id} visit={v} t={t} />)}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="plans" className="space-y-3 mt-4">
            {plansLoading ? (
              <div className="text-center py-12 text-muted-foreground">A carregar...</div>
            ) : plans.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Nenhum plano de manutenção</p></CardContent></Card>
            ) : (
              plans.map((p: any) => {
                const sys = p.security_systems as any;
                const site = sys?.security_installation_sites as any;
                return (
                  <Card key={p.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{site?.site_name || "Plano"}</p>
                        <p className="text-sm text-muted-foreground">
                          {p.frequency_type} · {sys?.system_type || "—"}
                          {p.next_visit_at && ` · Próxima: ${format(new Date(p.next_visit_at), "dd/MM/yyyy")}`}
                        </p>
                      </div>
                      <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function VisitCard({ visit, t }: { visit: any; t: any }) {
  const sys = visit.security_systems as any;
  const site = sys?.security_installation_sites as any;
  const isOverdue = visit.visit_status === "scheduled" && visit.scheduled_at && isPast(new Date(visit.scheduled_at)) && !isToday(new Date(visit.scheduled_at));
  const StatusIcon = visitStatusIcon[visit.visit_status] || Clock;

  return (
    <Card className={isOverdue ? "border-destructive/50" : ""}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusIcon className={`h-4 w-4 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`} />
          <div>
            <p className="font-medium text-sm">{site?.site_name || "Visita"}</p>
            <p className="text-xs text-muted-foreground">
              {visit.scheduled_at && format(new Date(visit.scheduled_at), "dd/MM/yyyy HH:mm")}
              {sys?.system_type && ` · ${sys.system_type}`}
            </p>
          </div>
        </div>
        <Badge variant={(visitStatusColor[visit.visit_status] || "secondary") as any}>
          {visit.visit_status}
        </Badge>
      </CardContent>
    </Card>
  );
}
