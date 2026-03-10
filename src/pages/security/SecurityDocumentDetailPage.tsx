import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityDocument, useSecurityDocuments, useDocumentVersionHistory } from "@/hooks/security/useSecurityDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { ArrowLeft, FileText, CheckCircle, Send, Copy, Clock, Shield, Download } from "lucide-react";
import { format } from "date-fns";
import { useState, useRef } from "react";

const docTypeLabels: Record<string, string> = {
  installation_certificate: "Certificado de Instalação",
  maintenance_certificate: "Certificado de Manutenção",
  conformity_declaration: "Declaração de Conformidade",
  occurrence_book: "Livro de Ocorrências",
  technical_sheet: "Ficha Técnica",
  annex: "Anexo",
  other: "Outro",
};

const statusFlow = ["draft", "por_validar", "validated", "emitted", "signed", "archived"];

export default function SecurityDocumentDetailPage() {
  const { t } = useTranslation("security");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: doc, isLoading } = useSecurityDocument(id);
  const { validateDocument, emitDocument, updateDocument, createNewVersion } = useSecurityDocuments();
  const [validationNotes, setValidationNotes] = useState("");
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const system = doc?.security_systems as any;
  const site = system?.security_installation_sites as any;
  const devices = system?.security_installed_devices as any[] || [];
  const zones = system?.security_system_zones as any[] || [];
  const sourceData = doc?.source_data_json as any;

  const { data: versions = [] } = useDocumentVersionHistory(
    doc?.system_id || undefined,
    doc?.document_type || undefined
  );

  if (isLoading) {
    return <DashboardLayout><div className="text-center py-12 text-muted-foreground">A carregar...</div></DashboardLayout>;
  }

  if (!doc) {
    return <DashboardLayout><div className="text-center py-12 text-muted-foreground">Documento não encontrado.</div></DashboardLayout>;
  }

  const canValidate = doc.status === "draft" || doc.status === "por_validar";
  const canEmit = doc.status === "validated";
  const canCreateVersion = doc.status === "emitted" || doc.status === "signed";
  const currentStepIndex = statusFlow.indexOf(doc.status);

  const handleMarkForValidation = () => {
    updateDocument.mutate({ id: doc.id, status: "por_validar", validation_notes: validationNotes || null });
  };

  const handleValidate = () => {
    validateDocument.mutate(doc.id);
  };

  const handleEmit = () => {
    emitDocument.mutate(doc.id);
  };

  const handleNewVersion = () => {
    createNewVersion.mutate({ originalId: doc.id, source_data_json: doc.source_data_json });
  };

  const handleExportPDF = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      const docLabel = docTypeLabels[doc.document_type] || doc.document_type;
      pdf.save(`${docLabel}_v${doc.version_number || 1}.pdf`);
    } catch (e) {
      console.error("PDF export error:", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/security/documents")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">{docTypeLabels[doc.document_type] || doc.document_type}</h1>
              <p className="text-sm text-muted-foreground">
                v{doc.version_number || 1} · {site?.site_name || "—"}
              </p>
            </div>
          </div>
          <Badge variant={doc.status === "emitted" ? "default" : doc.status === "validated" ? "default" : "secondary"} className="text-sm px-3 py-1">
            {t(`docStatus${doc.status.charAt(0).toUpperCase()}${doc.status.slice(1).replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}` as any) || doc.status}
          </Badge>
        </div>

        {/* Status Flow */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              {statusFlow.filter(s => s !== "archived").map((step, i) => {
                const isActive = step === doc.status;
                const isPast = i < currentStepIndex;
                return (
                  <div key={step} className="flex items-center gap-2">
                    {i > 0 && <div className={`w-8 h-0.5 ${isPast ? "bg-primary" : "bg-muted"}`} />}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      isActive ? "bg-primary text-primary-foreground" : isPast ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {isPast && <CheckCircle className="h-3 w-3" />}
                      {t(`docStatus${step.charAt(0).toUpperCase()}${step.slice(1).replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}` as any) || step}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Document Preview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preview Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Pré-visualização do Documento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={previewRef} className="bg-muted/30 rounded-lg p-6 min-h-[400px] border">
                  {/* Rendered document preview based on source_data_json */}
                  <DocumentPreview
                    documentType={doc.document_type}
                    sourceData={sourceData}
                    system={system}
                    site={site}
                    devices={devices}
                    zones={zones}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Equipment Table for Conformity */}
            {devices.length > 0 && (doc.document_type === "conformity_declaration" || doc.document_type === "installation_certificate") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("equipment")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("zones")}</TableHead>
                        <TableHead>{t("type")}</TableHead>
                        <TableHead>{t("brand")}</TableHead>
                        <TableHead>{t("model")}</TableHead>
                        <TableHead>{t("reference")}</TableHead>
                        <TableHead className="text-right">{t("quantity")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devices.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell>{d.security_system_zones?.zone_name || "—"}</TableCell>
                          <TableCell>{d.device_type || "—"}</TableCell>
                          <TableCell>{d.brand || d.security_equipment_catalog?.brand || "—"}</TableCell>
                          <TableCell>{d.model || d.security_equipment_catalog?.model || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{d.reference || d.security_equipment_catalog?.reference || "—"}</TableCell>
                          <TableCell className="text-right">{d.quantity ?? 1}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Actions & History */}
          <div className="space-y-6">
            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("actions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {doc.status === "draft" && (
                  <>
                    <Textarea
                      placeholder="Notas de validação (opcional)"
                      value={validationNotes}
                      onChange={(e) => setValidationNotes(e.target.value)}
                      rows={2}
                    />
                    <Button onClick={handleMarkForValidation} className="w-full gap-2" variant="outline"
                      disabled={updateDocument.isPending}>
                      <Shield className="h-4 w-4" />
                      Marcar "Por Validar"
                    </Button>
                  </>
                )}

                {canValidate && doc.status === "por_validar" && (
                  <Button onClick={handleValidate} className="w-full gap-2"
                    disabled={validateDocument.isPending}>
                    <CheckCircle className="h-4 w-4" />
                    {t("validate")}
                  </Button>
                )}

                {canEmit && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full gap-2">
                        <Send className="h-4 w-4" />
                        Emitir Documento
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Emissão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Após emissão, o documento ficará disponível oficialmente.
                          Esta ação não pode ser desfeita — para alterações será necessário criar uma nova versão.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleEmit} disabled={emitDocument.isPending}>
                          {t("confirm")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {canCreateVersion && (
                  <Button onClick={handleNewVersion} variant="outline" className="w-full gap-2"
                    disabled={createNewVersion.isPending}>
                    <Copy className="h-4 w-4" />
                    Criar Nova Versão
                  </Button>
                )}

                {(doc.status === "emitted" || doc.status === "signed") && (
                  <Button onClick={handleExportPDF} variant="outline" className="w-full gap-2" disabled={exporting}>
                    <Download className="h-4 w-4" />
                    {exporting ? "A exportar..." : "Exportar PDF"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("details")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("type")}</span>
                  <span>{docTypeLabels[doc.document_type] || doc.document_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Versão</span>
                  <span>v{doc.version_number || 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("created")}</span>
                  <span>{format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")}</span>
                </div>
                {doc.emitted_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Emitido em</span>
                    <span>{format(new Date(doc.emitted_at), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                )}
                {doc.validation_notes && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-xs">Notas de validação</span>
                    <p className="mt-1">{doc.validation_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Version History */}
            {versions.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" /> {t("history")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {versions.map((v: any) => (
                      <div
                        key={v.id}
                        className={`flex items-center justify-between p-2 rounded text-sm cursor-pointer hover:bg-muted/50 ${v.id === doc.id ? "bg-muted" : ""}`}
                        onClick={() => v.id !== doc.id && navigate(`/dashboard/security/documents/${v.id}`)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">v{v.version_number}</span>
                          <Badge variant="secondary" className="text-xs">
                            {t(`docStatus${v.status.charAt(0).toUpperCase()}${v.status.slice(1).replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}` as any) || v.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(v.created_at), "dd/MM/yyyy")}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* Document Preview Component */
function DocumentPreview({
  documentType,
  sourceData,
  system,
  site,
  devices,
  zones,
}: {
  documentType: string;
  sourceData: any;
  system: any;
  site: any;
  devices: any[];
  zones: any[];
}) {
  const sd = sourceData || {};

  if (documentType === "installation_certificate" || documentType === "maintenance_certificate") {
    return (
      <div className="space-y-4 text-sm">
        <div className="text-center border-b pb-4">
          <h2 className="text-lg font-bold uppercase">
            {documentType === "installation_certificate"
              ? "Certificado de Instalação"
              : "Certificado de Manutenção"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Sistema de Segurança Eletrónica</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Proprietário</p>
            <p>{sd.owner_name || site?.onsite_responsible_name || "—"}</p>
          </div>
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Entidade Instaladora</p>
            <p>{sd.installer_company || system?.installer_company_name || "—"}</p>
          </div>
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Local da Instalação</p>
            <p>{site?.address_line_1 || "—"}</p>
            <p>{[site?.postal_code, site?.locality].filter(Boolean).join(" ")}</p>
          </div>
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Concelho / Distrito</p>
            <p>{[site?.county, site?.district].filter(Boolean).join(" / ") || "—"}</p>
          </div>
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Tipo de Sistema</p>
            <p>{system?.system_type || "—"}</p>
          </div>
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Data da Instalação</p>
            <p>{system?.installation_date ? format(new Date(system.installation_date), "dd/MM/yyyy") : "—"}</p>
          </div>
        </div>

        {devices.length > 0 && (
          <div className="pt-4 border-t">
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-2">Equipamentos Instalados</p>
            {devices.map((d: any, i: number) => (
              <p key={i} className="text-xs">
                • {d.security_system_zones?.zone_name || "—"}: {d.brand || d.security_equipment_catalog?.brand} {d.model || d.security_equipment_catalog?.model} (x{d.quantity ?? 1})
              </p>
            ))}
          </div>
        )}

        <div className="pt-6 grid grid-cols-3 gap-4 text-center border-t">
          <div>
            <div className="h-12 border-b border-dashed mb-1" />
            <p className="text-xs text-muted-foreground">Técnico Instalador</p>
          </div>
          <div>
            <div className="h-12 border-b border-dashed mb-1" />
            <p className="text-xs text-muted-foreground">Técnico Responsável</p>
          </div>
          <div>
            <div className="h-12 border-b border-dashed mb-1" />
            <p className="text-xs text-muted-foreground">Proprietário</p>
          </div>
        </div>
      </div>
    );
  }

  if (documentType === "conformity_declaration") {
    return (
      <div className="space-y-4 text-sm">
        <div className="text-center border-b pb-4">
          <h2 className="text-lg font-bold uppercase">Declaração de Conformidade</h2>
          <p className="text-xs text-muted-foreground mt-1">Nos termos da legislação aplicável</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Entidade Emitente</p>
            <p>{sd.emitter_company || "—"}</p>
            <p className="text-xs">{sd.emitter_nipc ? `NIPC: ${sd.emitter_nipc}` : ""}</p>
          </div>
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Local da Instalação</p>
            <p>{site?.site_name || "—"}</p>
            <p className="text-xs">{site?.address_line_1}</p>
            <p className="text-xs">{[site?.postal_code, site?.locality].filter(Boolean).join(" ")}</p>
          </div>
        </div>

        {devices.length > 0 && (
          <div className="pt-4 border-t">
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-2">Lista de Equipamentos</p>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Designação</th>
                    <th className="text-left p-2">Modelo</th>
                    <th className="text-left p-2">Referência</th>
                    <th className="text-right p-2">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{d.device_type || d.security_system_zones?.zone_name || "—"}</td>
                      <td className="p-2">{d.model || d.security_equipment_catalog?.model || "—"}</td>
                      <td className="p-2 font-mono">{d.reference || d.security_equipment_catalog?.reference || "—"}</td>
                      <td className="p-2 text-right">{d.quantity ?? 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Anotações Especiais</p>
          <p className="text-xs">{sd.special_notes || "Sem anotações."}</p>
        </div>

        <div className="pt-6 grid grid-cols-3 gap-4 text-center border-t">
          <div>
            <div className="h-12 border-b border-dashed mb-1" />
            <p className="text-xs text-muted-foreground">Instalador</p>
          </div>
          <div>
            <div className="h-12 border-b border-dashed mb-1" />
            <p className="text-xs text-muted-foreground">Proprietário / Usufrutuário</p>
          </div>
          <div>
            <div className="h-12 border-b border-dashed mb-1" />
            <p className="text-xs text-muted-foreground">Técnico Responsável</p>
          </div>
        </div>
      </div>
    );
  }

  if (documentType === "occurrence_book") {
    return (
      <div className="space-y-4 text-sm">
        <div className="text-center border-b pb-4">
          <h2 className="text-lg font-bold uppercase">Livro de Registo de Ocorrências</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Proprietário do Sistema</p>
            <p>{sd.owner_name || site?.onsite_responsible_name || "—"}</p>
          </div>
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Localização do Sistema</p>
            <p>{site?.address_line_1 || "—"}</p>
          </div>
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Pessoa Competente</p>
            <p>{sd.competent_person || "—"}</p>
          </div>
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Empresa de Manutenção</p>
            <p>{system?.maintenance_company_name || "—"}</p>
          </div>
        </div>
        <div className="pt-4 border-t">
          <p className="font-semibold text-xs text-muted-foreground uppercase mb-2">Registo Cronológico</p>
          <div className="border rounded p-4 min-h-[100px] bg-background">
            <p className="text-xs text-muted-foreground italic">Os registos de ocorrências serão preenchidos aqui...</p>
          </div>
        </div>
      </div>
    );
  }

  if (documentType === "technical_sheet") {
    return (
      <div className="space-y-4 text-sm">
        <div className="text-center border-b pb-4">
          <h2 className="text-lg font-bold uppercase">Ficha Técnica do Sistema</h2>
          <p className="text-xs text-muted-foreground mt-1">Sistema de Segurança Eletrónica</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Tipo de Sistema</p>
            <p className="capitalize">{system?.system_type || "—"}</p>
          </div>
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Marca / Modelo Principal</p>
            <p>{[system?.main_brand, system?.main_model].filter(Boolean).join(" ") || "—"}</p>
          </div>
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Local</p>
            <p>{site?.site_name || "—"}</p>
            <p className="text-xs">{site?.address_line_1}</p>
            <p className="text-xs">{[site?.postal_code, site?.locality].filter(Boolean).join(" ")}</p>
          </div>
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Proprietário / Cliente</p>
            <p>{sd.client_name || sd.owner_name || site?.onsite_responsible_name || "—"}</p>
            {sd.client_nif && <p className="text-xs">NIF: {sd.client_nif}</p>}
          </div>
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Entidade Instaladora</p>
            <p>{sd.installer_company || system?.installer_company_name || "—"}</p>
          </div>
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Empresa de Manutenção</p>
            <p>{sd.maintenance_company || system?.maintenance_company_name || "—"}</p>
          </div>
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Data de Instalação</p>
            <p>{system?.installation_date ? format(new Date(system.installation_date), "dd/MM/yyyy") : "—"}</p>
          </div>
          <div>
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Comissionamento</p>
            <p>{system?.commissioning_date ? format(new Date(system.commissioning_date), "dd/MM/yyyy") : "—"}</p>
          </div>
        </div>

        {zones.length > 0 && (
          <div className="pt-4 border-t">
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-2">Zonas Protegidas</p>
            <div className="flex flex-wrap gap-2">
              {zones.map((z: any, i: number) => (
                <span key={i} className="px-2 py-1 rounded bg-muted text-xs">{z.zone_name} ({z.zone_type})</span>
              ))}
            </div>
          </div>
        )}

        {devices.length > 0 && (
          <div className="pt-4 border-t">
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-2">Lista de Equipamentos</p>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Zona</th>
                    <th className="text-left p-2">Tipo</th>
                    <th className="text-left p-2">Marca</th>
                    <th className="text-left p-2">Modelo</th>
                    <th className="text-left p-2">S/N</th>
                    <th className="text-right p-2">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{d.security_system_zones?.zone_name || "—"}</td>
                      <td className="p-2 capitalize">{d.device_type || "—"}</td>
                      <td className="p-2">{d.brand || d.security_equipment_catalog?.brand || "—"}</td>
                      <td className="p-2">{d.model || d.security_equipment_catalog?.model || "—"}</td>
                      <td className="p-2 font-mono">{d.serial_number || "—"}</td>
                      <td className="p-2 text-right">{d.quantity ?? 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {system?.integration_notes && (
          <div className="pt-4 border-t">
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Integração com Outros Sistemas</p>
            <p className="text-xs">{system.integration_notes}</p>
          </div>
        )}

        {system?.technical_notes && (
          <div className="pt-4 border-t">
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Notas Técnicas</p>
            <p className="text-xs">{system.technical_notes}</p>
          </div>
        )}
      </div>
    );
  }

  // Generic fallback
  return (
    <div className="space-y-4 text-sm">
      <div className="text-center border-b pb-4">
        <h2 className="text-lg font-bold uppercase">{docTypeLabels[documentType] || documentType}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Local</p>
          <p>{site?.site_name || "—"}</p>
          <p className="text-xs">{site?.address_line_1}</p>
        </div>
        <div>
          <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Sistema</p>
          <p>{system?.system_type || "—"}</p>
          <p className="text-xs">{[system?.main_brand, system?.main_model].filter(Boolean).join(" ")}</p>
        </div>
      </div>
      {sourceData && (
        <div className="pt-4 border-t">
          <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Dados fonte</p>
          <pre className="text-xs bg-background p-3 rounded border overflow-auto max-h-48">
            {JSON.stringify(sourceData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
