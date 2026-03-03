import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";

interface SupplierFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplier?: any;
  onSave: (values: any) => Promise<void>;
}

export function SupplierForm({ open, onOpenChange, supplier, onSave }: SupplierFormProps) {
  const { t } = useTranslation("procurement");
  const [form, setForm] = useState({ name: "", vat_number: "", email: "", phone: "", address: "", iban: "", payment_terms: "30 dias", category: "general", status: "active", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name || "",
        vat_number: supplier.vat_number || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        iban: supplier.iban || "",
        payment_terms: supplier.payment_terms || "30 dias",
        category: supplier.category || "general",
        status: supplier.status || "active",
        notes: supplier.notes || "",
      });
    } else {
      setForm({ name: "", vat_number: "", email: "", phone: "", address: "", iban: "", payment_terms: "30 dias", category: "general", status: "active", notes: "" });
    }
  }, [supplier, open]);

  const handleSubmit = async () => {
    if (!form.name) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{supplier ? t("editSupplier") : t("addSupplier")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("supplierName")} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("vatNumber")}</Label><Input value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} /></div>
            <div><Label>{t("iban")}</Label><Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div><Label>{t("address")}</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t("category")}</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{t("general")}</SelectItem>
                  <SelectItem value="services">{t("services")}</SelectItem>
                  <SelectItem value="materials">{t("materials")}</SelectItem>
                  <SelectItem value="technology">{t("technology")}</SelectItem>
                  <SelectItem value="other">{t("other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("paymentTerms")}</Label><Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} /></div>
            <div>
              <Label>{t("status")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("active")}</SelectItem>
                  <SelectItem value="inactive">{t("inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>{t("notes")}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <Button className="w-full" onClick={handleSubmit} disabled={saving || !form.name}>
            {saving ? "A guardar..." : supplier ? t("editSupplier") : t("addSupplier")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
