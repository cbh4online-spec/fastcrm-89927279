import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityMaintenancePlans, useSecurityMaintenanceVisits } from "@/hooks/security/useSecurityMaintenance";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Calendar, AlertTriangle, CheckCircle2, Clock, Plus, CalendarDays, List } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SecurityMaintenancePlanDialog } from "@/components/security/SecurityMaintenancePlanDialog";
import { SecurityVisitDialog } from "@/components/security/SecurityVisitDialog";
import { SecurityMaintenanceCalendar } from "@/components/security/SecurityMaintenanceCalendar";
import { SecuritySLAAlerts } from "@/components/security/SecuritySLAAlerts";

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

const visitStatusLabels: Record<string, string> = {
  scheduled: "Agendada",
  in_progress: "Em Curso",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const frequencyLabels: Record<string, string> = {
  monthly: "Mensal",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
};

export default function SecurityMaintenancePage() {
  const { t } = useTranslation("security");
  const navigate = useNavigate();
  const { plans, isLoading: plansLoading } = useSecurityMaintenancePlans();
  const { visits, isLoading: visitsLoading } = useSecurityMaintenanceVisits();
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");

  const overdueVisits = visits.filter((v: any) => v.visit_status === "scheduled" && v.scheduled_at && isPast(new Date(v.scheduled_at)) && !isToday(new Date(v.scheduled_at)));
  const upcomingVisits = visits.filter((v: any) => v.visit_status === "scheduled" && v.scheduled_at && !isPast(new Date(v.scheduled_at)));
  const inProgressVisits = visits.filter((v: any) => v.visit_status === "in_progress");
  const completedVisits = visits.filter((v: any) => v.visit_status === "completed");

  const handleVisitClick = (id: string) => navigate(`/dashboard/security/maintenance/${id}`);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">{t("maintenance")}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPlanDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Plano
            </Button>
            <Button onClick={() => setVisitDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Visita
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{plans.length}</p>
              <p className="text-xs text-muted-foreground">Planos Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{overdueVisits.length}</p>
              <p className="text-xs text-muted-foreground">Em Atraso</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{inProgressVisits.length}</p>
              <p className="text-xs text-muted-foreground">Em Curso</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{upcomingVisits.length}</p>
              <p className="text-xs text-muted-foreground">Agendadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{completedVisits.length}</p>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </CardContent>
          </Card>
        </div>

        {/* SLA Alerts */}
        <SecuritySLAAlerts visits={visits} plans={plans} onVisitClick={handleVisitClick} />

        <Tabs defaultValue="visits">
          <TabsList>
            <TabsTrigger value="visits">Visitas</TabsTrigger>
            <TabsTrigger value="plans">Planos ({plans.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="visits" className="space-y-4 mt-4">
            {/* View toggle */}
            <div className="flex justify-end">
              <div className="flex border rounded-md overflow-hidden">
                <Button
                  variant={viewMode === "calendar" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none gap-1.5 h-8"
                  onClick={() => setViewMode("calendar")}
                >
                  <CalendarDays className="h-3.5 w-3.5" /> Calendário
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none gap-1.5 h-8"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-3.5 w-3.5" /> Lista
                </Button>
              </div>
            </div>

            {visitsLoading ? (
              <div className="text-center py-12 text-muted-foreground">A carregar...</div>
            ) : viewMode === "calendar" ? (
              visits.length === 0 ? (
                <Card><CardContent className="py-12 text-center">
                  <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                  <p className="text-muted-foreground">Nenhuma visita agendada</p>
                  <Button variant="outline" className="mt-4 gap-2" onClick={() => setVisitDialogOpen(true)}>
                    <Plus className="h-4 w-4" /> Agendar Visita
                  </Button>
                </CardContent></Card>
              ) : (
                <SecurityMaintenanceCalendar visits={visits} onVisitClick={handleVisitClick} />
              )
            ) : visits.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <p className="text-muted-foreground">Nenhuma visita agendada</p>
                <Button variant="outline" className="mt-4 gap-2" onClick={() => setVisitDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> Agendar Visita
                </Button>
              </CardContent></Card>
            ) : (
              <>
                {overdueVisits.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Em Atraso ({overdueVisits.length})
                    </h3>
                    {overdueVisits.map((v: any) => <VisitCard key={v.id} visit={v} onClick={() => handleVisitClick(v.id)} />)}
                  </div>
                )}
                {inProgressVisits.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                      <Wrench className="h-4 w-4" /> Em Curso ({inProgressVisits.length})
                    </h3>
                    {inProgressVisits.map((v: any) => <VisitCard key={v.id} visit={v} onClick={() => handleVisitClick(v.id)} />)}
                  </div>
                )}
                {upcomingVisits.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Agendadas ({upcomingVisits.length})
                    </h3>
                    {upcomingVisits.map((v: any) => <VisitCard key={v.id} visit={v} onClick={() => handleVisitClick(v.id)} />)}
                  </div>
                )}
                {completedVisits.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Concluídas ({completedVisits.length})
                    </h3>
                    {completedVisits.slice(0, 10).map((v: any) => <VisitCard key={v.id} visit={v} onClick={() => handleVisitClick(v.id)} />)}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="plans" className="space-y-3 mt-4">
            {plansLoading ? (
              <div className="text-center py-12 text-muted-foreground">A carregar...</div>
            ) : plans.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <p className="text-muted-foreground">Nenhum plano de manutenção</p>
                <Button variant="outline" className="mt-4 gap-2" onClick={() => setPlanDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> Criar Plano
                </Button>
              </CardContent></Card>
            ) : (
              plans.map((p: any) => {
                const sys = p.security_systems as any;
                const site = sys?.security_installation_sites as any;
                const isOverdue = p.next_visit_at && isPast(new Date(p.next_visit_at));
                return (
                  <Card key={p.id} className={`hover:border-primary/50 transition-colors ${isOverdue ? "border-destructive/30" : ""}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{site?.site_name || "Plano"}</p>
                        <p className="text-sm text-muted-foreground">
                          {frequencyLabels[p.frequency_type] || p.frequency_type} · {sys?.system_type || "—"}
                          {p.next_visit_at && ` · Próxima: ${format(new Date(p.next_visit_at), "dd/MM/yyyy")}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOverdue && <Badge variant="destructive" className="text-[10px]">SLA</Badge>}
                        <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status === "active" ? "Ativo" : p.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      <SecurityMaintenancePlanDialog open={planDialogOpen} onOpenChange={setPlanDialogOpen} />
      <SecurityVisitDialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen} />
    </DashboardLayout>
  );
}

function VisitCard({ visit, onClick }: { visit: any; onClick: () => void }) {
  const sys = visit.security_systems as any;
  const site = sys?.security_installation_sites as any;
  const isOverdue = visit.visit_status === "scheduled" && visit.scheduled_at && isPast(new Date(visit.scheduled_at)) && !isToday(new Date(visit.scheduled_at));
  const StatusIcon = visitStatusIcon[visit.visit_status] || Clock;

  return (
    <Card className={`cursor-pointer hover:border-primary/50 transition-colors ${isOverdue ? "border-destructive/50" : ""}`} onClick={onClick}>
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
          {visitStatusLabels[visit.visit_status] || visit.visit_status}
        </Badge>
      </CardContent>
    </Card>
  );
}
