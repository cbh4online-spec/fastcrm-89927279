import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { useSecuritySites } from "@/hooks/security/useSecuritySites";
import { useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SecuritySiteDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation("security");
  const { createSite } = useSecuritySites();
  const [form, setForm] = useState({
    site_name: "",
    address_line_1: "",
    postal_code: "",
    locality: "",
    county: "",
    district: "",
    country: "Portugal",
    establishment_type: "",
    onsite_responsible_name: "",
    onsite_responsible_phone: "",
    onsite_responsible_email: "",
    access_notes: "",
    notes: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.site_name) return;
    createSite.mutate(form, {
      onSuccess: () => {
        onOpenChange(false);
        setForm({ site_name: "", address_line_1: "", postal_code: "", locality: "", county: "", district: "", country: "Portugal", establishment_type: "", onsite_responsible_name: "", onsite_responsible_phone: "", onsite_responsible_email: "", access_notes: "", notes: "" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("sites")} — {t("addNew")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("siteName")} *</Label><Input value={form.site_name} onChange={(e) => set("site_name", e.target.value)} /></div>
          <div><Label>{t("installationAddress")}</Label><Input value={form.address_line_1} onChange={(e) => set("address_line_1", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("postalCode")}</Label><Input value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} /></div>
            <div><Label>{t("locality")}</Label><Input value={form.locality} onChange={(e) => set("locality", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("county")}</Label><Input value={form.county} onChange={(e) => set("county", e.target.value)} /></div>
            <div><Label>{t("district")}</Label><Input value={form.district} onChange={(e) => set("district", e.target.value)} /></div>
          </div>
          <div><Label>{t("establishmentType")}</Label><Input value={form.establishment_type} onChange={(e) => set("establishment_type", e.target.value)} /></div>
          <div><Label>{t("responsiblePerson")}</Label><Input value={form.onsite_responsible_name} onChange={(e) => set("onsite_responsible_name", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("phone")}</Label><Input value={form.onsite_responsible_phone} onChange={(e) => set("onsite_responsible_phone", e.target.value)} /></div>
            <div><Label>{t("email")}</Label><Input value={form.onsite_responsible_email} onChange={(e) => set("onsite_responsible_email", e.target.value)} /></div>
          </div>
          <div><Label>{t("accessNotes")}</Label><Textarea value={form.access_notes} onChange={(e) => set("access_notes", e.target.value)} rows={2} /></div>
          <div><Label>{t("notes")}</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button onClick={handleSubmit} disabled={!form.site_name || createSite.isPending}>{t("save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
