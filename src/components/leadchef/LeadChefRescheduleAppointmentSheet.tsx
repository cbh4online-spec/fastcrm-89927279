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
import { Loader2 } from "lucide-react";
import { useRescheduleLeadChefAppointment } from "@/hooks/leadchef/useRescheduleLeadChefAppointment";
import {
  combineDateTime,
  toLocalDateInput,
  toLocalTimeInput,
} from "@/utils/leadchef/date";
import type { LeadChefAppointment } from "@/types/leadchef";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  appointment: LeadChefAppointment | null;
}

export function LeadChefRescheduleAppointmentSheet({ open, onOpenChange, appointment }: Props) {
  const reschedule = useRescheduleLeadChefAppointment();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [updateNextAction, setUpdateNextAction] = useState(true);

  useEffect(() => {
    if (open && appointment) {
      const d = new Date(appointment.scheduled_at);
      setDate(toLocalDateInput(d));
      setTime(toLocalTimeInput(d));
      setReason("");
      setUpdateNextAction(true);
    }
  }, [open, appointment]);

  const submit = async () => {
    if (!appointment || !date || !time) return;
    await reschedule.mutateAsync({
      appointment,
      scheduled_at: combineDateTime(date, time),
      reason: reason.trim() || undefined,
      updateNextAction,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Reagendar compromisso</SheetTitle>
          <SheetDescription>{appointment?.title}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nova data *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Nova hora *</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Motivo (opcional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Porquê reagendar?"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-slate-900">Atualizar próxima ação</p>
              <p className="text-xs text-slate-500">Sincroniza com o cartão do lead</p>
            </div>
            <Switch checked={updateNextAction} onCheckedChange={setUpdateNextAction} />
          </div>
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" className="flex-1 h-11" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700"
            onClick={submit}
            disabled={reschedule.isPending || !date || !time}
          >
            {reschedule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reagendar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
