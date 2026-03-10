import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { useSecurityPartnerRequests } from "@/hooks/security/useSecurityPartnerRequests";
import { ArrowLeft, Sparkles, CheckCircle, AlertTriangle, FileSearch, Loader2, XCircle, RotateCcw, ArrowRight, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSecurityConversions } from "@/hooks/security/useSecurityConversions";
import { format } from "date-fns";

const STEPS = [
  { key: "pending", label: "Recebido", icon: Clock },
  { key: "extracted", label: "Extraído", icon: Sparkles },
  { key: "validated", label: "Validado", icon: CheckCircle },
  { key: "converted", label: "Convertido", icon: ArrowRight },
];

function getStepIndex(status: string, isConverted: boolean) {
  if (isConverted) return 3;
  if (status === "validated") return 2;
  if (status === "extracted" || status === "needs_review") return 1;
  if (status === "processing") return 0;
  if (status === "rejected") return -1;
  return 0;
}

export default function SecurityPartnerRequestDetailPage() {
  const { t } = useTranslation("security");
  const { id } = useParams();
  const navigate = useNavigate();
  const { requests, extractData, updateRequest } = useSecurityPartnerRequests();
  const { convertRequestToLead } = useSecurityConversions();
  const request = requests.find((r) => r.id === id);
  const [editedPayload, setEditedPayload] = useState<Record<string, any>>({});
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (request?.parsed_payload_json && typeof request.parsed_payload_json === "object") {
      setEditedPayload(request.parsed_payload_json as Record<string, any>);
    }
  }, [request?.parsed_payload_json]);

  if (!request) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted-foreground">A carregar...</div>
      </DashboardLayout>
    );
  }

  const missingFields = Array.isArray(request.missing_fields_json) ? (request.missing_fields_json as string[]) : [];
  const isExtracting = extractData.isPending;
  const canExtract = request.extraction_status === "pending" || request.extraction_status === "needs_review";
  const canValidate = request.extraction_status === "extracted" || request.extraction_status === "needs_review";
  const alreadyConverted = !!(request as any).linked_security_lead_id;
  const isRejected = request.extraction_status === "rejected";
  const currentStep = getStepIndex(request.extraction_status, alreadyConverted);

  const handleExtract = () => extractData.mutate(request.id);

  const handleValidate = () => {
    updateRequest.mutate({
      id: request.id,
      extraction_status: "validated",
      parsed_payload_json: editedPayload,
    });
    toast.success("Pedido validado com sucesso");
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    updateRequest.mutate({
      id: request.id,
      extraction_status: "rejected",
      notes: rejectReason,
    });
    setRejectDialog(false);
    setRejectReason("");
    toast.success("Pedido rejeitado");
  };

  const handleReopen = () => {
    updateRequest.mutate({
      id: request.id,
      extraction_status: "needs_review",
    });
    toast.success("Pedido reaberto para revisão");
  };

  const handleConvertToLead = () => {
    convertRequestToLead.mutate(request);
  };
  const isConverting = convertRequestToLead.isPending;

  const handleFieldChange = (key: string, value: string) => {
    setEditedPayload((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveFields = () => {
    updateRequest.mutate({
      id: request.id,
      parsed_payload_json: editedPayload,
    });
    toast.success("Campos atualizados");
  };

  const fieldLabels: Record<string, string> = {
    client_name: t("clientName"),
    client_type: t("clientType"),
    address: t("installationAddress"),
    postal_code: t("postalCode"),
    locality: t("locality"),
    responsible_name: t("responsiblePerson"),
    responsible_phone: t("phone"),
    responsible_email: t("email"),
    request_type: t("requestType"),
    system_type: t("systemType"),
    installation_date: t("installationDate"),
    observations: t("observations"),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/security/partner-requests")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{t("partnerRequests")} — {t("details")}</h1>
            <p className="text-sm text-muted-foreground">
              {(request as any).security_partners?.name || "Parceiro não identificado"} · {request.source_channel} · {format(new Date(request.created_at), "dd/MM/yyyy HH:mm")}
            </p>
          </div>
        </div>

        {/* Step Progress */}
        {!isRejected && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {STEPS.map((step, i) => {
                  const StepIcon = step.icon;
                  const isActive = i === currentStep;
                  const isPast = i < currentStep;
                  return (
                    <div key={step.key} className="flex items-center gap-2 flex-1">
                      <div className={`flex items-center gap-2 ${isActive ? "text-primary font-medium" : isPast ? "text-primary/60" : "text-muted-foreground"}`}>
                        <div className={`p-1.5 rounded-full ${isActive ? "bg-primary/10" : isPast ? "bg-primary/5" : "bg-muted"}`}>
                          <StepIcon className="h-4 w-4" />
                        </div>
                        <span className="text-xs whitespace-nowrap">{step.label}</span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-2 rounded ${isPast ? "bg-primary/40" : "bg-muted"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {isRejected && (
          <Card className="border-destructive/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">{t("statusRejected")}</p>
                  {request.notes && <p className="text-sm text-muted-foreground">{request.notes}</p>}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleReopen}>
                <RotateCcw className="h-4 w-4 mr-1" /> {t("reqReopen")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Action Bar */}
        <div className="flex gap-2 flex-wrap">
          {canExtract && (
            <Button onClick={handleExtract} disabled={isExtracting} className="gap-2">
              {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isExtracting ? t("extracting") : t("extractData")}
            </Button>
          )}
          {request.extraction_status === "extracted" && (
            <Button onClick={handleExtract} disabled={isExtracting} variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4" /> {t("reqReExtract")}
            </Button>
          )}
          {canValidate && (
            <Button onClick={handleValidate} variant="default" className="gap-2">
              <CheckCircle className="h-4 w-4" /> {t("validate")}
            </Button>
          )}
          {request.extraction_status === "validated" && !alreadyConverted && (
            <Button onClick={handleConvertToLead} disabled={isConverting} className="gap-2">
              {isConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {t("convertToLead")}
            </Button>
          )}
          {alreadyConverted && (
            <Button variant="outline" onClick={() => navigate(`/dashboard/security/leads/${(request as any).linked_security_lead_id}`)} className="gap-2">
              <ArrowRight className="h-4 w-4" /> Ver Lead
            </Button>
          )}
          {!isRejected && !alreadyConverted && request.extraction_status !== "pending" && (
            <Button variant="destructive" size="sm" onClick={() => setRejectDialog(true)} className="gap-2 ml-auto">
              <XCircle className="h-4 w-4" /> {t("reqReject")}
            </Button>
          )}
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Original message */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("rawMessage")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-[500px] overflow-y-auto font-mono">
                {request.raw_text || "—"}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary">{request.source_channel}</Badge>
                {(request as any).security_partners?.name && (
                  <Badge variant="outline">{(request as any).security_partners.name}</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Center: Extracted fields */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSearch className="h-4 w-4" />
                  {t("extractedFields")}
                </CardTitle>
                {Object.keys(editedPayload).length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleSaveFields}>
                    {t("save")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.keys(editedPayload).length === 0 && request.extraction_status === "pending" ? (
                <div className="text-center py-8">
                  <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Clique em "{t("extractData")}" para processar a mensagem com IA
                  </p>
                </div>
              ) : (
                <>
                  {Object.entries(editedPayload).map(([key, value]) => {
                    if (key === "zones" || key === "devices") {
                      const items = Array.isArray(value) ? value : [];
                      return (
                        <div key={key}>
                          <Label className="text-xs">{fieldLabels[key] || key}</Label>
                          <div className="space-y-1 mt-1">
                            {items.map((item: any, i: number) => (
                              <div key={i} className="bg-muted/50 rounded px-3 py-1.5 text-sm">
                                {typeof item === "string" ? item : JSON.stringify(item)}
                              </div>
                            ))}
                            {items.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                          </div>
                        </div>
                      );
                    }
                    const isMissing = missingFields.includes(key);
                    return (
                      <div key={key}>
                        <Label className={`text-xs ${isMissing ? "text-amber-600" : ""}`}>
                          {fieldLabels[key] || key}
                          {isMissing && <AlertTriangle className="h-3 w-3 inline ml-1 text-amber-500" />}
                        </Label>
                        <Input
                          value={String(value ?? "")}
                          onChange={(e) => handleFieldChange(key, e.target.value)}
                          className={`mt-1 h-8 text-sm ${isMissing ? "border-amber-300" : ""}`}
                          placeholder={isMissing ? "Campo não encontrado" : ""}
                        />
                      </div>
                    );
                  })}
                  {request.extraction_confidence != null && (
                    <div className="pt-3 border-t">
                      <Label className="text-xs">{t("confidence")}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-muted rounded-full h-2.5">
                          <div
                            className={`rounded-full h-2.5 transition-all ${
                              Number(request.extraction_confidence) >= 70 ? "bg-emerald-500" :
                              Number(request.extraction_confidence) >= 40 ? "bg-amber-500" : "bg-destructive"
                            }`}
                            style={{ width: `${Math.min(100, Number(request.extraction_confidence))}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{Math.round(Number(request.extraction_confidence))}%</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Right: Missing fields + Quick Actions */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {t("missingFields")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {missingFields.length > 0 ? (
                  <div className="space-y-2">
                    {missingFields.map((field, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm p-2 bg-amber-500/5 rounded">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        <span>{fieldLabels[field] || field}</span>
                      </div>
                    ))}
                  </div>
                ) : request.extraction_status === "pending" ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Extraia os dados para ver campos em falta
                  </p>
                ) : (
                  <div className="text-sm text-emerald-600 flex items-center gap-2 py-4 justify-center">
                    <CheckCircle className="h-4 w-4" />
                    Todos os campos identificados
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workflow summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("quickActions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!alreadyConverted ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={handleConvertToLead}
                      disabled={isConverting || request.extraction_status !== "validated"}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      {t("convertToLead")}
                    </Button>
                    {request.extraction_status !== "validated" && (
                      <p className="text-xs text-muted-foreground">
                        {t("reqValidateFirst")}
                      </p>
                    )}
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => navigate(`/dashboard/security/leads/${(request as any).linked_security_lead_id}`)}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Ver Lead Criado
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("reqReject")}</DialogTitle></DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Motivo da rejeição..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>{t("cancel")}</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>{t("confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
