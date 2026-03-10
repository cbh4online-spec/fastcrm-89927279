import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useSecurityOccurrences } from "@/hooks/security/useSecurityOccurrences";
import { useSecuritySystems } from "@/hooks/security/useSecuritySystems";
import { useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SecurityOccurrenceDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation("security");
  const { createOccurrence } = useSecurityOccurrences();
  const { systems } = useSecuritySystems();

  const [form, setForm] = useState({
    system_id: "",
    occurrence_type: "fault",
    occurrence_origin: "client",
    severity: "medium",
    title: "",
    description: "",
    impact_on_client: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.system_id || !form.title) return;
    createOccurrence.mutate(
      {
        ...form,
        status: "open",
        occurred_at: new Date().toISOString(),
        site_id: (systems.find((s: any) => s.id === form.system_id) as any)?.site_id || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm({ system_id: "", occurrence_type: "fault", occurrence_origin: "client", severity: "medium", title: "", description: "", impact_on_client: "" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("occurrences")} — {t("addNew")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
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
          <div><Label>Título *</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("type")}</Label>
              <Select value={form.occurrence_type} onValueChange={(v) => set("occurrence_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fault">{t("occurrenceTypeFault")}</SelectItem>
                  <SelectItem value="deactivation">{t("occurrenceTypeDeactivation")}</SelectItem>
                  <SelectItem value="preventive">{t("occurrenceTypePreventive")}</SelectItem>
                  <SelectItem value="incident">{t("occurrenceTypeIncident")}</SelectItem>
                  <SelectItem value="alert">{t("occurrenceTypeAlert")}</SelectItem>
                  <SelectItem value="inspection">{t("occurrenceTypeInspection")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severidade</Label>
              <Select value={form.severity} onValueChange={(v) => set("severity", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("severityLow")}</SelectItem>
                  <SelectItem value="medium">{t("severityMedium")}</SelectItem>
                  <SelectItem value="high">{t("severityHigh")}</SelectItem>
                  <SelectItem value="critical">{t("severityCritical")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Origem</Label>
            <Select value={form.occurrence_origin} onValueChange={(v) => set("occurrence_origin", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="client">{t("occurrenceOriginClient")}</SelectItem>
                <SelectItem value="partner">{t("occurrenceOriginPartner")}</SelectItem>
                <SelectItem value="technician">{t("occurrenceOriginTechnician")}</SelectItem>
                <SelectItem value="automation">{t("occurrenceOriginAutomation")}</SelectItem>
                <SelectItem value="system">{t("occurrenceOriginSystem")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} /></div>
          <div><Label>Impacto no Cliente</Label><Textarea value={form.impact_on_client} onChange={(e) => set("impact_on_client", e.target.value)} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button onClick={handleSubmit} disabled={!form.system_id || !form.title || createOccurrence.isPending}>{t("save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
