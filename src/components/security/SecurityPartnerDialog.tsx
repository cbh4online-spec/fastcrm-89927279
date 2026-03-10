import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { useSecurityPartners } from "@/hooks/security/useSecurityPartners";
import { useState } from "react";
import { Plus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}

export function SecurityPartnerDialog({ open, onOpenChange, onCreated }: Props) {
  const { t } = useTranslation("security");
  const { createPartner } = useSecurityPartners();
  const [name, setName] = useState("");
  const [partnerCode, setPartnerCode] = useState("");
  const [zone, setZone] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    createPartner.mutate(
      {
        name: name.trim(),
        partner_code: partnerCode || undefined,
        zone: zone || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: (data) => {
          setName("");
          setPartnerCode("");
          setZone("");
          setNotes("");
          onOpenChange(false);
          onCreated?.(data.id);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addPartner")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t("partnerName")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("partnerNamePlaceholder")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("partnerCode")}</Label>
              <Input value={partnerCode} onChange={(e) => setPartnerCode(e.target.value)} placeholder="P001" />
            </div>
            <div>
              <Label>{t("partnerZone")}</Label>
              <Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder={t("partnerZonePlaceholder")} />
            </div>
          </div>
          <div>
            <Label>{t("notes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || createPartner.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            {t("addPartner")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
