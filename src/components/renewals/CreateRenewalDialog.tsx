import { useState } from "react";
import { useForm } from "react-hook-form";
import { useCreateRenewalContract } from "@/hooks/useRenewals";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { CreateRenewalContractInput, RenewalIntervalType, RenewalBillingType } from "@/types/renewal";
import { RENEWAL_INTERVAL_LABELS, RENEWAL_BILLING_LABELS } from "@/types/renewal";

interface CreateRenewalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRenewalDialog({ open, onOpenChange }: CreateRenewalDialogProps) {
  const createContract = useCreateRenewalContract();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-select", currentWorkspace?.id],
    queryFn: async () => {
      if (!workspaceClient || !currentWorkspace) return [];
      const { data } = await workspaceClient
        .from("companies")
        .select("id, name")
        .eq("workspace_id", currentWorkspace.id)
        .order("name")
        .limit(200);
      return data || [];
    },
    enabled: !!workspaceClient && !!currentWorkspace && open,
  });

  const [form, setForm] = useState<CreateRenewalContractInput>({
    renewal_interval: "yearly",
    billing_type: "invoice",
    auto_renew: true,
    start_date: new Date().toISOString().split("T")[0],
  });

  const handleSubmit = () => {
    createContract.mutate(form, {
      onSuccess: () => {
        onOpenChange(false);
        setForm({
          renewal_interval: "yearly",
          billing_type: "invoice",
          auto_renew: true,
          start_date: new Date().toISOString().split("T")[0],
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Contrato de Renovação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Empresa</Label>
            <Select value={form.company_id || ""} onValueChange={(v) => setForm({ ...form, company_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar empresa" /></SelectTrigger>
              <SelectContent>
                {companies.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Intervalo</Label>
              <Select
                value={form.renewal_interval}
                onValueChange={(v) => setForm({ ...form, renewal_interval: v as RenewalIntervalType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RENEWAL_INTERVAL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo Billing</Label>
              <Select
                value={form.billing_type}
                onValueChange={(v) => setForm({ ...form, billing_type: v as RenewalBillingType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RENEWAL_BILLING_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Próxima Renovação</Label>
              <Input
                type="date"
                value={form.next_renewal_date || ""}
                onChange={(e) => setForm({ ...form, next_renewal_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.auto_renew}
              onCheckedChange={(v) => setForm({ ...form, auto_renew: v })}
            />
            <Label>Auto-renovação</Label>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas opcionais..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createContract.isPending}>
              {createContract.isPending ? "A criar..." : "Criar Contrato"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
