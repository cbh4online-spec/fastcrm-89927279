import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityDocument, useSecurityDocuments, useDocumentVersionHistory } from "@/hooks/security/useSecurityDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  SecurityDocumentA4Template,
  DocSection,
  DocFieldGrid,
  DocEquipmentTable,
  DocSignatureBlock,
} from "@/components/security/SecurityDocumentA4Template";
import { ArrowLeft, FileText, CheckCircle, Send, Copy, Clock, Shield, Download, Eye, EyeOff } from "lucide-react";
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
  const [showA4Preview, setShowA4Preview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const system = doc?.security_systems as any;
  const site = system?.security_installation_sites as any;
  const rawDevices = system?.security_installed_devices as any[] || [];
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

  // Map devices for A4 template
  const devices = rawDevices.map((d: any) => ({
    zone: d.security_system_zones?.zone_name,
    type: d.device_type,
    brand: d.brand || d.security_equipment_catalog?.brand,
    model: d.model || d.security_equipment_catalog?.model,
    reference: d.reference || d.security_equipment_catalog?.reference,
    serial: d.serial_number,
    qty: d.quantity ?? 1,
  }));

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
    // Temporarily show A4 preview for export
    const wasShowing = showA4Preview;
    if (!wasShowing) setShowA4Preview(true);

    // Wait for render
    await new Promise(r => setTimeout(r, 100));

    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: 794,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;

      // Handle multi-page if content is tall
      const pageH = pdf.internal.pageSize.getHeight();
      if (pdfH <= pageH) {
        pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      } else {
        let y = 0;
        let page = 0;
        while (y < canvas.height) {
          if (page > 0) pdf.addPage();
          const sliceH = Math.min(canvas.height - y, (pageH / pdfW) * canvas.width);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext("2d");
          ctx?.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const sliceImg = sliceCanvas.toDataURL("image/png");
          const h = (sliceH * pdfW) / canvas.width;
          pdf.addImage(sliceImg, "PNG", 0, 0, pdfW, h);
          y += sliceH;
          page++;
        }
      }

      const docLabel = docTypeLabels[doc.document_type] || doc.document_type;
      pdf.save(`${docLabel}_v${doc.version_number || 1}.pdf`);
    } catch (e) {
      console.error("PDF export error:", e);
    } finally {
      if (!wasShowing) setShowA4Preview(false);
      setExporting(false);
    }
  };

  const sd = sourceData || {};

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
            {/* Toggle A4 Preview */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowA4Preview(!showA4Preview)}
              >
                {showA4Preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showA4Preview ? "Vista Normal" : "Vista A4 (PDF)"}
              </Button>
            </div>

            {showA4Preview ? (
              /* A4 Professional Preview */
              <div className="overflow-x-auto">
                <div ref={previewRef}>
                  <SecurityDocumentA4Template
                    documentType={doc.document_type}
                    versionNumber={doc.version_number || 1}
                    emittedAt={doc.emitted_at}
                    companyName={sd.installer_company}
                  >
                    <A4DocumentContent
                      documentType={doc.document_type}
                      sourceData={sd}
                      system={system}
                      site={site}
                      devices={devices}
                      zones={zones}
                    />
                  </SecurityDocumentA4Template>
                </div>
              </div>
            ) : (
              /* Simple Preview Card */
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Pré-visualização
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 rounded-lg p-6 min-h-[300px] border space-y-4 text-sm">
                    <SimplePreview
                      documentType={doc.document_type}
                      sourceData={sd}
                      system={system}
                      site={site}
                      devices={rawDevices}
                      zones={zones}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Actions & History */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">{t("actions")}</CardTitle></CardHeader>
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
                          Para alterações será necessário criar uma nova versão.
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

                <Button onClick={handleExportPDF} variant="outline" className="w-full gap-2" disabled={exporting}>
                  <Download className="h-4 w-4" />
                  {exporting ? "A exportar..." : "Exportar PDF"}
                </Button>
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader><CardTitle className="text-base">{t("details")}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label={t("type")} value={docTypeLabels[doc.document_type] || doc.document_type} />
                <InfoRow label="Versão" value={`v${doc.version_number || 1}`} />
                <InfoRow label={t("created")} value={format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")} />
                {doc.emitted_at && <InfoRow label="Emitido em" value={format(new Date(doc.emitted_at), "dd/MM/yyyy HH:mm")} />}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

/* ─── A4 Document Content (for PDF export) ─── */

function A4DocumentContent({
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
    const isMaintenance = documentType === "maintenance_certificate";
    return (
      <>
        <DocSection title="Identificação">
          <DocFieldGrid
            fields={[
              { label: "Proprietário / Usufrutuário", value: sd.owner_name || site?.onsite_responsible_name },
              { label: isMaintenance ? "Empresa de Manutenção" : "Entidade Instaladora", value: sd.installer_company || system?.installer_company_name },
              { label: "Local da Instalação", value: [site?.address_line_1, site?.postal_code, site?.locality].filter(Boolean).join(", ") },
              { label: "Concelho / Distrito", value: [site?.county, site?.district].filter(Boolean).join(" / ") },
              { label: "Tipo de Sistema", value: system?.system_type },
              { label: isMaintenance ? "Data da Manutenção" : "Data da Instalação", value: system?.installation_date ? format(new Date(system.installation_date), "dd/MM/yyyy") : undefined },
            ]}
          />
        </DocSection>

        {devices.length > 0 && (
          <DocSection title="Equipamentos Instalados">
            <DocEquipmentTable devices={devices} />
          </DocSection>
        )}

        {zones.length > 0 && (
          <DocSection title="Zonas Protegidas">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {zones.map((z: any, i: number) => (
                <span key={i} style={{ padding: "3px 10px", background: "#f5f5f5", borderRadius: "4px", fontSize: "11px" }}>
                  {z.zone_name} ({z.zone_type})
                </span>
              ))}
            </div>
          </DocSection>
        )}

        {sd.special_notes && (
          <DocSection title="Observações">
            <p style={{ fontSize: "11px" }}>{sd.special_notes}</p>
          </DocSection>
        )}

        <DocSignatureBlock labels={["Técnico Instalador", "Técnico Responsável", "Proprietário"]} />
      </>
    );
  }

  if (documentType === "conformity_declaration") {
    return (
      <>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <p style={{ fontSize: "12px", color: "#666" }}>Nos termos da legislação aplicável</p>
        </div>

        <DocSection title="Entidade Emitente">
          <DocFieldGrid
            fields={[
              { label: "Designação", value: sd.emitter_company || sd.installer_company },
              { label: "NIPC", value: sd.emitter_nipc || sd.client_nif },
              { label: "Morada", value: sd.emitter_address || sd.client_fiscal_address },
            ]}
          />
        </DocSection>

        <DocSection title="Local da Instalação">
          <DocFieldGrid
            fields={[
              { label: "Designação", value: site?.site_name },
              { label: "Morada", value: [site?.address_line_1, site?.postal_code, site?.locality].filter(Boolean).join(", ") },
              { label: "Proprietário", value: sd.owner_name || site?.onsite_responsible_name },
            ]}
          />
        </DocSection>

        {devices.length > 0 && (
          <DocSection title="Lista de Equipamentos">
            <DocEquipmentTable devices={devices} />
          </DocSection>
        )}

        {sd.special_notes && (
          <DocSection title="Anotações Especiais">
            <p style={{ fontSize: "11px" }}>{sd.special_notes}</p>
          </DocSection>
        )}

        <DocSignatureBlock labels={["Instalador", "Proprietário / Usufrutuário", "Técnico Responsável"]} />
      </>
    );
  }

  if (documentType === "technical_sheet") {
    return (
      <>
        <DocSection title="Dados do Sistema">
          <DocFieldGrid
            fields={[
              { label: "Tipo de Sistema", value: system?.system_type },
              { label: "Marca / Modelo Principal", value: [system?.main_brand, system?.main_model].filter(Boolean).join(" ") },
              { label: "Local", value: [site?.site_name, site?.address_line_1].filter(Boolean).join(" — ") },
              { label: "Proprietário / Cliente", value: sd.client_name || sd.owner_name || site?.onsite_responsible_name },
              { label: "NIF", value: sd.client_nif },
              { label: "Entidade Instaladora", value: sd.installer_company || system?.installer_company_name },
              { label: "Empresa de Manutenção", value: sd.maintenance_company || system?.maintenance_company_name },
              { label: "Data de Instalação", value: system?.installation_date ? format(new Date(system.installation_date), "dd/MM/yyyy") : undefined },
            ]}
          />
        </DocSection>

        {zones.length > 0 && (
          <DocSection title="Zonas Protegidas">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {zones.map((z: any, i: number) => (
                <span key={i} style={{ padding: "3px 10px", background: "#f5f5f5", borderRadius: "4px", fontSize: "11px" }}>
                  {z.zone_name} ({z.zone_type})
                </span>
              ))}
            </div>
          </DocSection>
        )}

        {devices.length > 0 && (
          <DocSection title="Lista de Equipamentos">
            <DocEquipmentTable devices={devices} />
          </DocSection>
        )}

        {system?.integration_notes && (
          <DocSection title="Integração com Outros Sistemas">
            <p style={{ fontSize: "11px" }}>{system.integration_notes}</p>
          </DocSection>
        )}

        {system?.technical_notes && (
          <DocSection title="Notas Técnicas">
            <p style={{ fontSize: "11px" }}>{system.technical_notes}</p>
          </DocSection>
        )}
      </>
    );
  }

  if (documentType === "occurrence_book") {
    return (
      <>
        <DocSection title="Identificação do Sistema">
          <DocFieldGrid
            fields={[
              { label: "Proprietário", value: sd.owner_name || site?.onsite_responsible_name },
              { label: "Localização", value: site?.address_line_1 },
              { label: "Pessoa Competente", value: sd.competent_person },
              { label: "Empresa de Manutenção", value: system?.maintenance_company_name },
            ]}
          />
        </DocSection>

        <DocSection title="Registo Cronológico">
          <div style={{ border: "1px solid #ddd", borderRadius: "4px", padding: "16px", minHeight: "200px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  <th style={{ textAlign: "left", padding: "4px 8px", width: "15%" }}>Data</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", width: "15%" }}>Tipo</th>
                  <th style={{ textAlign: "left", padding: "4px 8px" }}>Descrição</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", width: "20%" }}>Responsável</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map(i => (
                  <tr key={i} style={{ borderBottom: "1px dotted #eee", height: "28px" }}>
                    <td style={{ padding: "4px 8px" }} />
                    <td style={{ padding: "4px 8px" }} />
                    <td style={{ padding: "4px 8px" }} />
                    <td style={{ padding: "4px 8px" }} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DocSection>
      </>
    );
  }

  // Generic fallback
  return (
    <>
      <DocSection title="Dados">
        <DocFieldGrid
          fields={[
            { label: "Local", value: site?.site_name },
            { label: "Morada", value: site?.address_line_1 },
            { label: "Sistema", value: system?.system_type },
          ]}
        />
      </DocSection>
      {sourceData && (
        <DocSection title="Dados Fonte">
          <pre style={{ fontSize: "10px", background: "#f5f5f5", padding: "12px", borderRadius: "4px", overflow: "auto", maxHeight: "300px" }}>
            {JSON.stringify(sourceData, null, 2)}
          </pre>
        </DocSection>
      )}
    </>
  );
}

/* ─── Simple Preview (non-A4, for quick viewing) ─── */

function SimplePreview({
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

  const fields = [
    { label: "Proprietário", value: sd.owner_name || site?.onsite_responsible_name },
    { label: "Entidade Instaladora", value: sd.installer_company || system?.installer_company_name },
    { label: "Local", value: site?.site_name },
    { label: "Morada", value: [site?.address_line_1, site?.postal_code, site?.locality].filter(Boolean).join(", ") },
    { label: "Tipo de Sistema", value: system?.system_type },
  ].filter(f => f.value);

  return (
    <>
      <div className="text-center border-b pb-3 mb-4">
        <h2 className="text-lg font-bold uppercase">{docTypeLabels[documentType] || documentType}</h2>
        <p className="text-xs text-muted-foreground">Sistema de Segurança Eletrónica</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {fields.map((f, i) => (
          <div key={i}>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">{f.label}</p>
            <p className="capitalize">{f.value}</p>
          </div>
        ))}
      </div>

      {devices.length > 0 && (
        <div className="pt-3 mt-3 border-t">
          <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">Equipamentos ({devices.length})</p>
          {devices.slice(0, 5).map((d: any, i: number) => (
            <p key={i} className="text-xs">
              • {d.security_system_zones?.zone_name || "—"}: {d.brand || d.security_equipment_catalog?.brand} {d.model || d.security_equipment_catalog?.model} (x{d.quantity ?? 1})
            </p>
          ))}
          {devices.length > 5 && <p className="text-xs text-muted-foreground">+ {devices.length - 5} mais...</p>}
        </div>
      )}

      {zones.length > 0 && (
        <div className="pt-3 mt-3 border-t">
          <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">Zonas ({zones.length})</p>
          <div className="flex flex-wrap gap-1">
            {zones.map((z: any, i: number) => (
              <span key={i} className="px-2 py-0.5 bg-muted rounded text-xs">{z.zone_name}</span>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4 mt-4 border-t text-center">
        <p className="text-xs text-muted-foreground">
          Use "Vista A4 (PDF)" para ver o template profissional completo
        </p>
      </div>
    </>
  );
}
