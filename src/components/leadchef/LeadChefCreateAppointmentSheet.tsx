import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, X } from "lucide-react";
import {
  LEADCHEF_APPOINTMENT_TYPES,
  LEADCHEF_APPOINTMENT_TYPE_LABELS,
} from "./constants";
import { useCreateLeadChefAppointment } from "@/hooks/leadchef/useCreateLeadChefAppointment";
import { useLeadChefLeads } from "@/hooks/leadchef/useLeadChefLeads";
import {
  combineDateTime,
  toLocalDateInput,
  toLocalTimeInput,
} from "@/utils/leadchef/date";
import type { LeadChefAppointmentType } from "@/types/leadchef";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Pré-seleciona um lead (e respetivo perfil). */
  leadId?: string | null;
  profileId?: string | null;
  defaultType?: LeadChefAppointmentType;
  defaultDate?: string; // ISO
}

export function LeadChefCreateAppointmentSheet({
  open,
  onOpenChange,
  leadId: initialLeadId,
  profileId: initialProfileId,
  defaultType = "follow_up",
  defaultDate,
}: Props) {
  const create = useCreateLeadChefAppointment();
  const { data: leads = [] } = useLeadChefLeads();

  const [type, setType] = useState<LeadChefAppointmentType>(defaultType);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState<string>("");
  const [location, setLocation] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [notes, setNotes] = useState("");
  const [updateNextAction, setUpdateNextAction] = useState(true);
  const [reminder, setReminder] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(initialLeadId ?? null);
  const [leadSearch, setLeadSearch] = useState("");

  const selectedLead = useMemo(
    () => leads.find((l) => l.lead.id === leadId) ?? null,
    [leads, leadId]
  );

  const profileId = useMemo(
    () => selectedLead?.profile.id ?? initialProfileId ?? null,
    [selectedLead, initialProfileId]
  );

  // Reset on open
  useEffect(() => {
    if (open) {
      const base = defaultDate ? new Date(defaultDate) : new Date(Date.now() + 60 * 60 * 1000);
      setType(defaultType);
      setTitle(LEADCHEF_APPOINTMENT_TYPE_LABELS[defaultType]);
      setDate(toLocalDateInput(base));
      setTime(toLocalTimeInput(base));
      setDuration("");
      setLocation("");
      setIsOnline(false);
      setNotes("");
      setUpdateNextAction(true);
      setReminder(false);
      setLeadId(initialLeadId ?? null);
      setLeadSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-update title when type changes (if user hasn't customised)
  useEffect(() => {
    if (Object.values(LEADCHEF_APPOINTMENT_TYPE_LABELS).includes(title)) {
      setTitle(LEADCHEF_APPOINTMENT_TYPE_LABELS[type]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const filteredLeads = useMemo(() => {
    const q = leadSearch.trim().toLowerCase();
    if (!q) return leads.slice(0, 8);
    return leads
      .filter(
        (l) =>
          l.lead?.name?.toLowerCase().includes(q) ||
          l.lead?.email?.toLowerCase().includes(q) ||
          l.lead?.phone?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [leads, leadSearch]);

  const submit = async () => {
    if (!title.trim() || !date || !time) return;
    const scheduledIso = combineDateTime(date, time);
    await create.mutateAsync({
      type,
      title: title.trim(),
      scheduled_at: scheduledIso,
      leadId: leadId || null,
      profileId: profileId || null,
      notes: notes.trim() || undefined,
      duration_minutes: duration ? Number(duration) : null,
      location: location.trim() || null,
      is_online: isOnline,
      updateNextAction,
      metadata: reminder ? { reminder_requested: true } : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Novo compromisso</SheetTitle>
          <SheetDescription>Marca uma demonstração, chamada, follow-up ou visita.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <Select value={type} onValueChange={(v) => setType(v as LeadChefAppointmentType)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEADCHEF_APPOINTMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{LEADCHEF_APPOINTMENT_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Demonstração online"
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Hora *</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Duração (min)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="60"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Local / link</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={isOnline ? "Link da reunião" : "Morada"}
                className="h-11"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-slate-900">Online</p>
              <p className="text-xs text-slate-500">Sem deslocação física</p>
            </div>
            <Switch checked={isOnline} onCheckedChange={setIsOnline} />
          </div>

          {/* Lead picker */}
          <div className="space-y-1.5">
            <Label>Lead associado</Label>
            {selectedLead ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{selectedLead.lead.name}</p>
                  <p className="text-xs text-slate-500 truncate">{selectedLead.lead.phone || selectedLead.lead.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLeadId(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-900"
                  aria-label="Remover lead"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Procurar lead por nome, email ou telefone…"
                    className="h-11 pl-9"
                  />
                </div>
                {filteredLeads.length > 0 && (
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-44 overflow-y-auto">
                    {filteredLeads.map((l) => (
                      <button
                        key={l.lead.id}
                        type="button"
                        onClick={() => setLeadId(l.lead.id)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 active:bg-slate-100"
                      >
                        <p className="text-sm font-medium text-slate-900">{l.lead.name}</p>
                        <p className="text-xs text-slate-500">{l.lead.phone || l.lead.email || "—"}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Nota</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Pormenores adicionais"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-slate-900">Definir como próxima ação</p>
              <p className="text-xs text-slate-500">Atualiza o lead com este compromisso</p>
            </div>
            <Switch
              checked={updateNextAction}
              onCheckedChange={setUpdateNextAction}
              disabled={!leadId}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 opacity-70">
            <div>
              <p className="text-sm font-medium text-slate-900">Lembrete</p>
              <p className="text-xs text-slate-500">Notificações ainda não disponíveis</p>
            </div>
            <Switch checked={reminder} onCheckedChange={setReminder} />
          </div>
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" className="flex-1 h-11" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700"
            onClick={submit}
            disabled={create.isPending || !title || !date || !time}
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar compromisso"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
