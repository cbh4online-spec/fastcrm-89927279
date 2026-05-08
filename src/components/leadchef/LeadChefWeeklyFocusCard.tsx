import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLeadChefWeeklyFocus } from "@/hooks/leadchef/useLeadChefWeeklyFocus";

interface Props {
  periodMonth: string;
}

export function LeadChefWeeklyFocusCard({ periodMonth }: Props) {
  const navigate = useNavigate();
  const { items, isLoading } = useLeadChefWeeklyFocus(periodMonth);

  return (
    <section className="rounded-2xl bg-white border border-slate-200 shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-emerald-600" />
        <h2 className="text-sm font-semibold text-slate-900">Foco da semana</h2>
      </div>
      {isLoading ? (
        <div className="px-4 py-6 text-center text-xs text-slate-500">A carregar sugestões…</div>
      ) : items.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-slate-500">Sem sugestões neste momento.</div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((it, idx) => (
            <li key={it.id}>
              <button
                onClick={() => it.to && navigate(it.to)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 active:bg-slate-100"
              >
                <span className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{it.title}</p>
                  {it.hint && <p className="text-xs text-slate-500 mt-0.5">{it.hint}</p>}
                </div>
                {it.to && <ArrowRight className="h-4 w-4 text-slate-400" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
