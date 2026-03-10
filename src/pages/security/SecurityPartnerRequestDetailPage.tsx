import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { useSecurityPartnerRequests } from "@/hooks/security/useSecurityPartnerRequests";
import { ArrowLeft, Sparkles, CheckCircle, AlertTriangle, FileSearch, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSecurityConversions } from "@/hooks/security/useSecurityConversions";

export default function SecurityPartnerRequestDetailPage() {
  const { t } = useTranslation("security");
  const { id } = useParams();
  const navigate = useNavigate();
  const { requests, extractData, updateRequest } = useSecurityPartnerRequests();
  const request = requests.find((r) => r.id === id);
  const [editedPayload, setEditedPayload] = useState<Record<string, any>>({});

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

  const handleExtract = () => extractData.mutate(request.id);

  const handleValidate = () => {
    updateRequest.mutate({
      id: request.id,
      extraction_status: "validated",
      parsed_payload_json: editedPayload,
    });
    toast.success("Pedido validado com sucesso");
  };

  const handleConvertToLead = () => {
    toast.info("Conversão em lead — funcionalidade a implementar na Fase 2");
  };

  const handleFieldChange = (key: string, value: string) => {
    setEditedPayload((prev) => ({ ...prev, [key]: value }));
  };

  const fieldLabels: Record<string, string> = {
    client_name: t("clientName"),
    client_type: t("clientType"),
    address: t("installationAddress"),
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
              {(request as any).security_partners?.name || "Parceiro não identificado"}
            </p>
          </div>
          <div className="flex gap-2">
            {canExtract && (
              <Button onClick={handleExtract} disabled={isExtracting} className="gap-2">
                {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isExtracting ? t("extracting") : t("extractData")}
              </Button>
            )}
            {canValidate && (
              <Button onClick={handleValidate} variant="default" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                {t("validate")}
              </Button>
            )}
            {request.extraction_status === "validated" && (
              <Button onClick={handleConvertToLead} className="gap-2">
                {t("convertToLead")}
              </Button>
            )}
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Original message */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("rawMessage")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                {request.raw_text || "—"}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary">{request.source_channel}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Center: Extracted fields */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSearch className="h-4 w-4" />
                {t("extractedFields")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.keys(editedPayload).length === 0 && request.extraction_status === "pending" ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Clique em "{t("extractData")}" para processar a mensagem
                </p>
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
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={key}>
                        <Label className="text-xs">{fieldLabels[key] || key}</Label>
                        <Input
                          value={String(value ?? "")}
                          onChange={(e) => handleFieldChange(key, e.target.value)}
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                    );
                  })}
                  {request.extraction_confidence != null && (
                    <div className="pt-2 border-t">
                      <Label className="text-xs">{t("confidence")}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2 transition-all"
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

          {/* Right: Missing fields + warnings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {t("missingFields")} & {t("warnings")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {missingFields.length > 0 ? (
                <div className="space-y-2">
                  {missingFields.map((field, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      <span>{fieldLabels[field] || field}</span>
                    </div>
                  ))}
                </div>
              ) : request.extraction_status === "pending" ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Extraia os dados para ver campos em falta
                </p>
              ) : (
                <div className="text-sm text-emerald-600 flex items-center gap-2 py-4">
                  <CheckCircle className="h-4 w-4" />
                  Todos os campos identificados
                </div>
              )}

              {/* Quick actions */}
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">{t("quickActions")}</h4>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleConvertToLead}>
                    {t("convertToLead")}
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => toast.info("Fase 2")}>
                    {t("convertToOpportunity")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
