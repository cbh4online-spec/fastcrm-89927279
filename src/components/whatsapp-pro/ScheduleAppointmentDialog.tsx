import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarClock, Loader2, Send, Sparkles } from "lucide-react";
import {
  useCreateAppointment,
  type AppointmentType,
  type ReminderOffset,
} from "@/hooks/useWhatsAppAppointments";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId?: string | null;
  contactId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  leadId?: string | null;
  opportunityId?: string | null;
  prefill?: {
    type?: AppointmentType;
    title?: string;
    description?: string;
    notes?: string;
    suggestedReply?: string;
  };
  onCreated?: () => void;
}

const TYPE_OPTIONS: { value: AppointmentType; label: string }[] = [
  { value: "phone_call", label: "Chamada telefónica" },
  { value: "whatsapp_call", label: "Chamada WhatsApp" },
  { value: "whatsapp_video_call", label: "Videochamada WhatsApp" },
  { value: "online_meeting", label: "Reunião online" },
  { value: "in_person_meeting", label: "Reunião presencial" },
  { value: "demo", label: "Demonstração" },
  { value: "consultation", label: "Consulta" },
  { value: "support", label: "Suporte técnico" },
  { value: "sales_followup", label: "Follow-up comercial" },
  { value: "proposal_review", label: "Apresentação de proposta" },
  { value: "other", label: "Outro" },
];

const REMINDER_OPTIONS: { value: ReminderOffset; label: string }[] = [
  { value: "reminder_24h", label: "24h antes" },
  { value: "reminder_2h", label: "2h antes" },
  { value: "reminder_1h", label: "1h antes" },
  { value: "reminder_15m", label: "15min antes" },
];

function formatLocalDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getDefaultStart(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return formatLocalDateTime(d);
}

function buildDefaultMessage(
  type: AppointmentType,
  contactName: string,
  title: string,
  startISO: string,
  duration: number,
  location?: string | null,
) {
  const date = format(new Date(startISO), "PPP", { locale: pt });
  const time = format(new Date(startISO), "HH:mm");
  const loc = location ? `\nLink/local: ${location}` : "";
  if (type === "whatsapp_call" || type === "whatsapp_video_call") {
    return `Olá ${contactName}, fica confirmado o nosso contacto por WhatsApp:\n\nData: ${date}\nHora: ${time}\n\nEntraremos em contacto consigo nesse horário.`;
  }
  if (type === "demo") {
    return `Olá ${contactName}, fica confirmada a nossa demonstração:\n\nData: ${date}\nHora: ${time}${loc}\n\nSe entretanto tiver alguma questão, responda a esta mensagem.`;
  }
  return `Olá ${contactName}, fica confirmado o nosso agendamento:\n\n${title}\n\nData: ${date}\nHora: ${time}\nDuração prevista: ${duration} min${loc}\n\nAté breve.`;
}

export function ScheduleAppointmentDialog({
  open,
  onOpenChange,
  conversationId,
  contactId,
  contactName,
  contactPhone,
  leadId,
  opportunityId,
  prefill,
  onCreated,
}: Props) {
  const create = useCreateAppointment();

  const [type, setType] = useState<AppointmentType>(prefill?.type ?? "demo");
  const [title, setTitle] = useState<string>(
    prefill?.title ?? (contactName ? `Agendamento com ${contactName}` : "Agendamento"),
  );
  const [description, setDescription] = useState<string>(prefill?.description ?? "");
  const [start, setStart] = useState<string>(getDefaultStart());
  const [duration, setDuration] = useState<number>(30);
  const [location, setLocation] = useState<string>("");
  const [notes, setNotes] = useState<string>(prefill?.notes ?? "");
  const [reminders, setReminders] = useState<ReminderOffset[]>([
    "reminder_24h",
    "reminder_1h",
  ]);
  const [sendConfirmation, setSendConfirmation] = useState<boolean>(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string>("");
  const [phone, setPhone] = useState<string>(contactPhone ?? "");

  // Re-prefill quando reabre
  useEffect(() => {
    if (!open) return;
    setType(prefill?.type ?? "demo");
    setTitle(prefill?.title ?? (contactName ? `Agendamento com ${contactName}` : "Agendamento"));
    setDescription(prefill?.description ?? "");
    setStart(getDefaultStart());
    setDuration(30);
    setLocation("");
    setNotes(prefill?.notes ?? "");
    setReminders(["reminder_24h", "reminder_1h"]);
    setSendConfirmation(false);
    setPhone(contactPhone ?? "");
  }, [open, prefill, contactName, contactPhone]);

  // Mensagem sugerida atualiza-se com inputs
  const suggestedMessage = useMemo(() => {
    return buildDefaultMessage(
      type,
      contactName || "{{contact_name}}",
      title,
      new Date(start).toISOString(),
      duration,
      location || null,
    );
  }, [type, contactName, title, start, duration, location]);

  useEffect(() => {
    if (sendConfirmation && !confirmationMessage) {
      setConfirmationMessage(suggestedMessage);
    }
  }, [sendConfirmation, suggestedMessage, confirmationMessage]);

  const toggleReminder = (r: ReminderOffset) => {
    setReminders((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  };

  const handleSubmit = async () => {
    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) return;

    await create.mutateAsync({
      conversation_id: conversationId ?? null,
      contact_id: contactId ?? null,
      lead_id: leadId ?? null,
      opportunity_id: opportunityId ?? null,
      appointment_type: type,
      title,
      description: description || null,
      scheduled_start: startDate.toISOString(),
      duration_minutes: duration,
      location: location || null,
      meeting_link: location?.startsWith("http") ? location : null,
      internal_notes: notes || null,
      reminders,
      send_confirmation: sendConfirmation,
      confirmation_message: sendConfirmation ? confirmationMessage : null,
      to_phone: phone || null,
    });

    onCreated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CalendarClock className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Agendar interação</DialogTitle>
              <DialogDescription>
                Cria um agendamento associado a esta conversa e programa lembretes WhatsApp.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de interação</Label>
              <Select value={type} onValueChange={(v) => setType(v as AppointmentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duração (min)</Label>
              <Input
                type="number"
                min={5}
                max={480}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 30)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data e hora</Label>
              <Input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone WhatsApp</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+351..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Localização ou link</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex.: https://meet.google.com/... ou Rua xxx"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label>Notas internas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Visível apenas para a equipa"
            />
          </div>

          <div className="space-y-2">
            <Label>Lembretes WhatsApp</Label>
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map((opt) => {
                const checked = reminders.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card cursor-pointer hover:bg-accent text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleReminder(opt.value)}
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-emerald-600" />
                <Label className="m-0">Enviar confirmação por WhatsApp agora</Label>
              </div>
              <Switch checked={sendConfirmation} onCheckedChange={setSendConfirmation} />
            </div>
            {sendConfirmation && (
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Mensagem sugerida — pode editar antes de enviar
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmationMessage(suggestedMessage)}
                  >
                    Repor sugestão
                  </Button>
                </div>
                <Textarea
                  rows={6}
                  value={confirmationMessage}
                  onChange={(e) => setConfirmationMessage(e.target.value)}
                  maxLength={2000}
                />
                {!phone && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    Sem telefone — confirmação não será enviada
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={create.isPending || !title || !start}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {create.isPending ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> A criar...</>
            ) : (
              <>Agendar</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
