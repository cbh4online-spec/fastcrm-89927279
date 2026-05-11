import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CalendarClock, AlertTriangle, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { formatPhone } from "@/utils/phone";
import {
  useScheduleInvoiceWhatsApp,
  type RecurrenceMode,
} from "@/hooks/invoices/useInvoiceScheduledWhatsApp";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  phoneE164: string;
  defaultBody: string;
  shareUrl: string;
}

function toLocalDatetimeInputValue(d: Date) {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function ScheduleWhatsAppDialog({
  open,
  onOpenChange,
  invoiceId,
  phoneE164,
  defaultBody,
  shareUrl,
}: Props) {
  const schedule = useScheduleInvoiceWhatsApp();

  const defaultWhen = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 60);
    d.setSeconds(0, 0);
    return toLocalDatetimeInputValue(d);
  }, [open]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState(defaultBody);
  const [when, setWhen] = useState<string>(defaultWhen);
  const [recurrence, setRecurrence] = useState<RecurrenceMode>("none");
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setBody(defaultBody);
      setWhen(defaultWhen);
      setRecurrence("none");
      setConsent(false);
    }
  }, [open, defaultBody, defaultWhen]);

  const scheduledAt = when ? new Date(when) : null;
  const isFuture = scheduledAt && scheduledAt.getTime() > Date.now() + 30_000;
  const valid =
    !!body.trim() &&
    !!scheduledAt &&
    isFuture &&
    consent &&
    body.includes(shareUrl);

  const submit = async () => {
    if (!valid || !scheduledAt) return;
    try {
      await schedule.mutateAsync({
        invoiceId,
        phone: phoneE164,
        body,
        scheduledAt,
        shareUrl,
        title: title.trim() || null,
        recurrence,
      });
      toast.success(
        `Agendado para ${format(scheduledAt, "d MMM HH:mm", { locale: pt })}`,
      );
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro a agendar envio");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-emerald-600" />
            Criar agendamento
          </DialogTitle>
          <DialogDescription>
            Programa o envio do link de pagamento por WhatsApp para{" "}
            <span className="font-mono">{formatPhone(phoneE164, "PT")}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Título (opcional)</Label>
            <Input
              placeholder="Ex.: Lembrete de fatura"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>

          <div>
            <Label className="text-xs">Mensagem</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              maxLength={1000}
              className="font-sans text-sm"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {body.includes(shareUrl) ? (
                  <span className="text-emerald-600">✓ Link de pagamento incluído</span>
                ) : (
                  <span className="text-destructive">
                    A mensagem deve conter o link de pagamento
                  </span>
                )}
              </span>
              <span>{body.length}/1000</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Data e hora</Label>
              <Input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                min={toLocalDatetimeInputValue(new Date())}
              />
              {scheduledAt && !isFuture && (
                <p className="mt-1 text-[11px] text-destructive">
                  A data tem de ser no futuro (mín. 30s).
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Recorrência</Label>
              <Select value={recurrence} onValueChange={(v) => setRecurrence(v as RecurrenceMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem recorrência</SelectItem>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
              {recurrence !== "none" && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Após cada envio será criada a próxima ocorrência. Cancele em
                  qualquer momento no histórico.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              Confirme que o cliente autorizou comunicações por WhatsApp
              (opt-in). Envios não solicitados podem violar o RGPD e os Termos
              do WhatsApp Business e bloquear o número.
            </p>
          </div>

          <label className="flex items-start gap-2 text-xs cursor-pointer select-none">
            <Checkbox
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              className="mt-0.5"
            />
            <span>
              Confirmo o consentimento do cliente e a conformidade legal deste
              envio.
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={schedule.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={!valid || schedule.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {schedule.isPending ? (
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            ) : (
              <MessageCircle className="w-3 h-3 mr-2" />
            )}
            Agendar envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
