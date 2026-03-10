import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useSecurityClients } from "@/hooks/security/useSecurityClients";
import { useState } from "react";
import { Plus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}

const CLIENT_TYPES = ["particular", "empresa", "condominio"] as const;

export function SecurityClientDialog({ open, onOpenChange, onCreated }: Props) {
  const { t } = useTranslation("security");
  const { createClient } = useSecurityClients();

  const [form, setForm] = useState({
    client_type: "particular" as string,
    name: "",
    trade_name: "",
    nif: "",
    fiscal_address: "",
    fiscal_postal_code: "",
    fiscal_locality: "",
    primary_phone: "",
    primary_email: "",
    contact_person_name: "",
    contact_person_phone: "",
    notes: "",
  });

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v) payload[k] = v.trim();
    }
    createClient.mutate(payload, {
      onSuccess: (data) => {
        setForm({
          client_type: "particular", name: "", trade_name: "", nif: "",
          fiscal_address: "", fiscal_postal_code: "", fiscal_locality: "",
          primary_phone: "", primary_email: "", contact_person_name: "",
          contact_person_phone: "", notes: "",
        });
        onOpenChange(false);
        onCreated?.(data.id);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("newClient")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Type + Name */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t("clientType")}</Label>
              <Select value={form.client_type} onValueChange={(v) => set("client_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map((ct) => (
                    <SelectItem key={ct} value={ct}>
                      {t(`clientType${ct.charAt(0).toUpperCase()}${ct.slice(1)}` as any)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>{t("clientName")} *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t("clientNamePlaceholder")} />
            </div>
          </div>

          {/* NIF + Trade Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("nif")}</Label>
              <Input value={form.nif} onChange={(e) => set("nif", e.target.value)} placeholder="123456789" />
            </div>
            <div>
              <Label>{t("tradeName")}</Label>
              <Input value={form.trade_name} onChange={(e) => set("trade_name", e.target.value)} />
            </div>
          </div>

          {/* Fiscal Address */}
          <div>
            <Label>{t("fiscalAddress")}</Label>
            <Input value={form.fiscal_address} onChange={(e) => set("fiscal_address", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("postalCode")}</Label>
              <Input value={form.fiscal_postal_code} onChange={(e) => set("fiscal_postal_code", e.target.value)} placeholder="1000-001" />
            </div>
            <div>
              <Label>{t("locality")}</Label>
              <Input value={form.fiscal_locality} onChange={(e) => set("fiscal_locality", e.target.value)} />
            </div>
          </div>

          {/* Contacts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("phone")}</Label>
              <Input value={form.primary_phone} onChange={(e) => set("primary_phone", e.target.value)} />
            </div>
            <div>
              <Label>{t("email")}</Label>
              <Input value={form.primary_email} onChange={(e) => set("primary_email", e.target.value)} type="email" />
            </div>
          </div>

          {/* Contact Person */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("contactPersonName")}</Label>
              <Input value={form.contact_person_name} onChange={(e) => set("contact_person_name", e.target.value)} />
            </div>
            <div>
              <Label>{t("contactPersonPhone")}</Label>
              <Input value={form.contact_person_phone} onChange={(e) => set("contact_person_phone", e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>{t("notes")}</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim() || createClient.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
