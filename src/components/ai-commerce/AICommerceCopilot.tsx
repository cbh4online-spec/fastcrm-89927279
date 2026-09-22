/**
 * Copiloto de Conversão — diagnóstico acionável do funil da loja.
 *
 * Mostra o progresso face à meta mensal e recomendações por produto,
 * sempre baseadas em eventos reais. Cada recomendação tem ação direta.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Target, Info } from "lucide-react";
import { useConversionCopilot } from "@/hooks/useConversionCopilot";
import { BulkAICommerceDialog } from "@/components/ai-commerce/BulkAICommerceDialog";
import type { CopilotRecommendation, CopilotSeverity } from "@/lib/ai-commerce/conversionCopilot";
import type { BulkEnrichTarget } from "@/hooks/useBulkAICommerceEnrich";

const money = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const pct = (v: number) => `${v.toFixed(1)}%`;

const SEVERITY_LABEL: Record<CopilotSeverity, string> = {
  critical: "Crítico",
  warning: "Aviso",
  opportunity: "Oportunidade",
};

function SeverityBadge({ severity }: { severity: CopilotSeverity }) {
  if (severity === "critical") return <Badge variant="destructive">{SEVERITY_LABEL.critical}</Badge>;
  if (severity === "warning") return <Badge variant="secondary">{SEVERITY_LABEL.warning}</Badge>;
  return <Badge variant="outline">{SEVERITY_LABEL.opportunity}</Badge>;
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function AICommerceCopilot() {
  const [days, setDays] = useState("30");
  const [filter, setFilter] = useState<"all" | CopilotSeverity>("all");
  const [enrichTargets, setEnrichTargets] = useState<BulkEnrichTarget[]>([]);
  const [enrichOpen, setEnrichOpen] = useState(false);

  const { analysis, isLoading } = useConversionCopilot(Number(days));

  const visible = useMemo(
    () =>
      filter === "all"
        ? analysis.recommendations
        : analysis.recommendations.filter((r) => r.severity === filter),
    [analysis.recommendations, filter],
  );

  const enrichAll = () => {
    const targets = analysis.recommendations
      .filter((r) => r.action === "enrich")
      .map((r) => ({ id: r.productId, name: r.productName, sku: r.sku }));
    if (!targets.length) return;
    setEnrichTargets(targets);
    setEnrichOpen(true);
  };

  const openEnrich = (rec: CopilotRecommendation) => {
    setEnrichTargets([{ id: rec.productId, name: rec.productName, sku: rec.sku }]);
    setEnrichOpen(true);
  };

  const { totals, goal } = analysis;
  const enrichCount = analysis.recommendations.filter((r) => r.action === "enrich").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-4 pb-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" aria-hidden />
              Meta mensal
            </CardTitle>
            <CardDescription>Progresso calculado a partir das vendas confirmadas na loja.</CardDescription>
          </div>
          <div className="w-40 space-y-1">
            <Label htmlFor="copilot-period">Período analisado</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger id="copilot-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-bold tabular-nums">{money(goal.currentRevenue)}</span>
                  <span className="text-sm text-muted-foreground">meta {money(goal.target)} / mês</span>
                </div>
                <Progress value={goal.progressPct} aria-label="Progresso da meta mensal" />
                <p className="text-xs text-muted-foreground">
                  {goal.gap > 0
                    ? `Faltam ${money(goal.gap)} por mês para atingir a meta.`
                    : "Meta mensal atingida."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  label="Valor médio por compra"
                  value={totals.averageOrderValue > 0 ? money(totals.averageOrderValue) : "—"}
                />
                <KpiCard label="Visitas → carrinho" value={pct(totals.viewToCartRate)} />
                <KpiCard label="Carrinho → compra" value={pct(totals.cartToPurchaseRate)} />
                <KpiCard
                  label="Conversão global"
                  value={pct(totals.conversionRate)}
                  hint={
                    goal.visitsNeeded > 0
                      ? `${goal.ordersNeeded} compras e ${goal.visitsNeeded.toLocaleString("pt-PT")} visitas/mês para a meta`
                      : undefined
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!isLoading && !analysis.hasData && (
        <Alert>
          <Info className="h-4 w-4" aria-hidden />
          <AlertTitle>Ainda sem visitas registadas neste período</AlertTitle>
          <AlertDescription>
            Assim que a loja receber visitas e compras, o copiloto indica onde está a perder clientes. Até lá,
            complete as fichas dos produtos para ficarem prontas para o Google e para os assistentes de compra.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              Recomendações
            </CardTitle>
            <CardDescription>
              {analysis.recommendations.length} ações sugeridas, ordenadas por impacto estimado.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "critical", "warning", "opportunity"] as const).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setFilter(key)}
              >
                {key === "all" ? "Tudo" : SEVERITY_LABEL[key]}
              </Button>
            ))}
            {enrichCount > 0 && (
              <Button size="sm" onClick={enrichAll}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Melhorar {enrichCount} fichas
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <Skeleton className="h-40 w-full" />}

          {!isLoading && visible.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sem recomendações neste filtro. O funil está equilibrado no período escolhido.
            </p>
          )}

          {!isLoading &&
            visible.map((rec) => (
              <div
                key={`${rec.productId}-${rec.kind}`}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={rec.severity} />
                    <span className="truncate text-sm font-semibold">{rec.productName}</span>
                    {rec.sku && <span className="text-xs text-muted-foreground">{rec.sku}</span>}
                  </div>
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    {rec.severity === "opportunity" ? (
                      <Lightbulb className="h-3.5 w-3.5 text-primary" aria-hidden />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    )}
                    {rec.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{rec.detail}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                    Potencial estimado: {money(rec.estimatedImpact)} / mês
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  {rec.action === "enrich" ? (
                    <Button size="sm" onClick={() => openEnrich(rec)}>
                      {rec.actionLabel}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/dashboard/products?product=${rec.productId}`}>{rec.actionLabel}</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      <BulkAICommerceDialog open={enrichOpen} onOpenChange={setEnrichOpen} targets={enrichTargets} />
    </div>
  );
}
