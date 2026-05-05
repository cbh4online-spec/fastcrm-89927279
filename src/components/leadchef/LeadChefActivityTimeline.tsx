import { Loader2, Activity } from "lucide-react";
import { LEADCHEF_ACTIVITY_LABELS } from "./constants";
import { useLeadChefActivities } from "@/hooks/leadchef/useLeadChefActivities";
import type { LeadChefActivityType } from "@/types/leadchef";

interface Props {
  leadId: string;
}

export function LeadChefActivityTimeline({ leadId }: Props) {
  const { data, isLoading } = useLeadChefActivities(leadId);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-emerald-600" />
        <h2 className="text-sm font-semibold text-slate-900">Histórico</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">
          Ainda não há atividades registadas.
        </p>
      ) : (
        <ol className="space-y-3">
          {data.map((a: any) => {
            const date = new Date(a.created_at).toLocaleString("pt-PT", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
            const label =
              LEADCHEF_ACTIVITY_LABELS[a.activity_type as LeadChefActivityType] ||
              a.activity_type;
            const meta = (a.metadata ?? {}) as Record<string, unknown>;
            const result = (meta.result as string) || null;
            const completed = !!meta.completed_at;
            return (
              <li
                key={a.id}
                className="border-l-2 border-emerald-200 pl-3 py-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {label}
                  </p>
                  <span className="text-[10px] text-slate-500 shrink-0">{date}</span>
                </div>
                <p className="text-xs text-slate-700 mt-0.5">{a.title}</p>
                {a.description && (
                  <p className="text-[11px] text-slate-500 mt-0.5 whitespace-pre-wrap">
                    {a.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {result && (
                    <span className="inline-flex text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {result}
                    </span>
                  )}
                  {completed && (
                    <span className="inline-flex text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                      Concluído
                    </span>
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
