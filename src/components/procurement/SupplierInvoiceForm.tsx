import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useSuppliers, usePurchaseOrders } from "@/hooks/useProcurement";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId?: string;
  onSave: (values: any) => Promise<void>;
}

export function SupplierInvoiceForm({ open, onOpenChange, workspaceId, onSave }: Props) {
  const { t } = useTranslation("procurement");
  const { data: suppliers = [] } = useSuppliers(workspaceId);
  const { data: orders = [] } = usePurchaseOrders(workspaceId);
  const [form, setForm] = useState({
    supplier_id: "", purchase_order_id: "", invoice_number: "", invoice_date: "", due_date: "", total: 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.supplier_id) return;
    setSaving(true);
    await onSave({
      ...form,
      purchase_order_id: form.purchase_order_id || undefined,
      total: Number(form.total) || 0,
    });
    setSaving(false);
    setForm({ supplier_id: "", purchase_order_id: "", invoice_number: "", invoice_date: "", due_date: "", total: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t("newInvoice")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
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
            <div>
              <Label>{t("poNumber")}</Label>
              <Select value={form.purchase_order_id} onValueChange={(v) => setForm({ ...form, purchase_order_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("selectPO")} /></SelectTrigger>
                <SelectContent>
                  {(orders as any[]).map((o) => <SelectItem key={o.id} value={o.id}>{o.po_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>{t("invoiceNumber")}</Label><Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} /></div>
            <div><Label>{t("invoiceDate")}</Label><Input type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} /></div>
            <div><Label>{t("dueDate")}</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
          <div><Label>{t("totalAmount")}</Label><Input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: Number(e.target.value) })} /></div>
          <Button className="w-full" onClick={handleSubmit} disabled={saving || !form.supplier_id}>
            {saving ? "A guardar..." : t("newInvoice")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
