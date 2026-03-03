import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useSuppliers } from "@/hooks/useProcurement";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId?: string;
  editItem?: any;
  onSave: (values: any) => Promise<void>;
}

export function SupplierProductForm({ open, onOpenChange, workspaceId, editItem, onSave }: Props) {
  const { t } = useTranslation("procurement");
  const { data: suppliers = [] } = useSuppliers(workspaceId);

  const { data: products = [] } = useQuery({
    queryKey: ["products-list", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase.from("products").select("id, name, sku").eq("workspace_id", workspaceId).order("name");
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const [form, setForm] = useState({
    supplier_id: "", product_id: "", supplier_sku: "",
    unit_price: 0, min_order_qty: 1, pack_size: 1,
    lead_time_days: "", is_preferred: false,
    quality_score: "", reliability_score: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editItem) {
      setForm({
        supplier_id: editItem.supplier_id || "",
        product_id: editItem.product_id || "",
        supplier_sku: editItem.supplier_sku || "",
        unit_price: Number(editItem.unit_price) || 0,
        min_order_qty: Number(editItem.min_order_qty) || 1,
        pack_size: Number(editItem.pack_size) || 1,
        lead_time_days: editItem.lead_time_days?.toString() || "",
        is_preferred: editItem.is_preferred || false,
        quality_score: editItem.quality_score?.toString() || "",
        reliability_score: editItem.reliability_score?.toString() || "",
      });
    } else {
      setForm({ supplier_id: "", product_id: "", supplier_sku: "", unit_price: 0, min_order_qty: 1, pack_size: 1, lead_time_days: "", is_preferred: false, quality_score: "", reliability_score: "" });
    }
  }, [editItem, open]);

  const handleSubmit = async () => {
    if (!form.supplier_id || !form.product_id) return;
    setSaving(true);
    await onSave({
      supplier_id: form.supplier_id,
      product_id: form.product_id,
      supplier_sku: form.supplier_sku || undefined,
      unit_price: form.unit_price,
      min_order_qty: form.min_order_qty,
      pack_size: form.pack_size,
      lead_time_days: form.lead_time_days ? Number(form.lead_time_days) : undefined,
      is_preferred: form.is_preferred,
      quality_score: form.quality_score ? Number(form.quality_score) : undefined,
      reliability_score: form.reliability_score ? Number(form.reliability_score) : undefined,
      last_price_date: new Date().toISOString().split("T")[0],
    });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editItem ? t("editCatalogEntry") : t("addCatalogEntry")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("supplier")}</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("selectSupplier")} /></SelectTrigger>
                <SelectContent>
                  {(suppliers as any[]).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("product")}</Label>
              <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("selectProduct")} /></SelectTrigger>
                <SelectContent>
                  {(products as any[]).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><Label>SKU Fornecedor</Label><Input value={form.supplier_sku} onChange={e => setForm({ ...form, supplier_sku: e.target.value })} /></div>
            <div><Label>{t("catalogPrice")} (€)</Label><Input type="number" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: Number(e.target.value) })} /></div>
            <div><Label>{t("leadTime")} (dias)</Label><Input type="number" value={form.lead_time_days} onChange={e => setForm({ ...form, lead_time_days: e.target.value })} /></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><Label>MOQ</Label><Input type="number" value={form.min_order_qty} onChange={e => setForm({ ...form, min_order_qty: Number(e.target.value) })} /></div>
            <div><Label>{t("qualityScore")} (0-5)</Label><Input type="number" min={0} max={5} step={0.1} value={form.quality_score} onChange={e => setForm({ ...form, quality_score: e.target.value })} /></div>
            <div><Label>{t("reliabilityScore")} (0-5)</Label><Input type="number" min={0} max={5} step={0.1} value={form.reliability_score} onChange={e => setForm({ ...form, reliability_score: e.target.value })} /></div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.is_preferred} onCheckedChange={v => setForm({ ...form, is_preferred: v })} />
            <Label>{t("preferred")}</Label>
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={saving || !form.supplier_id || !form.product_id}>
            {saving ? "A guardar..." : (editItem ? t("save") : t("addCatalogEntry"))}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
