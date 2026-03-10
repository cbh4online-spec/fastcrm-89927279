import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useSecurityDocuments } from "@/hooks/security/useSecurityDocuments";
import { useSecuritySystems } from "@/hooks/security/useSecuritySystems";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSystemId?: string;
}

export function SecurityDocumentCreateDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation("security");
  const { createDocument } = useSecurityDocuments();
  const { systems } = useSecuritySystems();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    system_id: "",
    document_type: "",
    validation_notes: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const docTypes = [
    { value: "installation_certificate", label: t("docTypeInstallationCert") },
    { value: "maintenance_certificate", label: t("docTypeMaintenanceCert") },
    { value: "conformity_declaration", label: t("docTypeConformity") },
    { value: "occurrence_book", label: t("docTypeOccurrenceBook") },
    { value: "technical_sheet", label: t("docTypeTechnicalSheet") },
    { value: "annex", label: t("docTypeAnnex") },
    { value: "other", label: t("docTypeOther") },
  ];

  const handleSubmit = () => {
    if (!form.system_id || !form.document_type) return;

    const selectedSystem = systems.find((s: any) => s.id === form.system_id) as any;
    const site = selectedSystem?.security_installation_sites;

    // Build source_data_json from system info
    const source_data_json = {
      system_type: selectedSystem?.system_type,
      main_brand: selectedSystem?.main_brand,
      main_model: selectedSystem?.main_model,
      installation_date: selectedSystem?.installation_date,
      installer_company: selectedSystem?.installer_company_name,
      maintenance_company: selectedSystem?.maintenance_company_name,
      site_name: site?.site_name,
      address: site?.address_line_1,
      postal_code: site?.postal_code,
      locality: site?.locality,
      county: site?.county,
      district: site?.district,
      owner_name: site?.onsite_responsible_name,
      owner_phone: site?.onsite_responsible_phone,
      generated_at: new Date().toISOString(),
    };

    createDocument.mutate(
      {
        system_id: form.system_id,
        site_id: site?.id || null,
        document_type: form.document_type,
        status: "draft",
        template_key: form.document_type,
        source_data_json,
        validation_notes: form.validation_notes || null,
      },
      {
        onSuccess: (data: any) => {
          onOpenChange(false);
          setForm({ system_id: "", document_type: "", validation_notes: "" });
          if (data?.id) navigate(`/dashboard/security/documents/${data.id}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createDraft")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("systems")} *</Label>
            <Select value={form.system_id} onValueChange={(v) => set("system_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar sistema" /></SelectTrigger>
              <SelectContent>
                {systems.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {(s.security_installation_sites as any)?.site_name || "Sistema"} — {s.system_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("type")} *</Label>
            <Select value={form.document_type} onValueChange={(v) => set("document_type", v)}>
              <SelectTrigger><SelectValue placeholder="Tipo de documento" /></SelectTrigger>
              <SelectContent>
                {docTypes.map(dt => (
                  <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("notes")}</Label>
            <Textarea
              value={form.validation_notes}
              onChange={(e) => set("validation_notes", e.target.value)}
              placeholder="Notas adicionais (opcional)"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.system_id || !form.document_type || createDocument.isPending}
            >
              {t("createDraft")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
