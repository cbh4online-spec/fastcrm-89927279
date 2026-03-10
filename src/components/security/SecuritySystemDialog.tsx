import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSecuritySystems } from "@/hooks/security/useSecuritySystems";
import { useSecurityClients } from "@/hooks/security/useSecurityClients";
import { useSecuritySites } from "@/hooks/security/useSecuritySites";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: {
    site_id?: string;
    client_id?: string;
    contract_id?: string;
    system_type?: string;
  };
}

export function SecuritySystemDialog({ open, onOpenChange, defaults }: Props) {
  const { t } = useTranslation("security");
  const { createSystem } = useSecuritySystems();
  const { clients } = useSecurityClients();
  const { sites } = useSecuritySites();

  const [form, setForm] = useState({
    system_type: defaults?.system_type || "cctv",
    lifecycle_type: "new_installation",
    site_id: defaults?.site_id || "",
    client_id: defaults?.client_id || "",
    contract_id: defaults?.contract_id || "",
    installation_date: "",
    main_brand: "",
    main_model: "",
    installer_company_name: "",
    maintenance_company_name: "",
    protected_zones_summary: "",
    technical_notes: "",
    integration_notes: "",
  });

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = () => {
    const payload: any = { ...form, status: "draft" };
    if (!payload.site_id) delete payload.site_id;
    if (!payload.client_id) delete payload.client_id;
    if (!payload.contract_id) delete payload.contract_id;
    if (!payload.installation_date) delete payload.installation_date;

    createSystem.mutate(payload, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Sistema / Instalação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("systemType")}</Label>
              <Select value={form.system_type} onValueChange={(v) => set("system_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cctv">{t("typeCctv")}</SelectItem>
                  <SelectItem value="intrusion">{t("typeIntrusion")}</SelectItem>
                  <SelectItem value="sadi">{t("typeSadi")}</SelectItem>
                  <SelectItem value="access_control">{t("typeAccessControl")}</SelectItem>
                  <SelectItem value="mixed">{t("typeMixed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ciclo de Vida</Label>
              <Select value={form.lifecycle_type} onValueChange={(v) => set("lifecycle_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_installation">{t("lifecycleNew")}</SelectItem>
                  <SelectItem value="existing_installation">{t("lifecycleExisting")}</SelectItem>
                  <SelectItem value="preventive_maintenance">{t("lifecyclePreventive")}</SelectItem>
                  <SelectItem value="certification">{t("lifecycleCertification")}</SelectItem>
                  <SelectItem value="expansion">{t("lifecycleExpansion")}</SelectItem>
                  <SelectItem value="regularization">{t("lifecycleRegularization")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {clients.length > 0 && (
            <div>
              <Label>Cliente</Label>
              <Select value={form.client_id} onValueChange={(v) => set("client_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar cliente..." /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {sites.length > 0 && (
            <div>
              <Label>Local de Instalação</Label>
              <Select value={form.site_id} onValueChange={(v) => set("site_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar local..." /></SelectTrigger>
                <SelectContent>
                  {sites.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.site_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>{t("installationDate")}</Label>
            <Input type="date" value={form.installation_date} onChange={(e) => set("installation_date", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("brand")}</Label>
              <Input value={form.main_brand} onChange={(e) => set("main_brand", e.target.value)} placeholder="Ex: Dahua" />
            </div>
            <div>
              <Label>{t("model")}</Label>
              <Input value={form.main_model} onChange={(e) => set("main_model", e.target.value)} placeholder="Ex: XVR5104HS" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("installerCompany")}</Label>
              <Input value={form.installer_company_name} onChange={(e) => set("installer_company_name", e.target.value)} />
            </div>
            <div>
              <Label>{t("maintenanceCompany")}</Label>
              <Input value={form.maintenance_company_name} onChange={(e) => set("maintenance_company_name", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Zonas Protegidas</Label>
            <Textarea value={form.protected_zones_summary} onChange={(e) => set("protected_zones_summary", e.target.value)} rows={2} placeholder="Ex: Entrada, Garagem, Sala de máquinas" />
          </div>

          <div>
            <Label>Notas Técnicas</Label>
            <Textarea value={form.technical_notes} onChange={(e) => set("technical_notes", e.target.value)} rows={2} />
          </div>

          <div>
            <Label>Integração com Outros Sistemas</Label>
            <Textarea value={form.integration_notes} onChange={(e) => set("integration_notes", e.target.value)} rows={2} placeholder="Ex: Integrado com sistema de alarme..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button onClick={handleSubmit} disabled={createSystem.isPending}>
              {t("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
