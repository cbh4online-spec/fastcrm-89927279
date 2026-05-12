import { useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, Info, ArrowRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { LEADCHEF_STAGES, LEADCHEF_STAGE_LABELS, LEADCHEF_STAGE_COLORS } from "./constants";
import type { LeadChefDashboardData } from "@/hooks/leadchef/useLeadChefDashboard";

const SEVERITY_STYLES: Record<string, { icon: any; bg: string; text: string; border: string }> = {
  critical: { icon: AlertCircle, bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  warning: { icon: AlertTriangle, bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  info: { icon: Info, bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

interface Props {
  data: LeadChefDashboardData;
}

export function LeadChefSimpleDashboard({ data }: Props) {
  const navigate = useNavigate();
  const { conversion, alerts, stageDistribution } = data;
  const totalLeads = LEADCHEF_STAGES.reduce((acc, s) => acc + (stageDistribution[s] || 0), 0);

  return (
    <div className="space-y-4">
      {/* Conversão */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-900">Conversão do mês</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <ConversionBox label="Referência → Demo" value={conversion.leadToDemoRate} />
          <ConversionBox label="Demo → Venda" value={conversion.demoToSaleRate} />
          <ConversionBox label="Referência → Venda" value={conversion.leadToSaleRate} />
        </div>
      </section>

      {/* Alertas */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Alertas úteis</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {alerts.map((alert) => {
            const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info;
            const Icon = style.icon;
            return (
              <li key={alert.id} className="px-4 py-3 flex items-start gap-3">
                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", style.bg, style.text)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{alert.description}</p>
                </div>
                {alert.action && (
                  <button
                    onClick={() => navigate(alert.action!.to)}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 shrink-0"
                  >
                    {alert.action.label}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Distribuição funil */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Distribuição do funil</h2>
          <span className="text-xs text-slate-500">{totalLeads} leads</span>
        </div>
        {totalLeads === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">Quando começares a criar leads, aparece aqui.</p>
        ) : (
          <ul className="space-y-2">
            {LEADCHEF_STAGES.map((stage) => {
              const value = stageDistribution[stage] || 0;
              const pct = totalLeads > 0 ? Math.round((value / totalLeads) * 100) : 0;
              return (
                <li key={stage}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border", LEADCHEF_STAGE_COLORS[stage])}>
                      {LEADCHEF_STAGE_LABELS[stage]}
                    </span>
                    <span className="text-slate-600 font-medium">{value} · {pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function ConversionBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="text-2xl font-bold text-slate-900">{value}%</p>
      <p className="text-[11px] uppercase tracking-wide text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
