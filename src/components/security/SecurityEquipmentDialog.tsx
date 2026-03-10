import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useSecurityEquipmentCatalog } from "@/hooks/security/useSecurityEquipment";
import { useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SecurityEquipmentDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation("security");
  const { createItem } = useSecurityEquipmentCatalog();
  const [form, setForm] = useState({
    brand: "",
    model: "",
    reference: "",
    category: "",
    subtype: "",
    compatibility_notes: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.brand || !form.model) return;
    createItem.mutate(form, {
      onSuccess: () => {
        onOpenChange(false);
        setForm({ brand: "", model: "", reference: "", category: "", subtype: "", compatibility_notes: "" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("catalog")} — {t("addNew")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("brand")} *</Label><Input value={form.brand} onChange={(e) => set("brand", e.target.value)} /></div>
          <div><Label>{t("model")} *</Label><Input value={form.model} onChange={(e) => set("model", e.target.value)} /></div>
          <div><Label>{t("reference")}</Label><Input value={form.reference} onChange={(e) => set("reference", e.target.value)} /></div>
          <div>
            <Label>{t("category")}</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger><SelectValue placeholder={t("category")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="camera">Câmara</SelectItem>
                <SelectItem value="recorder">Gravador</SelectItem>
                <SelectItem value="sensor">Sensor</SelectItem>
                <SelectItem value="detector">Detetor</SelectItem>
                <SelectItem value="central">Central</SelectItem>
                <SelectItem value="accessory">Acessório</SelectItem>
                <SelectItem value="cable">Cablagem</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>{t("compatibilityNotes")}</Label><Textarea value={form.compatibility_notes} onChange={(e) => set("compatibility_notes", e.target.value)} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button onClick={handleSubmit} disabled={!form.brand || !form.model || createItem.isPending}>{t("save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
