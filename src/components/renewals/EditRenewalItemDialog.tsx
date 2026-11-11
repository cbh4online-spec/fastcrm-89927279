import { useState } from "react";
import { useUpdateRenewalItem } from "@/hooks/useRenewals";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RenewalItem, RenewalItemType, RenewalPricingModel, RenewalIntervalType, RenewalItemStatus } from "@/types/renewal";
import { RENEWAL_ITEM_TYPE_LABELS, PRICING_MODEL_LABELS, RENEWAL_INTERVAL_LABELS, RENEWAL_ITEM_STATUS_CONFIG } from "@/types/renewal";

interface Props {
  item: RenewalItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditRenewalItemDialog({ item, open, onOpenChange }: Props) {
  const update = useUpdateRenewalItem();
  const [form, setForm] = useState({
    name: item.name,
    item_type: item.item_type,
    pricing_model: item.pricing_model,
    renewal_interval: item.renewal_interval,
    qty: String(item.qty ?? 1),
    unit_price: String(item.unit_price ?? 0),
    next_renewal_date: item.next_renewal_date ? item.next_renewal_date.slice(0, 10) : "",
    status: item.status,
  });

  const qty = parseFloat(form.qty);
  const price = parseFloat(form.unit_price);
  const name = form.name.trim();
  const valid = name.length > 0 && name.length <= 200 && Number.isFinite(qty) && qty >= 0 && Number.isFinite(price) && price >= 0;

  const handleSave = () => {
    if (!valid) return;
    update.mutate(
      {
        id: item.id,
        name,
        item_type: form.item_type,
        pricing_model: form.pricing_model,
        renewal_interval: form.renewal_interval,
        qty,
        unit_price: price,
        next_renewal_date: form.next_renewal_date || null,
        status: form.status,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar item</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="ri-name">Nome</Label>
            <Input id="ri-name" maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={form.item_type} onValueChange={(v) => setForm({ ...form, item_type: v as RenewalItemType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(RENEWAL_ITEM_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modelo preço</Label>
              <Select value={form.pricing_model} onValueChange={(v) => setForm({ ...form, pricing_model: v as RenewalPricingModel })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PRICING_MODEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="ri-qty">{form.item_type === "hours_pack" ? "Horas" : "Quantidade"}</Label>
              <Input id="ri-qty" type="number" min="0" step="any" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ri-price">Preço unit. (€)</Label>
              <Input id="ri-price" type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
            </div>
            <div>
              <Label>Intervalo</Label>
              <Select value={form.renewal_interval} onValueChange={(v) => setForm({ ...form, renewal_interval: v as RenewalIntervalType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(RENEWAL_INTERVAL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ri-date">Próxima renovação</Label>
              <Input id="ri-date" type="date" value={form.next_renewal_date} onChange={(e) => setForm({ ...form, next_renewal_date: e.target.value })} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as RenewalItemStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(RENEWAL_ITEM_STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {!valid && <p className="text-xs text-destructive">Indique um nome e valores não negativos.</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!valid || update.isPending}>{update.isPending ? "A guardar..." : "Guardar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
