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
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId?: string;
  onSave: (values: any) => Promise<void>;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
}

export function PurchaseOrderForm({ open, onOpenChange, workspaceId, onSave }: Props) {
  const { t } = useTranslation("procurement");
  const { data: suppliers = [] } = useSuppliers(workspaceId);

  const { data: products = [] } = useQuery({
    queryKey: ["products-list-po", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase.from("products").select("id, name, sku, base_price").eq("workspace_id", workspaceId).order("name");
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const [form, setForm] = useState({ supplier_id: "", expected_delivery: "", notes: "" });
  const [items, setItems] = useState<OrderItem[]>([{ product_id: "", product_name: "", quantity: 1, unit_price: 0 }]);
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems([...items, { product_id: "", product_name: "", quantity: 1, unit_price: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const handleProductSelect = (i: number, productId: string) => {
    const product = (products as any[]).find(p => p.id === productId);
    const updated = [...items];
    updated[i] = { ...updated[i], product_id: productId, product_name: product?.name || "" };
    setItems(updated);
  };

  const updateItem = (i: number, field: string, value: any) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    setItems(updated);
  };

  const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  const handleSubmit = async () => {
    if (!form.supplier_id || !items[0]?.product_id) return;
    setSaving(true);
    await onSave({
      supplier_id: form.supplier_id,
      expected_delivery: form.expected_delivery || undefined,
      notes: form.notes || undefined,
      total_amount: total,
      items: items.filter(i => i.product_id).map(i => ({
        product_id: i.product_id,
        variant_id: i.variant_id || undefined,
        description: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    });
    setSaving(false);
    setItems([{ product_id: "", product_name: "", quantity: 1, unit_price: 0 }]);
    setForm({ supplier_id: "", expected_delivery: "", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("newOrder")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("supplier")} *</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("selectSupplier")} /></SelectTrigger>
                <SelectContent>
                  {(suppliers as any[]).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("expectedDelivery")}</Label><Input type="date" value={form.expected_delivery} onChange={(e) => setForm({ ...form, expected_delivery: e.target.value })} /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>{t("items")}</Label>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />{t("addItem")}</Button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 mb-2">
                <Select value={item.product_id} onValueChange={(v) => handleProductSelect(i, v)}>
                  <SelectTrigger><SelectValue placeholder={t("selectProduct")} /></SelectTrigger>
                  <SelectContent>
                    {(products as any[]).map(p => <SelectItem key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder={t("quantity")} value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} />
                <Input type="number" placeholder="€" value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))} />
                {items.length > 1 && <Button size="icon" variant="ghost" onClick={() => removeItem(i)}><Trash2 className="h-3 w-3" /></Button>}
              </div>
            ))}
            <p className="text-sm text-muted-foreground text-right">{t("totalAmount")}: €{total.toFixed(2)}</p>
          </div>

          <div><Label>{t("notes")}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <Button className="w-full" onClick={handleSubmit} disabled={saving || !form.supplier_id}>{saving ? "A guardar..." : t("newOrder")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
