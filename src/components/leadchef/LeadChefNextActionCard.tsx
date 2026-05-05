import { CheckCircle2, Clock, AlertTriangle, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LEADCHEF_ACTIVITY_LABELS } from "./constants";
import type { LeadChefLeadProfile } from "@/types/leadchef";

interface Props {
  profile: LeadChefLeadProfile;
  onMarkDone?: () => void;
  onReschedule?: () => void;
  onCreate?: () => void;
}

export function LeadChefNextActionCard({
  profile,
  onMarkDone,
  onReschedule,
  onCreate,
}: Props) {
  const at = profile.next_action_at;
  const has = !!at;
  const overdue = has && new Date(at!).getTime() < Date.now();
  const today =
    has && new Date(at!).toDateString() === new Date().toDateString();

  const formatted = at
    ? new Date(at).toLocaleString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  if (!has) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">Próxima ação</h2>
        <p className="text-xs text-slate-500 mb-3">
          Este lead ainda não tem próxima ação agendada.
        </p>
        <Button
          onClick={onCreate}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" /> Criar próxima ação
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm",
        overdue
          ? "bg-rose-50 border-rose-200"
          : today
          ? "bg-amber-50 border-amber-200"
          : "bg-white border-slate-200"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-900">Próxima ação</h2>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
            overdue
              ? "bg-rose-100 text-rose-700"
              : today
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-700"
          )}
        >
          {overdue ? (
            <>
              <AlertTriangle className="h-3 w-3" /> Atrasada
            </>
          ) : today ? (
            <>
              <Clock className="h-3 w-3" /> Hoje
            </>
          ) : (
            <>
              <Clock className="h-3 w-3" /> Agendada
            </>
          )}
        </span>
      </div>

      <p className="text-sm font-medium text-slate-900">
        {profile.next_action_type
          ? LEADCHEF_ACTIVITY_LABELS[profile.next_action_type]
          : "Ação"}
      </p>
      <p className="text-xs text-slate-600 mt-0.5">{formatted}</p>
      {profile.next_action_note && (
        <p className="text-xs text-slate-700 mt-2 whitespace-pre-wrap">
          {profile.next_action_note}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 mt-4">
        <Button
          size="sm"
          onClick={onMarkDone}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <CheckCircle2 className="h-4 w-4 mr-1" /> Feito
        </Button>
        <Button size="sm" variant="outline" onClick={onReschedule}>
          <RotateCcw className="h-4 w-4 mr-1" /> Reagendar
        </Button>
        <Button size="sm" variant="outline" onClick={onCreate}>
          <Plus className="h-4 w-4 mr-1" /> Nova
        </Button>
      </div>
    </div>
  );
}
