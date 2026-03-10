import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSecuritySystems } from "@/hooks/security/useSecuritySystems";
import { useSecurityMaintenancePlans, useSecurityMaintenanceVisits } from "@/hooks/security/useSecurityMaintenance";
import { useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultSystemId?: string;
  defaultPlanId?: string;
}

export function SecurityVisitDialog({ open, onOpenChange, defaultSystemId, defaultPlanId }: Props) {
  const { systems } = useSecuritySystems();
  const { plans } = useSecurityMaintenancePlans();
  const { createVisit } = useSecurityMaintenanceVisits();
  const activeSystems = systems.filter((s: any) => s.status === "active");

  const [form, setForm] = useState({
    system_id: defaultSystemId || "",
    maintenance_plan_id: defaultPlanId || "",
    scheduled_at: "",
    notes: "",
  });

  const handleSubmit = () => {
    if (!form.system_id || !form.scheduled_at) return;
    createVisit.mutate({
      system_id: form.system_id,
      maintenance_plan_id: form.maintenance_plan_id || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      visit_status: "scheduled",
      notes: form.notes || null,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setForm({ system_id: defaultSystemId || "", maintenance_plan_id: defaultPlanId || "", scheduled_at: "", notes: "" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Agendar Visita de Manutenção</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Sistema</Label>
            <Select value={form.system_id} onValueChange={(v) => setForm(p => ({ ...p, system_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecionar sistema..." /></SelectTrigger>
              <SelectContent>
                {activeSystems.map((s: any) => {
                  const site = s.security_installation_sites as any;
                  return <SelectItem key={s.id} value={s.id}>{site?.site_name || s.system_type} · {s.system_type}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          {plans.length > 0 && (
            <div>
              <Label>Plano (opcional)</Label>
              <Select value={form.maintenance_plan_id} onValueChange={(v) => setForm(p => ({ ...p, maintenance_plan_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sem plano associado" /></SelectTrigger>
                <SelectContent>
                  {plans.map((p: any) => {
                    const sys = p.security_systems as any;
                    const site = sys?.security_installation_sites as any;
                    return <SelectItem key={p.id} value={p.id}>{site?.site_name || "Plano"} · {p.frequency_type}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Data e Hora</Label>
            <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm(p => ({ ...p, scheduled_at: e.target.value }))} />
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Instruções para o técnico..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.system_id || !form.scheduled_at || createVisit.isPending}>
              Agendar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
