import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { XCircle } from "lucide-react";

interface LostReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityTitle: string;
  onConfirm: (reason: string, notes?: string) => void;
}

const LOST_REASONS = [
  "price_too_high",
  "competitor_chosen",
  "no_budget",
  "timing_not_right",
  "no_response",
  "requirements_changed",
  "internal_decision",
  "other",
] as const;

export function LostReasonDialog({ open, onOpenChange, opportunityTitle, onConfirm }: LostReasonDialogProps) {
  const { t } = useTranslation('crm');
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    if (!reason) return;
    onConfirm(reason, notes || undefined);
    setReason("");
    setNotes("");
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setReason("");
      setNotes("");
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            {t('markAsLost', 'Marcar como Perdida')}
          </DialogTitle>
          <DialogDescription>
            {t('lostReasonDialogDesc', 'Indique o motivo da perda para "{{title}}"', { title: opportunityTitle })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('lostReason', 'Motivo da Perda')} *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectReason', 'Selecionar motivo...')} />
              </SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`lostReason_${r}`, r.replace(/_/g, ' '))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('additionalNotes', 'Notas adicionais')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('lostReasonNotesPlaceholder', 'Detalhes opcionais...')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {t('cancel', 'Cancelar')}
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!reason}>
            {t('confirmLost', 'Confirmar Perda')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
