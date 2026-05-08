import { useLeadChefSequenceRunLogs } from "@/hooks/leadchef/useLeadChefSequenceRunLogs";
import { CheckCircle2, PauseCircle, AlertTriangle, ArrowRightCircle, Loader2, Sparkles, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  runId?: string | null;
  className?: string;
}

const STATUS_META: Record<string, { icon: any; color: string; label: string }> = {
  enrolled:  { icon: Sparkles,        color: "text-violet-600 bg-violet-50 border-violet-100", label: "Inscrito" },
  stepped:   { icon: ArrowRightCircle,color: "text-emerald-700 bg-emerald-50 border-emerald-100", label: "Passo" },
  paused:    { icon: PauseCircle,     color: "text-amber-700 bg-amber-50 border-amber-100", label: "Pausa" },
  completed: { icon: CheckCircle2,    color: "text-sky-700 bg-sky-50 border-sky-100", label: "Concluída" },
  skipped:   { icon: AlertTriangle,   color: "text-slate-600 bg-slate-50 border-slate-200", label: "Ignorado" },
  error:     { icon: AlertTriangle,   color: "text-rose-700 bg-rose-50 border-rose-100", label: "Erro" },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export function LeadChefSequenceRunLogPanel({ runId, className }: Props) {
  const { data, isLoading } = useLeadChefSequenceRunLogs(runId);

  if (!runId) return null;

  return (
    <div className={cn("rounded-2xl bg-white border border-slate-200 p-4 shadow-sm", className)}>
      <div className="flex items-center gap-2 mb-3">
        <History className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-900">Histórico de execução</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
          <Loader2 className="h-3 w-3 animate-spin" /> A carregar logs…
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-xs text-slate-500">Sem execuções registadas para esta sequência.</p>
      ) : (
        <ol className="space-y-2">
          {data.map((log) => {
            const meta = STATUS_META[log.status] ?? STATUS_META.skipped;
            const Icon = meta.icon;
            return (
              <li key={log.id} className={cn("flex items-start gap-2 text-xs px-2 py-2 rounded-lg border", meta.color)}>
                <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{meta.label}</span>
                    {log.step_order != null && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/70 border border-current/20">
                        passo {log.step_order}
                      </span>
                    )}
                    {log.action_type && (
                      <span className="text-[10px] uppercase tracking-wide opacity-70">{log.action_type}</span>
                    )}
                    <span className="ml-auto text-[10px] opacity-70">{formatTime(log.executed_at)}</span>
                  </div>
                  {log.message && <p className="mt-0.5 text-slate-800/90">{log.message}</p>}
                  {log.reason && (
                    <p className="mt-0.5 text-[10px] opacity-70">motivo: {log.reason}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
