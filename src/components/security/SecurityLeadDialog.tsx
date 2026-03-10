import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSecurityLeads } from "@/hooks/security/useSecurityLeads";
import { useSecurityPartners } from "@/hooks/security/useSecurityPartners";
import { useSecurityClients } from "@/hooks/security/useSecurityClients";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SecurityLeadDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation("security");
  const { createLead } = useSecurityLeads();
  const { partners } = useSecurityPartners();
  const { clients } = useSecurityClients();

  const [form, setForm] = useState({
    client_name: "",
    client_id: "",
    client_type: "particular",
    origin: "manual",
    partner_id: "",
    system_type: "cctv",
    request_type: "installation",
    installation_address: "",
    need_description: "",
    priority: "medium",
    estimated_value: "",
  });

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = () => {
    const payload: any = { ...form };
    if (!payload.client_id) delete payload.client_id;
    if (!payload.partner_id) delete payload.partner_id;
    if (payload.estimated_value) payload.estimated_value = Number(payload.estimated_value);
    else delete payload.estimated_value;

    createLead.mutate(payload, {
      onSuccess: () => {
        onOpenChange(false);
        setForm({ client_name: "", client_id: "", client_type: "particular", origin: "manual", partner_id: "", system_type: "cctv", request_type: "installation", installation_address: "", need_description: "", priority: "medium", estimated_value: "" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lead de Segurança</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("clientName")}</Label>
              <Input value={form.client_name} onChange={(e) => set("client_name", e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div>
              <Label>{t("clientType")}</Label>
              <Select value={form.client_type} onValueChange={(v) => set("client_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="particular">{t("clientTypeParticular")}</SelectItem>
                  <SelectItem value="empresa">{t("clientTypeCompany")}</SelectItem>
                  <SelectItem value="condominio">{t("clientTypeCondominium")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {clients.length > 0 && (
            <div>
              <Label>Cliente Existente (opcional)</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Origem</Label>
              <Select value={form.origin} onValueChange={(v) => set("origin", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["manual", "direct", "partner", "site", "phone", "email", "whatsapp", "telegram"].map((o) => (
                    <SelectItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {partners.length > 0 && (
            <div>
              <Label>{t("partner")}</Label>
              <Select value={form.partner_id} onValueChange={(v) => set("partner_id", v)}>
                <SelectTrigger><SelectValue placeholder={t("selectPartner")} /></SelectTrigger>
                <SelectContent>
                  {partners.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
              <Label>{t("requestType")}</Label>
              <Select value={form.request_type} onValueChange={(v) => set("request_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="certification">{t("typeCertification")}</SelectItem>
                  <SelectItem value="installation">{t("typeInstallation")}</SelectItem>
                  <SelectItem value="maintenance">{t("typeMaintenance")}</SelectItem>
                  <SelectItem value="expansion">{t("typeExpansion")}</SelectItem>
                  <SelectItem value="regularization">{t("typeRegularization")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{t("installationAddress")}</Label>
            <Input value={form.installation_address} onChange={(e) => set("installation_address", e.target.value)} placeholder="Morada completa" />
          </div>

          <div>
            <Label>Valor Estimado (€)</Label>
            <Input type="number" value={form.estimated_value} onChange={(e) => set("estimated_value", e.target.value)} placeholder="0.00" />
          </div>

          <div>
            <Label>Descrição da Necessidade</Label>
            <Textarea value={form.need_description} onChange={(e) => set("need_description", e.target.value)} rows={3} placeholder="Descreva a necessidade do cliente..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button onClick={handleSubmit} disabled={!form.client_name || createLead.isPending}>
              {t("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
