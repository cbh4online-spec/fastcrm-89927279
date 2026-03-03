import { useState } from "react";
import { useCreateRenewalItem } from "@/hooks/useRenewals";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RenewalItemType, RenewalPricingModel, RenewalIntervalType, CreateRenewalItemInput } from "@/types/renewal";
import { RENEWAL_ITEM_TYPE_LABELS, PRICING_MODEL_LABELS, RENEWAL_INTERVAL_LABELS } from "@/types/renewal";

interface Props {
  contractId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRenewalItemDialog({ contractId, open, onOpenChange }: Props) {
  const createItem = useCreateRenewalItem();
  const [form, setForm] = useState<Partial<CreateRenewalItemInput>>({
    item_type: "subscription",
    pricing_model: "fixed",
    renewal_interval: "yearly",
    qty: 1,
    unit_price: 0,
    name: "",
  });

  const handleSubmit = () => {
    if (!form.name || !form.unit_price) return;

    const meta: Record<string, unknown> = {};
    if (form.item_type === "hours_pack") {
      meta.hours_included = form.qty || 0;
      meta.hours_remaining = form.qty || 0;
    }

    createItem.mutate(
      {
        contract_id: contractId,
        item_type: form.item_type as RenewalItemType,
        name: form.name!,
        qty: form.qty,
        unit_price: form.unit_price!,
        pricing_model: form.pricing_model as RenewalPricingModel,
        renewal_interval: form.renewal_interval as RenewalIntervalType,
        next_renewal_date: form.next_renewal_date,
        meta_json: meta,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm({ item_type: "subscription", pricing_model: "fixed", renewal_interval: "yearly", qty: 1, unit_price: 0, name: "" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: fastcrm.ai, Pack 20h" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={form.item_type} onValueChange={(v) => setForm({ ...form, item_type: v as RenewalItemType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RENEWAL_ITEM_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modelo Preço</Label>
              <Select value={form.pricing_model} onValueChange={(v) => setForm({ ...form, pricing_model: v as RenewalPricingModel })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRICING_MODEL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>{form.item_type === "hours_pack" ? "Horas" : "Quantidade"}</Label>
              <Input type="number" min="0" value={form.qty || ""} onChange={(e) => setForm({ ...form, qty: parseFloat(e.target.value) })} />
            </div>
            <div>
              <Label>Preço Unit. (€)</Label>
              <Input type="number" min="0" step="0.01" value={form.unit_price || ""} onChange={(e) => setForm({ ...form, unit_price: parseFloat(e.target.value) })} />
            </div>
            <div>
              <Label>Intervalo</Label>
              <Select value={form.renewal_interval} onValueChange={(v) => setForm({ ...form, renewal_interval: v as RenewalIntervalType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RENEWAL_INTERVAL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Próxima Renovação</Label>
            <Input type="date" value={form.next_renewal_date || ""} onChange={(e) => setForm({ ...form, next_renewal_date: e.target.value })} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createItem.isPending || !form.name}>
              {createItem.isPending ? "A adicionar..." : "Adicionar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
