import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarClock, Loader2 } from "lucide-react";
import { useScheduleWhatsAppMessage } from "@/hooks/useWhatsAppScheduled";
import { isValidPhone, toE164 } from "@/utils/phone";

interface Props {
  defaultPhone?: string;
  defaultBody?: string;
  conversationId?: string;
  contactId?: string;
  leadId?: string;
  trigger?: React.ReactNode;
  onScheduled?: () => void;
}

function nextRoundedSlot(): string {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  // local datetime-local string
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleWhatsAppMessageDialog({
  defaultPhone = "",
  defaultBody = "",
  conversationId,
  contactId,
  leadId,
  trigger,
  onScheduled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(defaultPhone);
  const [body, setBody] = useState(defaultBody);
  const [when, setWhen] = useState<string>(nextRoundedSlot());
  const [mediaUrl, setMediaUrl] = useState("");
  const schedule = useScheduleWhatsAppMessage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhone(phone)) {
      // soft fail handled by hook toast
    }
    const iso = new Date(when).toISOString();
    await schedule.mutateAsync({
      to_phone: toE164(phone) || phone,
      body,
      scheduled_at: iso,
      conversation_id: conversationId ?? null,
      contact_id: contactId ?? null,
      lead_id: leadId ?? null,
      media_url: mediaUrl || null,
    });
    setOpen(false);
    setBody("");
    setMediaUrl("");
    onScheduled?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            Agendar mensagem
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Agendar mensagem WhatsApp
          </DialogTitle>
          <DialogDescription>
            Define o telefone destino, a mensagem e a data/hora de envio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              placeholder="+351 912 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Mensagem</Label>
            <Textarea
              id="body"
              rows={5}
              placeholder="Olá! Apenas a confirmar a nossa reunião…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              maxLength={4000}
            />
            <p className="text-[11px] text-muted-foreground text-right">{body.length}/4000</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="when">Data e hora</Label>
              <Input
                id="when"
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="media">URL de media (opcional)</Label>
              <Input
                id="media"
                type="url"
                placeholder="https://…"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={schedule.isPending} className="gap-1.5">
              {schedule.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CalendarClock className="h-3.5 w-3.5" />
              )}
              Agendar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
