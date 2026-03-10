import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useSecurityPartners } from "@/hooks/security/useSecurityPartners";
import { useSecurityPartnerRequests } from "@/hooks/security/useSecurityPartnerRequests";
import { useState } from "react";
import { Plus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CHANNELS = ["whatsapp", "telegram", "email", "phone", "manual", "site"];

export function SecurityPartnerRequestDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation("security");
  const { partners } = useSecurityPartners();
  const { createRequest } = useSecurityPartnerRequests();
  const [partnerId, setPartnerId] = useState<string>("");
  const [channel, setChannel] = useState("whatsapp");
  const [rawText, setRawText] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!rawText.trim()) return;
    createRequest.mutate(
      {
        partner_id: partnerId || undefined,
        source_channel: channel,
        raw_text: rawText,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setRawText("");
          setNotes("");
          setPartnerId("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("newPartnerRequest")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("partner")}</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectPartner")} />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("sourceChannel")}</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((ch) => (
                    <SelectItem key={ch} value={ch}>{ch.charAt(0).toUpperCase() + ch.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{t("rawMessage")}</Label>
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={t("pasteMessage")}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <div>
            <Label>{t("notes")}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!rawText.trim() || createRequest.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            {t("createDraft")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
