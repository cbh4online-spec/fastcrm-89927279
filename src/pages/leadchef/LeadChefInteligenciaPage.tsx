import { Flame, Snowflake, RefreshCcw, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefLeadScoreBadge } from "@/components/leadchef/LeadChefLeadScoreBadge";
import { Button } from "@/components/ui/button";
import { useLeadChefTopScores, useLeadChefColdLeads } from "@/hooks/leadchef/useLeadChefTopScores";
import { useRecomputeLeadChefScores } from "@/hooks/leadchef/useRecomputeLeadChefScores";

export default function LeadChefInteligenciaPage() {
  const navigate = useNavigate();
  const top = useLeadChefTopScores(10);
  const cold = useLeadChefColdLeads(20);
  const recompute = useRecomputeLeadChefScores();

  const isLoading = top.isLoading || cold.isLoading;

  return (
    <LeadChefMobileShell
      title="Inteligência"
      subtitle="Score e sugestões das tuas referências"
    >
      <div className="px-4 pt-3 pb-2">
        <Button
          onClick={() => recompute.mutate(undefined)}
          disabled={recompute.isPending}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {recompute.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A calcular...</>
          ) : (
            <><RefreshCcw className="h-4 w-4 mr-2" /> Recalcular scores agora</>
          )}
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Top scores */}
          <section className="px-4 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="h-4 w-4 text-red-500" />
              <h2 className="text-sm font-semibold text-slate-900">Top 10 leads quentes</h2>
            </div>
            {(top.data?.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Sem leads ativos. Recalcula scores para começar.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                {top.data!.map((row) => (
                  <button
                    key={row.lead_id}
                    onClick={() => navigate(`/dashboard/leadchef/leads/${row.lead_id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 text-left"
                  >
                    <LeadChefLeadScoreBadge score={row.score} isCold={row.is_cold} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {row.lead?.name ?? "Sem nome"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {row.lead?.phone ?? row.lead?.email ?? "—"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Cold leads */}
          <section className="px-4 pt-6 pb-8">
            <div className="flex items-center gap-2 mb-2">
              <Snowflake className="h-4 w-4 text-sky-500" />
              <h2 className="text-sm font-semibold text-slate-900">Leads frios para reativar</h2>
            </div>
            {(cold.data?.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Sem leads frios. Bom trabalho!
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                {cold.data!.map((row) => (
                  <button
                    key={row.lead_id}
                    onClick={() => navigate(`/dashboard/leadchef/leads/${row.lead_id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 text-left"
                  >
                    <LeadChefLeadScoreBadge score={row.score} isCold />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {row.lead?.name ?? "Sem nome"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        Reativar com sugestão IA
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </LeadChefMobileShell>
  );
}
