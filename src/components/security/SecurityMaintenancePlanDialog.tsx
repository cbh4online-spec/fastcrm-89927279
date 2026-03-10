import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSecuritySystems } from "@/hooks/security/useSecuritySystems";
import { useSecurityMaintenancePlans } from "@/hooks/security/useSecurityMaintenance";
import { useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultSystemId?: string;
}

export function SecurityMaintenancePlanDialog({ open, onOpenChange, defaultSystemId }: Props) {
  const { systems } = useSecuritySystems();
  const { createPlan } = useSecurityMaintenancePlans();
  const activeSystems = systems.filter((s: any) => s.status === "active");

  const [form, setForm] = useState({
    system_id: defaultSystemId || "",
    frequency_type: "quarterly",
    frequency_value: "3",
    next_visit_at: "",
    status: "active",
  });

  const handleSubmit = () => {
    if (!form.system_id || !form.next_visit_at) return;
    createPlan.mutate({
      system_id: form.system_id,
      frequency_type: form.frequency_type,
      frequency_value: Number(form.frequency_value),
      next_visit_at: form.next_visit_at,
      status: form.status,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setForm({ system_id: defaultSystemId || "", frequency_type: "quarterly", frequency_value: "3", next_visit_at: "", status: "active" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Criar Plano de Manutenção</DialogTitle></DialogHeader>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Frequência</Label>
              <Select value={form.frequency_type} onValueChange={(v) => setForm(p => ({ ...p, frequency_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="bimonthly">Bimestral</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="semiannual">Semestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Intervalo (meses)</Label>
              <Input type="number" min="1" value={form.frequency_value} onChange={(e) => setForm(p => ({ ...p, frequency_value: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Próxima Visita</Label>
            <Input type="date" value={form.next_visit_at} onChange={(e) => setForm(p => ({ ...p, next_visit_at: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.system_id || !form.next_visit_at || createPlan.isPending}>
              Criar Plano
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
