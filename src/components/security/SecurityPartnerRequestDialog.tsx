import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { useSecurityPartners } from "@/hooks/security/useSecurityPartners";
import { useSecurityPartnerRequests } from "@/hooks/security/useSecurityPartnerRequests";
import { useState } from "react";
import { Plus, UserPlus, Sparkles } from "lucide-react";
import { SecurityPartnerDialog } from "./SecurityPartnerDialog";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CHANNELS = ["whatsapp", "telegram", "email", "phone", "manual", "site"];

export function SecurityPartnerRequestDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation("security");
  const navigate = useNavigate();
  const { partners } = useSecurityPartners();
  const { createRequest, extractData } = useSecurityPartnerRequests();
  const [partnerId, setPartnerId] = useState<string>("");
  const [channel, setChannel] = useState("whatsapp");
  const [rawText, setRawText] = useState("");
  const [notes, setNotes] = useState("");
  const [autoExtract, setAutoExtract] = useState(true);
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);

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
        onSuccess: (data) => {
          if (autoExtract && data?.id) {
            extractData.mutate(data.id);
            navigate(`/dashboard/security/partner-requests/${data.id}`);
          }
          setRawText("");
          setNotes("");
          setPartnerId("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("newPartnerRequest")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("partner")}</Label>
                <div className="flex gap-2">
                  <Select value={partnerId} onValueChange={setPartnerId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t("selectPartner")} />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setPartnerDialogOpen(true)}
                    title={t("addPartner")}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
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

            {/* Auto-extract toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">{t("reqAutoExtract")}</p>
                  <p className="text-xs text-muted-foreground">{t("reqAutoExtractDesc")}</p>
                </div>
              </div>
              <Switch checked={autoExtract} onCheckedChange={setAutoExtract} />
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

      <SecurityPartnerDialog
        open={partnerDialogOpen}
        onOpenChange={setPartnerDialogOpen}
        onCreated={(id) => setPartnerId(id)}
      />
    </>
  );
}
