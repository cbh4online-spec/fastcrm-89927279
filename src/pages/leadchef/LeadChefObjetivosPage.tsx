import { useState } from "react";
import { Loader2, Pencil, Wallet } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { Button } from "@/components/ui/button";
import { LeadChefMonthSelector } from "@/components/leadchef/LeadChefMonthSelector";
import { LeadChefGoalEditorSheet } from "@/components/leadchef/LeadChefGoalEditorSheet";
import { LeadChefGoalEmptyState } from "@/components/leadchef/LeadChefGoalEmptyState";
import { LeadChefMonthlySummary } from "@/components/leadchef/LeadChefMonthlySummary";
import { LeadChefGoalProgress } from "@/components/leadchef/LeadChefGoalProgress";
import { LeadChefSimpleDashboard } from "@/components/leadchef/LeadChefSimpleDashboard";
import { LeadChefWeeklyFocusCard } from "@/components/leadchef/LeadChefWeeklyFocusCard";
import { LeadChefGoalProgressBar } from "@/components/leadchef/LeadChefGoalProgressBar";
import { useLeadChefDashboard } from "@/hooks/leadchef/useLeadChefDashboard";
import { startOfMonthIso, formatMonthPt, calculateGoalProgress } from "@/utils/leadchef/goals";

export default function LeadChefObjetivosPage() {
  const [month, setMonth] = useState<string>(startOfMonthIso());
  const [editorOpen, setEditorOpen] = useState(false);
  const { data, isLoading, isError } = useLeadChefDashboard(month);

  const monthLabel = formatMonthPt(month);
  const hasGoals = !!data?.goals;
  const incomePct = calculateGoalProgress(data?.progress?.incomeEstimated ?? 0, data?.goals?.income_goal ?? 0);

  return (
    <LeadChefMobileShell title="Objetivos" subtitle="Acompanha demonstrações, vendas, referências e crescimento.">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <LeadChefMonthSelector value={month} onChange={setMonth} />
        <Button
          onClick={() => setEditorOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          size="sm"
        >
          <Pencil className="h-4 w-4 mr-1.5" />
          {hasGoals ? "Editar objetivos" : "Definir objetivos"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-600">Não foi possível carregar os objetivos.</p>
        </div>
      ) : !hasGoals ? (
        <>
          <LeadChefGoalEmptyState onCreate={() => setEditorOpen(true)} monthLabel={monthLabel} />
          <LeadChefMonthlySummary goals={null} progress={data.progress!} />
        </>
      ) : (
        <>
          {/* Resumo mensal */}
          <section>
            <h2 className="text-sm font-semibold text-slate-900 mb-2">Resumo do mês</h2>
            <LeadChefMonthlySummary goals={data.goals} progress={data.progress!} />
          </section>

          {/* Progresso principal */}
          <section>
            <h2 className="text-sm font-semibold text-slate-900 mb-2">Progresso principal</h2>
            <LeadChefGoalProgress goals={data.goals} progress={data.progress!} />
          </section>

          {/* Objetivo financeiro */}
          <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">Objetivo financeiro</h2>
            </div>
            {data.goals!.income_goal > 0 ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">
                    {(data.progress!.incomeEstimated || 0).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
                  </span>
                  <span className="text-sm text-slate-500">
                    de {data.goals!.income_goal.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
                  </span>
                </div>
                <LeadChefGoalProgressBar
                  current={data.progress!.incomeEstimated}
                  goal={data.goals!.income_goal}
                  className="mt-2"
                />
                {(!data.progress!.incomeEstimated || data.progress!.incomeEstimated === 0) && (
                  <p className="text-xs text-slate-500 mt-2">
                    Liga esta métrica a vendas reais numa fase futura.
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500">Sem objetivo de rendimento definido para este mês.</p>
            )}
            <p className="sr-only">{incomePct}%</p>
          </section>

          {/* Foco da semana */}
          <LeadChefWeeklyFocusCard periodMonth={month} />

          {/* Dashboard simples (alertas, conversão, distribuição) */}
          <LeadChefSimpleDashboard data={data} />
        </>
      )}

      <LeadChefGoalEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        periodMonth={month}
        current={data?.goals ?? null}
      />
    </LeadChefMobileShell>
  );
}
