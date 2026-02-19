import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Flame, BarChart3, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useRevenueForecast, useGenerateRevenueForecast, formatCurrency, RevenueForecast } from "@/hooks/useRevenueForecast";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDealScores, getCategoryColors, getCategoryLabel } from "@/hooks/useDealScores";
import { toast } from "sonner";

// ── Risk Index helpers ────────────────────────────────────────────────────────

function getRiskColor(risk: number) {
  if (risk <= 0.4) return "text-emerald-600 dark:text-emerald-400";
  if (risk <= 0.7) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

function getRiskBg(risk: number) {
  if (risk <= 0.4) return "bg-emerald-500";
  if (risk <= 0.7) return "bg-amber-500";
  return "bg-destructive";
}

function getRiskLabel(risk: number) {
  if (risk <= 0.4) return "Risco baixo — pipeline diversificado";
  if (risk <= 0.7) return "Risco moderado — concentração em poucos deals";
  return "Risco elevado — dispersão entre negócios quentes e reais";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HorizonChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-muted/50 rounded-lg px-4 py-2.5 min-w-[100px]">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="text-base font-bold text-foreground">{formatCurrency(value)}</span>
    </div>
  );
}

function ScenarioCard({
  label,
  value,
  description,
  highlight = false,
  trend,
}: {
  label: string;
  value: number;
  description: string;
  highlight?: boolean;
  trend?: number | null;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 flex flex-col gap-1",
        highlight
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card"
      )}
    >
      <div className="flex items-center gap-2 justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        {highlight && <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-semibold">★</span>}
      </div>
      <p className="text-xl font-bold text-foreground">{formatCurrency(value)}</p>
      {trend != null && (
        <span className={cn("flex items-center gap-0.5 text-xs font-medium", trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
          {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend > 0 ? "+" : ""}{trend}% vs anterior
        </span>
      )}
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
  );
}

function DistributionDot({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", color)} />
      <span className="text-xs text-muted-foreground">{count} {label}</span>
    </div>
  );
}

// ── Opportunity Forecast Table ────────────────────────────────────────────────

function OpportunityForecastTable() {
  const { currentWorkspace } = useWorkspace();
  const { scoresMap } = useDealScores();

  const { data: opps = [], isLoading } = useQuery({
    queryKey: ["opportunities-forecast-breakdown", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from("opportunities")
        .select("id, title, value, expected_close_date")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "open")
        .order("value", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (opps.length === 0) return null;

  const WEIGHTS: Record<string, number> = { hot: 0.9, likely: 0.7, uncertain: 0.4, low: 0.15 };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Contribuição por Oportunidade
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Oportunidade</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Valor</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Score</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Rec. Ponderada</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Fecho Esperado</th>
              </tr>
            </thead>
            <tbody>
              {opps.map((opp) => {
                const score = scoresMap.get(opp.id);
                const prob = score ? score.close_score / 100 : 0.3;
                const weight = score ? (WEIGHTS[score.category] ?? 0.4) : 0.4;
                const weightedRev = (opp.value || 0) * prob * weight;
                return (
                  <tr key={opp.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground text-xs truncate max-w-[200px]">{opp.title}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-foreground">
                      {formatCurrency(opp.value || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {score ? (
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", getCategoryColors(score.category))}>
                          {Math.round(score.close_score)} {getCategoryLabel(score.category)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-primary">
                      {formatCurrency(weightedRev)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {opp.expected_close_date
                        ? new Date(opp.expected_close_date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Card ─────────────────────────────────────────────────────────────────

export function RevenueIntelligenceCard({ showTable = false }: { showTable?: boolean }) {
  const { latestForecast, trend, isLoading } = useRevenueForecast();
  const generate = useGenerateRevenueForecast();

  const handleGenerate = async () => {
    try {
      await generate.mutateAsync();
      toast.success("Previsão de receita atualizada!");
    } catch {
      toast.error("Erro ao gerar previsão.");
    }
  };

  const isStale = latestForecast
    ? (Date.now() - new Date(latestForecast.generated_at).getTime()) > 24 * 60 * 60 * 1000
    : false;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Skeleton className="h-14 flex-1" />
            <Skeleton className="h-14 flex-1" />
            <Skeleton className="h-14 flex-1" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!latestForecast) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-semibold text-foreground">Nenhuma previsão gerada</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Clique em <strong>Gerar Previsão</strong> para calcular a receita esperada com base
              nos scores comportamentais das oportunidades abertas.
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={generate.isPending}>
            <RefreshCw className={cn("h-4 w-4 mr-2", generate.isPending && "animate-spin")} />
            {generate.isPending ? "A calcular..." : "Gerar Previsão"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const riskPct = Math.round(latestForecast.risk_index * 100);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Revenue Intelligence</CardTitle>
              {isStale && (
                <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600 gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Desatualizado
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(latestForecast.generated_at), { addSuffix: true, locale: pt })}
              </span>
              <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generate.isPending} className="h-7 px-2 text-xs gap-1">
                <RefreshCw className={cn("h-3 w-3", generate.isPending && "animate-spin")} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Horizons */}
          <div className="flex gap-2 flex-wrap">
            <HorizonChip label="7 dias" value={latestForecast.forecast_7} />
            <HorizonChip label="30 dias" value={latestForecast.forecast_30} />
            <HorizonChip label="90 dias" value={latestForecast.forecast_90} />
          </div>

          {/* Scenarios */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ScenarioCard
              label="Melhor Caso"
              value={latestForecast.best_case}
              description="Soma das oportunidades Hot"
            />
            <ScenarioCard
              label="Caso Esperado"
              value={latestForecast.expected_case}
              description="Score × valor de cada deal"
              highlight
              trend={trend}
            />
            <ScenarioCard
              label="Pior Caso"
              value={latestForecast.worst_case}
              description="Score × confiança × valor"
            />
          </div>

          {/* Risk index */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className={cn("h-3.5 w-3.5", getRiskColor(latestForecast.risk_index))} />
                <span className="text-xs font-medium text-foreground">Índice de Risco</span>
              </div>
              <span className={cn("text-xs font-bold", getRiskColor(latestForecast.risk_index))}>
                {riskPct}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", getRiskBg(latestForecast.risk_index))}
                style={{ width: `${riskPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{getRiskLabel(latestForecast.risk_index)}</p>
          </div>

          {/* Confidence avg */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Confiança Média</span>
              <span className="text-xs font-bold text-foreground">{Math.round(latestForecast.confidence_avg)} pts</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${latestForecast.confidence_avg}%` }}
              />
            </div>
          </div>

          {/* Distribution */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 border-t border-border/50">
            <DistributionDot color="bg-destructive" label="Hot" count={latestForecast.hot_count} />
            <DistributionDot color="bg-emerald-500" label="Likely" count={latestForecast.likely_count} />
            <DistributionDot color="bg-amber-500" label="Uncertain" count={latestForecast.uncertain_count} />
            <DistributionDot color="bg-muted-foreground/40" label="Low" count={latestForecast.low_count} />
            <span className="ml-auto text-xs text-muted-foreground">{latestForecast.opportunity_count} oportunidades</span>
          </div>
        </CardContent>
      </Card>

      {showTable && <OpportunityForecastTable />}
    </div>
  );
}
