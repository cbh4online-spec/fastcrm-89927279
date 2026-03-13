import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityMaintenanceVisits, useSecurityMaintenancePlans } from "@/hooks/security/useSecurityMaintenance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Wrench, MapPin, Clock, CheckCircle, Play } from "lucide-react";
import { format, isPast, isToday, addMonths } from "date-fns";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase = _supabase as any;

const statusLabels: Record<string, string> = {
  scheduled: "Agendada",
  in_progress: "Em Curso",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const statusColors: Record<string, string> = {
  scheduled: "outline",
  in_progress: "default",
  completed: "secondary",
  cancelled: "destructive",
};

export default function SecurityMaintenanceVisitDetailPage() {
  const { t } = useTranslation("security");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateVisit } = useSecurityMaintenanceVisits();
  const { updatePlan } = useSecurityMaintenancePlans();
  const [completionNotes, setCompletionNotes] = useState("");

  const { data: visit, isLoading } = useQuery({
    queryKey: ["security-maintenance-visit", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("security_maintenance_visits")
        .select("*, security_systems(*, security_installation_sites(*)), security_maintenance_plans(frequency_type, frequency_value, id)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <DashboardLayout><div className="text-center py-12 text-muted-foreground">A carregar...</div></DashboardLayout>;
  if (!visit) return <DashboardLayout><div className="text-center py-12 text-muted-foreground">Visita não encontrada.</div></DashboardLayout>;

  const sys = visit.security_systems as any;
  const site = sys?.security_installation_sites as any;
  const plan = visit.security_maintenance_plans as any;
  const isOverdue = visit.visit_status === "scheduled" && visit.scheduled_at && isPast(new Date(visit.scheduled_at)) && !isToday(new Date(visit.scheduled_at));
  const canStart = visit.visit_status === "scheduled";
  const canComplete = visit.visit_status === "in_progress";
  const isClosed = visit.visit_status === "completed" || visit.visit_status === "cancelled";

  const handleStart = () => {
    updateVisit.mutate({ id: visit.id, visit_status: "in_progress", started_at: new Date().toISOString() });
  };

  const handleComplete = () => {
    const now = new Date().toISOString();
    updateVisit.mutate({ id: visit.id, visit_status: "completed", completed_at: now, notes: completionNotes || visit.notes }, {
      onSuccess: () => {
        // Auto-schedule next visit if plan exists
        if (plan?.id && plan.frequency_value) {
          const months = Number(plan.frequency_value) || 3;
          const nextDate = addMonths(new Date(), months).toISOString();
          updatePlan.mutate({ id: plan.id, next_visit_at: nextDate });
        }
      }
    });
  };

  const handleCancel = () => {
    updateVisit.mutate({ id: visit.id, visit_status: "cancelled" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/security/maintenance")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Wrench className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">{site?.site_name || "Visita de Manutenção"}</h1>
              <p className="text-sm text-muted-foreground">
                {sys?.system_type || "—"}
                {plan && ` · ${plan.frequency_type}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOverdue && <Badge variant="destructive">Em Atraso</Badge>}
            <Badge variant={(statusColors[visit.visit_status] || "secondary") as any}>
              {statusLabels[visit.visit_status] || visit.visit_status}
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">{t("details")}</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground text-xs">Data Agendada</span>
                    <p className="font-medium">{visit.scheduled_at ? format(new Date(visit.scheduled_at), "dd/MM/yyyy HH:mm") : "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Sistema</span>
                    <p className="font-medium capitalize">{sys?.system_type || "—"}</p>
                  </div>
                  {visit.started_at && (
                    <div>
                      <span className="text-muted-foreground text-xs">Iniciada</span>
                      <p>{format(new Date(visit.started_at), "dd/MM/yyyy HH:mm")}</p>
                    </div>
                  )}
                  {visit.completed_at && (
                    <div>
                      <span className="text-muted-foreground text-xs">Concluída</span>
                      <p>{format(new Date(visit.completed_at), "dd/MM/yyyy HH:mm")}</p>
                    </div>
                  )}
                </div>
                {visit.notes && (
                  <div className="pt-3 border-t">
                    <span className="text-muted-foreground text-xs">Notas</span>
                    <p className="mt-1 whitespace-pre-wrap">{visit.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completion form */}
            {canComplete && (
              <Card>
                <CardHeader><CardTitle className="text-base">Conclusão da Visita</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Relatório / Notas do Técnico</Label>
                    <Textarea
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      rows={4}
                      placeholder="Descreva os trabalhos realizados, observações, materiais utilizados..."
                    />
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Concluir Visita
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Concluir Visita</AlertDialogTitle>
                        <AlertDialogDescription>
                          Confirma a conclusão desta visita de manutenção?
                          {plan && " A próxima visita será agendada automaticamente."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleComplete} disabled={updateVisit.isPending}>
                          Confirmar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            {!isClosed && (
              <Card>
                <CardHeader><CardTitle className="text-base">{t("actions")}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {canStart && (
                    <Button onClick={handleStart} disabled={updateVisit.isPending} className="w-full gap-2">
                      <Play className="h-4 w-4" />
                      Iniciar Visita
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full text-destructive">Cancelar Visita</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Visita</AlertDialogTitle>
                        <AlertDialogDescription>Tem a certeza que pretende cancelar esta visita?</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Não</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel}>Sim, cancelar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}

            {/* Site */}
            {site && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Local</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p className="font-medium">{site.site_name}</p>
                  <p>{site.address_line_1}</p>
                  <p>{[site.postal_code, site.locality].filter(Boolean).join(" ")}</p>
                  {site.onsite_responsible_name && (
                    <div className="pt-2 border-t mt-2">
                      <p className="text-xs text-muted-foreground">Responsável</p>
                      <p>{site.onsite_responsible_name}</p>
                      {site.onsite_responsible_phone && <p className="text-muted-foreground">{site.onsite_responsible_phone}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criada</span>
                  <span>{format(new Date(visit.created_at), "dd/MM/yyyy HH:mm")}</span>
                </div>
                {visit.scheduled_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Agendada</span>
                    <span>{format(new Date(visit.scheduled_at), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                )}
                {visit.started_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Iniciada</span>
                    <span>{format(new Date(visit.started_at), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                )}
                {visit.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Concluída</span>
                    <span>{format(new Date(visit.completed_at), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
