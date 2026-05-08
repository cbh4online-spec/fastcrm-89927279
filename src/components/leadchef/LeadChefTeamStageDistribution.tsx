import type { LeadChefStage } from "@/types/leadchef";
import { LEADCHEF_STAGE_LABELS } from "./constants";

interface Props {
  distribution: Record<LeadChefStage, number>;
}

export function LeadChefTeamStageDistribution({ distribution }: Props) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;
  const stages = Object.keys(distribution) as LeadChefStage[];

  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Funil da equipa</h2>
      <ul className="space-y-2">
        {stages.map((s) => {
          const v = distribution[s];
          const pct = Math.round((v / total) * 100);
          return (
            <li key={s}>
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span>{LEADCHEF_STAGE_LABELS[s]}</span>
                <span className="font-medium">{v} · {pct}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
