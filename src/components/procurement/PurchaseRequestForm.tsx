import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useSuppliers } from "@/hooks/useProcurement";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId?: string;
  onSave: (values: any) => Promise<void>;
}

export function PurchaseRequestForm({ open, onOpenChange, workspaceId, onSave }: Props) {
  const { t } = useTranslation("procurement");
  const { data: suppliers = [] } = useSuppliers(workspaceId);
  const [form, setForm] = useState({ supplier_id: "", urgency: "medium", cost_center: "", notes: "" });
  const [items, setItems] = useState([{ description: "", quantity: 1, estimated_unit_price: 0 }]);
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems([...items, { description: "", quantity: 1, estimated_unit_price: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: any) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    setItems(updated);
  };

  const total = items.reduce((s, i) => s + i.quantity * i.estimated_unit_price, 0);

  const handleSubmit = async () => {
    if (!items[0]?.description) return;
    setSaving(true);
    await onSave({
      ...form,
      supplier_id: form.supplier_id || undefined,
      total_estimated: total,
      items: items.filter(i => i.description),
    });
    setSaving(false);
    setItems([{ description: "", quantity: 1, estimated_unit_price: 0 }]);
    setForm({ supplier_id: "", urgency: "medium", cost_center: "", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("newRequest")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t("supplier")}</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("selectSupplier")} /></SelectTrigger>
                <SelectContent>
                  {(suppliers as any[]).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("urgency")}</Label>
              <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("low")}</SelectItem>
                  <SelectItem value="medium">{t("medium")}</SelectItem>
                  <SelectItem value="high">{t("high")}</SelectItem>
                  <SelectItem value="critical">{t("critical")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("costCenter")}</Label><Input value={form.cost_center} onChange={(e) => setForm({ ...form, cost_center: e.target.value })} /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>{t("items")}</Label>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />{t("addItem")}</Button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 mb-2">
                <Input placeholder={t("description")} value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
                <Input type="number" placeholder={t("quantity")} value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} />
                <Input type="number" placeholder="€" value={item.estimated_unit_price} onChange={(e) => updateItem(i, "estimated_unit_price", Number(e.target.value))} />
                {items.length > 1 && <Button size="icon" variant="ghost" onClick={() => removeItem(i)}><Trash2 className="h-3 w-3" /></Button>}
              </div>
            ))}
            <p className="text-sm text-muted-foreground text-right">{t("totalEstimated")}: €{total.toFixed(2)}</p>
          </div>

          <div><Label>{t("notes")}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <Button className="w-full" onClick={handleSubmit} disabled={saving}>{saving ? "A guardar..." : t("newRequest")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
