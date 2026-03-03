import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useSuppliers, useSuggestSuppliers } from "@/hooks/useProcurement";
import { Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { SupplierSuggestionCard } from "./SupplierSuggestionCard";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId?: string;
  onSave: (values: any) => Promise<void>;
}

interface RequestItem {
  product_id: string;
  product_name: string;
  variant_id?: string;
  quantity: number;
  estimated_unit_price: number;
  chosen_supplier_id?: string;
  chosen_unit_price?: number;
  suggestions?: any;
}

export function PurchaseRequestForm({ open, onOpenChange, workspaceId, onSave }: Props) {
  const { t } = useTranslation("procurement");
  const { data: suppliers = [] } = useSuppliers(workspaceId);
  const suggestMutation = useSuggestSuppliers();

  const { data: products = [] } = useQuery({
    queryKey: ["products-list", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase.from("products").select("id, name, sku, default_supplier_id").eq("workspace_id", workspaceId).order("name");
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const [form, setForm] = useState({ supplier_id: "", urgency: "medium", cost_center: "", notes: "" });
  const [items, setItems] = useState<RequestItem[]>([{ product_id: "", product_name: "", quantity: 1, estimated_unit_price: 0 }]);
  const [saving, setSaving] = useState(false);
  const [suggestingIdx, setSuggestingIdx] = useState<number | null>(null);

  const addItem = () => setItems([...items, { product_id: "", product_name: "", quantity: 1, estimated_unit_price: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: any) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    setItems(updated);
  };

  const handleProductSelect = (i: number, productId: string) => {
    const product = (products as any[]).find(p => p.id === productId);
    const updated = [...items];
    updated[i] = { ...updated[i], product_id: productId, product_name: product?.name || "" };
    setItems(updated);
  };

  const handleSuggest = async (i: number) => {
    const item = items[i];
    if (!item.product_id || !workspaceId) return;
    setSuggestingIdx(i);
    try {
      const result = await suggestMutation.mutateAsync({
        workspaceId,
        items: [{ product_id: item.product_id, variant_id: item.variant_id, requested_qty: item.quantity }],
      });
      const suggestion = result.item_suggestions?.[0];
      if (suggestion) {
        updateItem(i, "suggestions", suggestion);
      }
    } catch {
      toast.error("Erro ao sugerir fornecedores");
    }
    setSuggestingIdx(null);
  };

  const handleChooseSupplier = (i: number, supplierId: string, unitPrice: number) => {
    const updated = [...items];
    updated[i] = { ...updated[i], chosen_supplier_id: supplierId, chosen_unit_price: unitPrice, estimated_unit_price: unitPrice };
    setItems(updated);
  };

  const handleSetDefault = async (productId: string, supplierId: string) => {
    await (supabase.from("products").update as any)({ default_supplier_id: supplierId }).eq("id", productId);
    toast.success("Fornecedor padrão definido");
  };

  const total = items.reduce((s, i) => s + i.quantity * (i.chosen_unit_price || i.estimated_unit_price), 0);

  const handleSubmit = async () => {
    if (!items[0]?.product_id) return;
    setSaving(true);
    await onSave({
      ...form,
      supplier_id: form.supplier_id || undefined,
      total_estimated: total,
      items: items.filter(i => i.product_id).map(i => ({
        product_id: i.product_id,
        variant_id: i.variant_id,
        description: i.product_name,
        quantity: i.quantity,
        estimated_unit_price: i.chosen_unit_price || i.estimated_unit_price,
        suggested_supplier_id: i.suggestions?.recommended_supplier_id,
        suggested_unit_price: i.suggestions?.suggested_unit_price,
        suggestion_json: i.suggestions || undefined,
        chosen_supplier_id: i.chosen_supplier_id,
        chosen_unit_price: i.chosen_unit_price,
      })),
    });
    setSaving(false);
    setItems([{ product_id: "", product_name: "", quantity: 1, estimated_unit_price: 0 }]);
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
              <Label>{t("supplier")} (opcional)</Label>
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
              <div key={i} className="space-y-2 mb-4 p-3 border rounded-lg">
                <div className="grid grid-cols-[1fr_80px_100px_auto_32px] gap-2">
                  <Select value={item.product_id} onValueChange={(v) => handleProductSelect(i, v)}>
                    <SelectTrigger><SelectValue placeholder={t("selectProduct")} /></SelectTrigger>
                    <SelectContent>
                      {(products as any[]).map(p => <SelectItem key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder={t("quantity")} value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} />
                  <Input type="number" placeholder="€" value={item.estimated_unit_price} onChange={(e) => updateItem(i, "estimated_unit_price", Number(e.target.value))} />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!item.product_id || suggestingIdx === i}
                    onClick={() => handleSuggest(i)}
                  >
                    {suggestingIdx === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    {suggestingIdx === i ? t("suggesting") : t("suggestSupplier")}
                  </Button>
                  {items.length > 1 && <Button size="icon" variant="ghost" onClick={() => removeItem(i)}><Trash2 className="h-3 w-3" /></Button>}
                </div>

                {item.suggestions?.top3?.length > 0 && (
                  <SupplierSuggestionCard
                    suggestions={item.suggestions.top3}
                    aiExplanation={item.suggestions.ai_explanation}
                    onChoose={(sid, price) => handleChooseSupplier(i, sid, price)}
                    onSetDefault={item.product_id ? (sid) => handleSetDefault(item.product_id, sid) : undefined}
                  />
                )}

                {item.chosen_supplier_id && (
                  <p className="text-xs text-primary">
                    ✓ Fornecedor escolhido — €{(item.chosen_unit_price || 0).toFixed(2)}
                  </p>
                )}
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
