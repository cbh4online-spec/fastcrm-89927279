import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefAgendaFilters } from "@/components/leadchef/LeadChefAgendaFilters";
import { LeadChefAgendaList } from "@/components/leadchef/LeadChefAgendaList";
import { LeadChefAgendaEmptyState } from "@/components/leadchef/LeadChefAgendaEmptyState";
import { LeadChefCreateAppointmentSheet } from "@/components/leadchef/LeadChefCreateAppointmentSheet";
import { LeadChefRescheduleAppointmentSheet } from "@/components/leadchef/LeadChefRescheduleAppointmentSheet";
import { LeadChefCompleteAppointmentSheet } from "@/components/leadchef/LeadChefCompleteAppointmentSheet";
import { useLeadChefAgenda } from "@/hooks/leadchef/useLeadChefAgenda";
import { useCancelLeadChefAppointment } from "@/hooks/leadchef/useCancelLeadChefAppointment";
import type {
  LeadChefAgendaPeriod,
  LeadChefAppointment,
  LeadChefAppointmentType,
} from "@/types/leadchef";

const EMPTY_MESSAGE: Record<LeadChefAgendaPeriod, string> = {
  today: "Não tens compromissos para hoje.",
  week: "Ainda não existem compromissos marcados para esta semana.",
  month: "Sem compromissos marcados para este mês.",
  overdue: "Sem compromissos em atraso. Bom trabalho!",
  all: "Ainda não existem compromissos.",
};

export default function LeadChefAgendaPage() {
  const [period, setPeriod] = useState<LeadChefAgendaPeriod>("today");
  const [type, setType] = useState<LeadChefAppointmentType | "all">("all");
  const [openCreate, setOpenCreate] = useState(false);
  const [openReschedule, setOpenReschedule] = useState(false);
  const [openComplete, setOpenComplete] = useState(false);
  const [openCancel, setOpenCancel] = useState(false);
  const [target, setTarget] = useState<LeadChefAppointment | null>(null);

  const { agenda, isLoading, isError } = useLeadChefAgenda({ period, type });
  const cancel = useCancelLeadChefAppointment();

  const noFilters = type === "all";
  const emptyMsg = (agenda.counters.total === 0 || noFilters)
    ? EMPTY_MESSAGE[period]
    : "Não encontrámos compromissos com estes filtros.";

  const handleConfirmCancel = async () => {
    if (!target) return;
    await cancel.mutateAsync({ appointment: target });
    setOpenCancel(false);
    setTarget(null);
  };

  return (
    <LeadChefMobileShell title="Agenda" subtitle="Demonstrações, chamadas, follow-ups e visitas.">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-slate-500">
          {agenda.counters.total} compromissos
          {agenda.counters.overdue > 0 && (
            <span className="ml-2 text-rose-600 font-medium">
              · {agenda.counters.overdue} em atraso
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => { setTarget(null); setOpenCreate(true); }}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Novo compromisso
        </Button>
      </div>

      <LeadChefAgendaFilters
        period={period}
        onPeriodChange={setPeriod}
        type={type}
        onTypeChange={setType}
        counters={agenda.counters}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-600">Não foi possível carregar a agenda.</p>
        </div>
      ) : agenda.groups.length === 0 ? (
        <LeadChefAgendaEmptyState
          message={emptyMsg}
          onCreate={() => { setTarget(null); setOpenCreate(true); }}
        />
      ) : (
        <LeadChefAgendaList
          groups={agenda.groups}
          onComplete={(a) => { setTarget(a); setOpenComplete(true); }}
          onReschedule={(a) => { setTarget(a); setOpenReschedule(true); }}
          onCancel={(a) => { setTarget(a); setOpenCancel(true); }}
        />
      )}

      <LeadChefCreateAppointmentSheet
        open={openCreate}
        onOpenChange={setOpenCreate}
      />

      <LeadChefRescheduleAppointmentSheet
        open={openReschedule}
        onOpenChange={setOpenReschedule}
        appointment={target}
      />

      <LeadChefCompleteAppointmentSheet
        open={openComplete}
        onOpenChange={setOpenComplete}
        appointment={target}
      />

      <AlertDialog open={openCancel} onOpenChange={setOpenCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar compromisso?</AlertDialogTitle>
            <AlertDialogDescription>
              O compromisso será marcado como cancelado mas não será apagado do histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Cancelar compromisso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LeadChefMobileShell>
  );
}
