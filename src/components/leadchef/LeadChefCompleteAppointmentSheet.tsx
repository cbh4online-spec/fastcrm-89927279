import { useEffect, useState } from "react";
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
import { Loader2 } from "lucide-react";
import {
  LEADCHEF_APPOINTMENT_OUTCOMES,
  LEADCHEF_APPOINTMENT_OUTCOME_LABELS,
  LEADCHEF_APPOINTMENT_TYPES,
  LEADCHEF_APPOINTMENT_TYPE_LABELS,
} from "./constants";
import { useCompleteLeadChefAppointment } from "@/hooks/leadchef/useCompleteLeadChefAppointment";
import {
  combineDateTime,
  toLocalDateInput,
  toLocalTimeInput,
} from "@/utils/leadchef/date";
import type {
  LeadChefAppointment,
  LeadChefAppointmentOutcome,
  LeadChefAppointmentType,
} from "@/types/leadchef";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  appointment: LeadChefAppointment | null;
}

export function LeadChefCompleteAppointmentSheet({ open, onOpenChange, appointment }: Props) {
  const complete = useCompleteLeadChefAppointment();
  const [outcome, setOutcome] = useState<LeadChefAppointmentOutcome>("done");
  const [notes, setNotes] = useState("");
  const [createNext, setCreateNext] = useState(false);
  const [nextType, setNextType] = useState<LeadChefAppointmentType>("follow_up");
  const [nextDate, setNextDate] = useState("");
  const [nextTime, setNextTime] = useState("");

  useEffect(() => {
    if (open) {
      setOutcome("done");
      setNotes("");
      setCreateNext(false);
      setNextType("follow_up");
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      setNextDate(toLocalDateInput(tomorrow));
      setNextTime(toLocalTimeInput(tomorrow));
    }
  }, [open]);

  const submit = async () => {
    if (!appointment) return;
    await complete.mutateAsync({
      appointment,
      outcome,
      notes: notes.trim() || undefined,
      nextAction:
        createNext && nextDate && nextTime
          ? {
              type: nextType,
              scheduled_at: combineDateTime(nextDate, nextTime),
              note: notes.trim() || undefined,
            }
          : null,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Concluir compromisso</SheetTitle>
          <SheetDescription>{appointment?.title}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Resultado *</Label>
            <Select value={outcome} onValueChange={(v) => setOutcome(v as LeadChefAppointmentOutcome)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEADCHEF_APPOINTMENT_OUTCOMES.map((o) => (
                  <SelectItem key={o} value={o}>{LEADCHEF_APPOINTMENT_OUTCOME_LABELS[o]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Nota</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="O que aconteceu?"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-slate-900">Criar próxima ação</p>
              <p className="text-xs text-slate-500">Define o próximo passo com este lead</p>
            </div>
            <Switch checked={createNext} onCheckedChange={setCreateNext} />
          </div>

          {createNext && (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={nextType} onValueChange={(v) => setNextType(v as LeadChefAppointmentType)}>
                  <SelectTrigger className="h-11 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEADCHEF_APPOINTMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{LEADCHEF_APPOINTMENT_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Data</Label>
                  <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="h-11 bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label>Hora</Label>
                  <Input type="time" value={nextTime} onChange={(e) => setNextTime(e.target.value)} className="h-11 bg-white" />
                </div>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" className="flex-1 h-11" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700"
            onClick={submit}
            disabled={complete.isPending}
          >
            {complete.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Concluir"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
