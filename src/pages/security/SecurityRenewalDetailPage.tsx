import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSecurityRenewal, useRenewalActivities, useSecurityRenewals } from "@/hooks/security/useSecurityRenewals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, RefreshCw, Phone, FileText, CheckCircle, XCircle, Clock, MessageSquare, ChevronRight } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useState } from "react";

const STAGE_ORDER = ["upcoming_90", "upcoming_60", "upcoming_30", "proposal_sent", "negotiation", "renewed"];
const STAGE_COLORS: Record<string, string> = {
  upcoming_90: "secondary",
  upcoming_60: "outline",
  upcoming_30: "destructive",
  proposal_sent: "default",
  negotiation: "default",
  renewed: "secondary",
  lost: "destructive",
  expired: "secondary",
};

const ACTIVITY_ICONS: Record<string, any> = {
  stage_change: ChevronRight,
  contact: Phone,
  note: MessageSquare,
};

function getStageKey(stage: string) {
  return `renewalStage${stage.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join("")}`;
}

export default function SecurityRenewalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("security");
  const { data: renewal, isLoading } = useSecurityRenewal(id);
  const { data: activities = [] } = useRenewalActivities(id);
  const { advanceStage, logContact, addRenewalNote } = useSecurityRenewals();

  const [contactDialog, setContactDialog] = useState(false);
  const [contactResponse, setContactResponse] = useState("");
  const [noteDialog, setNoteDialog] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [stageDialog, setStageDialog] = useState(false);
  const [targetStage, setTargetStage] = useState("");
  const [stageNotes, setStageNotes] = useState("");

  if (isLoading) {
    return <DashboardLayout><div className="flex items-center justify-center py-20 text-muted-foreground">A carregar...</div></DashboardLayout>;
  }

  if (!renewal) {
    return <DashboardLayout><div className="text-center py-20"><p className="text-muted-foreground">Renovação não encontrada</p></div></DashboardLayout>;
  }

  const r = renewal as any;
  const contract = r.security_contracts;
  const system = contract?.security_systems;
  const site = system?.security_installation_sites;
  const client = contract?.security_clients;
  const currentStageIdx = STAGE_ORDER.indexOf(r.renewal_stage);
  const daysUntilDue = r.renewal_due_date ? differenceInDays(new Date(r.renewal_due_date), new Date()) : null;
  const isTerminal = ["renewed", "lost", "expired"].includes(r.renewal_stage);

  const nextStages = isTerminal ? [] : STAGE_ORDER.filter((_, i) => i > currentStageIdx);
  const canMarkLost = !isTerminal;

  const handleAdvanceStage = () => {
    if (!targetStage) return;
    advanceStage.mutate({ id: r.id, newStage: targetStage, notes: stageNotes }, {
      onSuccess: () => { setStageDialog(false); setTargetStage(""); setStageNotes(""); },
    });
  };

  const handleLogContact = () => {
    if (!contactResponse.trim()) return;
    logContact.mutate({ id: r.id, response: contactResponse }, {
      onSuccess: () => { setContactDialog(false); setContactResponse(""); },
    });
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addRenewalNote.mutate({ renewalId: r.id, note: noteText }, {
      onSuccess: () => { setNoteDialog(false); setNoteText(""); },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/security/renewals")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <RefreshCw className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <h1 className="text-xl font-bold">{site?.site_name || "Renovação"}</h1>
            <p className="text-sm text-muted-foreground">
              {contract?.contract_type || "Contrato"} · {system?.system_type || "Sistema"}
            </p>
          </div>
          <Badge variant={(STAGE_COLORS[r.renewal_stage] || "secondary") as any} className="text-sm px-3 py-1">
            {t(getStageKey(r.renewal_stage)) || r.renewal_stage}
          </Badge>
        </div>

        {/* Stage Progress */}
        {!isTerminal && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-1">
                {STAGE_ORDER.map((stage, i) => {
                  const isCurrent = stage === r.renewal_stage;
                  const isPast = i < currentStageIdx;
                  return (
                    <div key={stage} className="flex-1 flex items-center gap-1">
                      <div className={`h-2 flex-1 rounded-full ${isPast ? "bg-primary" : isCurrent ? "bg-primary/60" : "bg-muted"}`} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                {STAGE_ORDER.map((stage) => (
                  <span key={stage} className={`text-[10px] ${stage === r.renewal_stage ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {t(getStageKey(stage))?.replace("Renovação a ", "").replace("Renewal in ", "") || stage}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className={`text-2xl font-bold ${daysUntilDue !== null && daysUntilDue <= 30 ? "text-destructive" : ""}`}>
                {daysUntilDue !== null ? `${daysUntilDue}d` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">{t("renewalDaysRemaining")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Phone className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{r.contact_attempts || 0}</p>
              <p className="text-xs text-muted-foreground">{t("renewalContactAttempts")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{r.renewal_due_date ? format(new Date(r.renewal_due_date), "dd/MM/yyyy") : "—"}</p>
              <p className="text-xs text-muted-foreground">{t("renewalDueDate")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{r.renewal_value ? `€${Number(r.renewal_value).toFixed(0)}` : "—"}</p>
              <p className="text-xs text-muted-foreground">{t("renewalValue")}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: Details + Actions */}
          <div className="md:col-span-2 space-y-4">
            {/* Contract & Client Info */}
            <Card>
              <CardHeader><CardTitle className="text-base">{t("details")}</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">{t("clientName")}:</span> <span className="font-medium">{client?.company_name || client?.contact_name || "—"}</span></div>
                  <div><span className="text-muted-foreground">{t("siteName")}:</span> <span className="font-medium">{site?.site_name || "—"}</span></div>
                  <div><span className="text-muted-foreground">{t("systemType")}:</span> <span className="font-medium">{system?.system_type || "—"}</span></div>
                  <div><span className="text-muted-foreground">Tipo Contrato:</span> <span className="font-medium">{contract?.contract_type || "—"}</span></div>
                  <div><span className="text-muted-foreground">Início:</span> <span className="font-medium">{contract?.start_date ? format(new Date(contract.start_date), "dd/MM/yyyy") : "—"}</span></div>
                  <div><span className="text-muted-foreground">Fim:</span> <span className="font-medium">{contract?.end_date ? format(new Date(contract.end_date), "dd/MM/yyyy") : "—"}</span></div>
                </div>
                {r.client_response && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-muted-foreground">{t("renewalClientResponse")}:</span>
                      <p className="mt-1">{r.client_response}</p>
                    </div>
                  </>
                )}
                {r.result_notes && (
                  <div>
                    <span className="text-muted-foreground">{t("notes")}:</span>
                    <p className="mt-1">{r.result_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            {!isTerminal && (
              <Card>
                <CardHeader><CardTitle className="text-base">{t("quickActions")}</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setContactDialog(true)}>
                    <Phone className="h-4 w-4 mr-1" /> {t("renewalLogContact")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setNoteDialog(true)}>
                    <MessageSquare className="h-4 w-4 mr-1" /> {t("renewalAddNote")}
                  </Button>
                  {nextStages.length > 0 && (
                    <>
                      {nextStages.map((stage) => (
                        <Button key={stage} size="sm" variant={stage === "renewed" ? "default" : "outline"} onClick={() => { setTargetStage(stage); setStageDialog(true); }}>
                          {stage === "renewed" ? <CheckCircle className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
                          {t(getStageKey(stage))}
                        </Button>
                      ))}
                    </>
                  )}
                  {canMarkLost && (
                    <Button variant="destructive" size="sm" onClick={() => { setTargetStage("lost"); setStageDialog(true); }}>
                      <XCircle className="h-4 w-4 mr-1" /> {t("renewalStageLost")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Activity Timeline */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">{t("renewalTimeline")}</CardTitle></CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem atividade registada</p>
                ) : (
                  <div className="space-y-3">
                    {(activities as any[]).map((act) => {
                      const Icon = ACTIVITY_ICONS[act.activity_type] || MessageSquare;
                      return (
                        <div key={act.id} className="flex gap-3">
                          <div className="mt-1">
                            <div className="p-1.5 rounded-full bg-muted">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{act.description}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(act.created_at), "dd/MM/yyyy HH:mm")}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Contact Dialog */}
      <Dialog open={contactDialog} onOpenChange={setContactDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("renewalLogContact")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t("renewalClientResponse")}</Label><Textarea value={contactResponse} onChange={(e) => setContactResponse(e.target.value)} rows={3} placeholder="Resposta ou observação do contacto..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialog(false)}>{t("cancel")}</Button>
            <Button onClick={handleLogContact} disabled={!contactResponse.trim() || logContact.isPending}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("renewalAddNote")}</DialogTitle></DialogHeader>
          <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} placeholder="Nota interna..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog(false)}>{t("cancel")}</Button>
            <Button onClick={handleAddNote} disabled={!noteText.trim() || addRenewalNote.isPending}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage Transition Dialog */}
      <Dialog open={stageDialog} onOpenChange={setStageDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Avançar para: {t(getStageKey(targetStage))}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t("notes")}</Label><Textarea value={stageNotes} onChange={(e) => setStageNotes(e.target.value)} rows={3} placeholder="Motivo ou observações..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageDialog(false)}>{t("cancel")}</Button>
            <Button onClick={handleAdvanceStage} disabled={advanceStage.isPending} variant={targetStage === "lost" ? "destructive" : "default"}>
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
