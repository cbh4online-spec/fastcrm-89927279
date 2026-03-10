import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityOccurrence, useSecurityOccurrences, useOccurrenceActivities } from "@/hooks/security/useSecurityOccurrences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, AlertTriangle, MapPin, Clock, CheckCircle,
  ArrowUpCircle, MessageSquare, Send, Wrench, Timer, ShieldAlert
} from "lucide-react";
import { format, differenceInHours, differenceInMinutes, isPast } from "date-fns";
import { useState } from "react";

const severityConfig: Record<string, { color: string; slaResponse: number; slaResolution: number }> = {
  critical: { color: "destructive", slaResponse: 1, slaResolution: 4 },
  high: { color: "destructive", slaResponse: 4, slaResolution: 24 },
  medium: { color: "default", slaResponse: 8, slaResolution: 48 },
  low: { color: "secondary", slaResponse: 24, slaResolution: 72 },
};

const activityIcons: Record<string, any> = {
  status_change: ArrowUpCircle,
  note: MessageSquare,
  escalation: ShieldAlert,
};

export default function SecurityOccurrenceDetailPage() {
  const { t } = useTranslation("security");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: occ, isLoading } = useSecurityOccurrence(id);
  const { updateOccurrence, closeOccurrence, escalateOccurrence, addOccurrenceNote } = useSecurityOccurrences();
  const { data: activities = [] } = useOccurrenceActivities(id);
  const [resolution, setResolution] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [noteText, setNoteText] = useState("");
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");

  if (isLoading) return <DashboardLayout><div className="text-center py-12 text-muted-foreground">A carregar...</div></DashboardLayout>;
  if (!occ) return <DashboardLayout><div className="text-center py-12 text-muted-foreground">Ocorrência não encontrada.</div></DashboardLayout>;

  const sys = occ.security_systems as any;
  const site = sys?.security_installation_sites as any;
  const zone = occ.security_system_zones as any;
  const device = occ.security_installed_devices as any;
  const isClosed = occ.status === "closed" || occ.status === "cancelled";

  // SLA calculations
  const now = new Date();
  const slaResponseDeadline = (occ as any).sla_response_deadline ? new Date((occ as any).sla_response_deadline) : null;
  const slaResolutionDeadline = (occ as any).sla_resolution_deadline ? new Date((occ as any).sla_resolution_deadline) : null;
  const slaResponseMet = (occ as any).sla_response_met;
  const slaResolutionMet = (occ as any).sla_resolution_met;
  const firstResponseAt = (occ as any).first_response_at;
  const escalationLevel = (occ as any).escalation_level || 0;

  const responseTimeLeft = slaResponseDeadline && !firstResponseAt ? differenceInMinutes(slaResponseDeadline, now) : null;
  const resolutionTimeLeft = slaResolutionDeadline && occ.status !== "closed" && occ.status !== "resolved" ? differenceInMinutes(slaResolutionDeadline, now) : null;

  const getProgressValue = (deadline: Date | null, createdAt: string) => {
    if (!deadline) return 0;
    const total = differenceInMinutes(deadline, new Date(createdAt));
    const elapsed = differenceInMinutes(now, new Date(createdAt));
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const formatTimeLeft = (mins: number | null) => {
    if (mins === null) return "—";
    if (mins <= 0) return "Expirado";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const handleStatusChange = (status: string) => {
    setNewStatus(status);
    if (status === "closed") return;
    updateOccurrence.mutate({ id: occ.id, status });
  };

  const handleClose = () => {
    closeOccurrence.mutate({ id: occ.id, resolution_summary: resolution });
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addOccurrenceNote.mutate({ occurrenceId: occ.id, workspaceId: occ.workspace_id, note: noteText });
    setNoteText("");
  };

  const handleEscalate = () => {
    if (!escalateReason.trim()) return;
    escalateOccurrence.mutate({ id: occ.id, reason: escalateReason });
    setEscalateOpen(false);
    setEscalateReason("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/security/occurrences")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <AlertTriangle className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">{occ.title || occ.occurrence_type}</h1>
              <p className="text-sm text-muted-foreground">{site?.site_name || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {escalationLevel > 0 && (
              <Badge variant="destructive" className="gap-1">
                <ShieldAlert className="h-3 w-3" /> Nível {escalationLevel}
              </Badge>
            )}
            {occ.severity && (
              <Badge variant={occ.severity === "critical" ? "destructive" : "outline"}>
                {occ.severity}
              </Badge>
            )}
            <Badge variant={occ.status === "open" ? "destructive" : "default"}>
              {occ.status}
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* SLA Tracking */}
            {!isClosed && (slaResponseDeadline || slaResolutionDeadline) && (
              <Card className={
                (responseTimeLeft !== null && responseTimeLeft <= 0) || (resolutionTimeLeft !== null && resolutionTimeLeft <= 0)
                  ? "border-destructive/50"
                  : ""
              }>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Timer className="h-4 w-4" /> SLA Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Response SLA */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Tempo de Resposta</span>
                      {firstResponseAt ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-emerald-500" />
                          Respondida em {differenceInMinutes(new Date(firstResponseAt), new Date(occ.created_at))}m
                        </span>
                      ) : (
                        <span className={responseTimeLeft !== null && responseTimeLeft <= 0 ? "text-destructive font-medium" : ""}>
                          {formatTimeLeft(responseTimeLeft)}
                        </span>
                      )}
                    </div>
                    <Progress
                      value={firstResponseAt ? 100 : getProgressValue(slaResponseDeadline, occ.created_at)}
                      className={`h-2 ${firstResponseAt ? "[&>div]:bg-emerald-500" : responseTimeLeft !== null && responseTimeLeft <= 0 ? "[&>div]:bg-destructive" : ""}`}
                    />
                  </div>
                  {/* Resolution SLA */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Tempo de Resolução</span>
                      <span className={resolutionTimeLeft !== null && resolutionTimeLeft <= 0 ? "text-destructive font-medium" : ""}>
                        {formatTimeLeft(resolutionTimeLeft)}
                      </span>
                    </div>
                    <Progress
                      value={getProgressValue(slaResolutionDeadline, occ.created_at)}
                      className={`h-2 ${resolutionTimeLeft !== null && resolutionTimeLeft <= 0 ? "[&>div]:bg-destructive" : ""}`}
                    />
                  </div>
                  {slaResponseDeadline && (
                    <p className="text-[10px] text-muted-foreground">
                      SLA Resposta: {(occ as any).sla_response_hours}h · SLA Resolução: {(occ as any).sla_resolution_hours}h
                      {slaResolutionDeadline && ` · Prazo: ${format(slaResolutionDeadline, "dd/MM HH:mm")}`}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* SLA Result (closed) */}
            {isClosed && (slaResponseMet !== null || slaResolutionMet !== null) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Timer className="h-4 w-4" /> Resultado SLA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      {slaResponseMet ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
                      <span className="text-sm">Resposta {slaResponseMet ? "dentro do SLA" : "fora do SLA"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {slaResolutionMet ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
                      <span className="text-sm">Resolução {slaResolutionMet ? "dentro do SLA" : "fora do SLA"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Details */}
            <Card>
              <CardHeader><CardTitle className="text-base">{t("details")}</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {occ.description && <p>{occ.description}</p>}
                {occ.impact_on_client && (
                  <div className="p-3 rounded bg-destructive/10 border border-destructive/20">
                    <p className="font-semibold text-xs text-destructive mb-1">Impacto no Cliente</p>
                    <p>{occ.impact_on_client}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <span className="text-muted-foreground text-xs">Tipo</span>
                    <p className="capitalize">{occ.occurrence_type}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Origem</span>
                    <p className="capitalize">{occ.occurrence_origin}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Data</span>
                    <p>{occ.occurred_at ? format(new Date(occ.occurred_at), "dd/MM/yyyy HH:mm") : "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Sistema</span>
                    <p className="capitalize">{sys?.system_type || "—"}</p>
                  </div>
                  {zone && (
                    <div>
                      <span className="text-muted-foreground text-xs">Zona</span>
                      <p>{zone.zone_name}</p>
                    </div>
                  )}
                  {device && (
                    <div>
                      <span className="text-muted-foreground text-xs">Dispositivo</span>
                      <p>{[device.brand, device.model].filter(Boolean).join(" ") || device.device_type}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resolution */}
            {occ.resolution_summary && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Resolução</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  <p>{occ.resolution_summary}</p>
                  {occ.resolved_at && <p className="text-xs text-muted-foreground mt-2">Resolvida em {format(new Date(occ.resolved_at), "dd/MM/yyyy HH:mm")}</p>}
                </CardContent>
              </Card>
            )}

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Histórico de Atividade
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem atividade registada</p>
                ) : (
                  <div className="relative pl-6 space-y-4">
                    <div className="absolute left-2.5 top-1 bottom-1 w-px bg-border" />
                    {activities.map((act: any) => {
                      const Icon = activityIcons[act.activity_type] || MessageSquare;
                      const isEscalation = act.activity_type === "escalation";
                      return (
                        <div key={act.id} className="relative">
                          <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${isEscalation ? "bg-destructive/10" : "bg-muted"}`}>
                            <Icon className={`h-3 w-3 ${isEscalation ? "text-destructive" : "text-muted-foreground"}`} />
                          </div>
                          <div>
                            <p className="text-sm">{act.description}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {format(new Date(act.created_at), "dd/MM/yyyy HH:mm")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add note */}
                {!isClosed && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Input
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Adicionar nota..."
                      onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                    />
                    <Button size="icon" onClick={handleAddNote} disabled={!noteText.trim() || addOccurrenceNote.isPending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            {!isClosed && (
              <Card>
                <CardHeader><CardTitle className="text-base">{t("actions")}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Select value={newStatus || occ.status} onValueChange={handleStatusChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aberta</SelectItem>
                      <SelectItem value="in_progress">Em Progresso</SelectItem>
                      <SelectItem value="waiting_parts">A Aguardar Peças</SelectItem>
                      <SelectItem value="resolved">Resolvida</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Escalate */}
                  <Button variant="outline" className="w-full gap-2 text-destructive" onClick={() => setEscalateOpen(true)}>
                    <ShieldAlert className="h-4 w-4" />
                    Escalar (Nível {escalationLevel + 1})
                  </Button>

                  {/* Create maintenance visit */}
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => navigate(`/dashboard/security/maintenance?system=${occ.system_id}`)}
                  >
                    <Wrench className="h-4 w-4" />
                    Criar Visita Corretiva
                  </Button>

                  <div className="pt-2 border-t">
                    <Textarea
                      placeholder="Resumo da resolução (obrigatório para fechar)"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      rows={3}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="w-full mt-2" variant="outline" disabled={!resolution.trim()}>
                          Fechar Ocorrência
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Fechar Ocorrência</AlertDialogTitle>
                          <AlertDialogDescription>
                            Confirma o fecho desta ocorrência? A resolução indicada ficará registada permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={handleClose} disabled={closeOccurrence.isPending}>
                            {t("confirm")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location */}
            {site && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Local
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p className="font-medium">{site.site_name}</p>
                  <p>{site.address_line_1}</p>
                  <p>{[site.postal_code, site.locality].filter(Boolean).join(" ")}</p>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criada</span>
                  <span>{format(new Date(occ.created_at), "dd/MM/yyyy HH:mm")}</span>
                </div>
                {occ.occurred_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ocorrida</span>
                    <span>{format(new Date(occ.occurred_at), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                )}
                {firstResponseAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">1ª Resposta</span>
                    <span>{format(new Date(firstResponseAt), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                )}
                {(occ as any).escalated_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Escalada</span>
                    <span>{format(new Date((occ as any).escalated_at), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                )}
                {occ.resolved_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolvida</span>
                    <span>{format(new Date(occ.resolved_at), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Escalation Dialog */}
      <Dialog open={escalateOpen} onOpenChange={setEscalateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Escalar Ocorrência</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A ocorrência será escalada para o nível {escalationLevel + 1}. Indique o motivo da escalação.
            </p>
            <div>
              <Label>Motivo</Label>
              <Textarea
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                rows={3}
                placeholder="Ex: Sem resposta do técnico, impacto no cliente..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEscalateOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleEscalate} disabled={!escalateReason.trim() || escalateOccurrence.isPending}>
                Escalar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
