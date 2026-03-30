import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Target, ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle, Zap, Shield, BarChart3, Settings2 } from "lucide-react";
import {
  usePortfolioEntities,
  usePortfolioTopAssets,
  usePortfolioWeakest,
  usePortfolioRecommendations,
  usePortfolioSettings,
  useRefreshPortfolio,
  useActOnPortfolioRecommendation,
  type EntityWithMetrics,
  type PortfolioRecommendation,
} from "@/hooks/usePortfolioAllocation";

const allocationColors: Record<string, string> = {
  invest_more: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  scale: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  maintain: "bg-muted text-muted-foreground border-border",
  optimize: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  deprioritize: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  pause: "bg-destructive/15 text-destructive border-destructive/30",
};

const allocationLabels: Record<string, string> = {
  invest_more: "Investir Mais",
  scale: "Escalar",
  maintain: "Manter",
  optimize: "Otimizar",
  deprioritize: "Reduzir Prioridade",
  pause: "Pausar",
};

const entityTypeLabels: Record<string, string> = {
  offer: "Oferta",
  product: "Produto",
  channel: "Canal",
  sequence: "Sequência",
  agent: "Agente",
  mission: "Missão",
  objective: "Objetivo",
};

const priorityColors: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

function EfficiencyBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-destructive";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8 text-right">{score}</span>
    </div>
  );
}

function EntityCard({ entity }: { entity: EntityWithMetrics }) {
  const m = entity.metrics;
  const alloc = m?.allocation_recommendation || "maintain";
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{entity.name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {entityTypeLabels[entity.entity_type] || entity.entity_type}
            </Badge>
          </div>
          {entity.category && (
            <span className="text-xs text-muted-foreground">{entity.category}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {m && <EfficiencyBar score={m.capital_efficiency_score} />}
        <Badge variant="outline" className={`text-[10px] px-2 ${allocationColors[alloc] || ""}`}>
          {allocationLabels[alloc] || alloc}
        </Badge>
      </div>
    </div>
  );
}

function RecommendationCard({
  rec,
  onAct,
}: {
  rec: PortfolioRecommendation;
  onAct: (id: string, action: "accepted" | "dismissed") => void;
}) {
  return (
    <Card className="border bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] ${priorityColors[rec.priority] || ""}`}>
                {rec.priority}
              </Badge>
              <span className="text-xs text-muted-foreground">{rec.recommendation_type.replace(/_/g, " ")}</span>
            </div>
            <h4 className="font-medium text-sm">{rec.title}</h4>
          </div>
          <span className="text-xs text-muted-foreground font-mono">{Math.round(rec.confidence * 100)}%</span>
        </div>
        {rec.rationale && <p className="text-xs text-muted-foreground leading-relaxed">{rec.rationale}</p>}
        {rec.expected_impact && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="w-3 h-3" />
            <span>{rec.expected_impact}</span>
          </div>
        )}
        {rec.status === "pending" && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onAct(rec.id, "accepted")}>
              <CheckCircle2 className="w-3 h-3" /> Aceitar
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => onAct(rec.id, "dismissed")}>
              <XCircle className="w-3 h-3" /> Dispensar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SettingsPanel() {
  const { data: settings, upsert } = usePortfolioSettings();
  const [local, setLocal] = useState<Record<string, number> | null>(null);

  const vals = local || {
    revenue_weight: settings?.revenue_weight ?? 0.35,
    risk_weight: settings?.risk_weight ?? 0.15,
    effort_weight: settings?.effort_weight ?? 0.20,
    automation_weight: settings?.automation_weight ?? 0.10,
    strategy_weight: settings?.strategy_weight ?? 0.20,
  };

  const weightSliders = [
    { key: "revenue_weight", label: "Receita", icon: BarChart3 },
    { key: "risk_weight", label: "Risco", icon: Shield },
    { key: "effort_weight", label: "Esforço", icon: Target },
    { key: "automation_weight", label: "Automação", icon: Zap },
    { key: "strategy_weight", label: "Estratégia", icon: TrendingUp },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> Pesos de Eficiência
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {weightSliders.map(({ key, label, icon: Icon }) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                {label}
              </div>
              <span className="text-xs font-mono text-muted-foreground">{Math.round((vals[key] || 0) * 100)}%</span>
            </div>
            <Slider
              value={[Math.round((vals[key] || 0) * 100)]}
              min={0}
              max={50}
              step={5}
              onValueChange={([v]) => setLocal({ ...vals, [key]: v / 100 })}
            />
          </div>
        ))}
        <Button
          size="sm"
          className="w-full mt-2"
          disabled={!local}
          onClick={() => {
            if (local) {
              upsert.mutate(local as any);
              setLocal(null);
            }
          }}
        >
          Guardar Pesos
        </Button>
      </CardContent>
    </Card>
  );
}

export default function PortfolioCenterPage() {
  const { data: entities, isLoading: entitiesLoading } = usePortfolioEntities();
  const { data: topAssets } = usePortfolioTopAssets();
  const { data: weakest } = usePortfolioWeakest();
  const { data: recommendations, isLoading: recsLoading } = usePortfolioRecommendations("pending");
  const refresh = useRefreshPortfolio();
  const actOn = useActOnPortfolioRecommendation();

  const entityTypes = [...new Set((entities || []).map((e) => e.entity_type))];

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio & Alocação</h1>
          <p className="text-sm text-muted-foreground mt-1">Capital de atenção, eficiência e decisões de foco</p>
        </div>
        <Button onClick={() => refresh.mutate()} disabled={refresh.isPending} className="gap-2">
          {refresh.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Atualizar Portfolio
        </Button>
      </div>

      {entitiesLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (entities || []).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">Sem dados de portfolio</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Clique em "Atualizar Portfolio" para analisar as suas ofertas, canais e ativos e gerar recomendações de alocação.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="grid">Grelha de Eficiência</TabsTrigger>
            <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
            <TabsTrigger value="settings">Definições</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Assets */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Top Assets — Investir Mais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(topAssets || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem dados</p>
                  ) : (
                    topAssets!.map((e) => <EntityCard key={e.id} entity={e} />)
                  )}
                </CardContent>
              </Card>

              {/* Weakest */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-destructive" /> Áreas a Cortar / Reduzir
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(weakest || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem dados</p>
                  ) : (
                    weakest!.map((e) => <EntityCard key={e.id} entity={e} />)
                  )}
                </CardContent>
              </Card>
            </div>

            {/* By Type */}
            {entityTypes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {entityTypes.map((type) => {
                  const items = (entities || []).filter((e) => e.entity_type === type);
                  return (
                    <Card key={type}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
                          {entityTypeLabels[type] || type} ({items.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1.5">
                        {items.slice(0, 4).map((e) => (
                          <div key={e.id} className="flex items-center justify-between text-xs">
                            <span className="truncate">{e.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-muted-foreground">
                                {e.metrics?.capital_efficiency_score ?? "—"}
                              </span>
                              {e.metrics && (
                                <Badge variant="outline" className={`text-[9px] px-1 ${allocationColors[e.metrics.allocation_recommendation] || ""}`}>
                                  {allocationLabels[e.metrics.allocation_recommendation] || e.metrics.allocation_recommendation}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                        {items.length > 4 && (
                          <span className="text-[10px] text-muted-foreground">+{items.length - 4} mais</span>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Top Recommendations Preview */}
            {(recommendations || []).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4" /> Foco Recomendado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {recommendations!.slice(0, 4).map((r) => (
                      <RecommendationCard key={r.id} rec={r} onAct={(id, action) => actOn.mutate({ id, action })} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Efficiency Grid */}
          <TabsContent value="grid">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 font-medium text-xs text-muted-foreground">Tipo</th>
                        <th className="text-left p-3 font-medium text-xs text-muted-foreground">Nome</th>
                        <th className="text-right p-3 font-medium text-xs text-muted-foreground">Receita</th>
                        <th className="text-right p-3 font-medium text-xs text-muted-foreground">Conversão</th>
                        <th className="text-right p-3 font-medium text-xs text-muted-foreground">Risco</th>
                        <th className="p-3 font-medium text-xs text-muted-foreground">Eficiência</th>
                        <th className="p-3 font-medium text-xs text-muted-foreground">Alocação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(entities || []).map((e) => {
                        const m = e.metrics;
                        return (
                          <tr key={e.id} className="border-b hover:bg-accent/30 transition-colors">
                            <td className="p-3">
                              <Badge variant="outline" className="text-[10px]">
                                {entityTypeLabels[e.entity_type] || e.entity_type}
                              </Badge>
                            </td>
                            <td className="p-3 font-medium">{e.name}</td>
                            <td className="p-3 text-right font-mono text-xs">
                              {m ? `€${Math.round(m.revenue_actual).toLocaleString()}` : "—"}
                            </td>
                            <td className="p-3 text-right font-mono text-xs">
                              {m ? `${(m.conversion_rate * 100).toFixed(1)}%` : "—"}
                            </td>
                            <td className="p-3 text-right">
                              {m ? (
                                <span className={`font-mono text-xs ${m.risk_score >= 70 ? "text-destructive" : m.risk_score >= 40 ? "text-amber-600" : "text-emerald-600"}`}>
                                  {m.risk_score}
                                </span>
                              ) : "—"}
                            </td>
                            <td className="p-3">{m ? <EfficiencyBar score={m.capital_efficiency_score} /> : "—"}</td>
                            <td className="p-3">
                              {m ? (
                                <Badge variant="outline" className={`text-[10px] ${allocationColors[m.allocation_recommendation] || ""}`}>
                                  {allocationLabels[m.allocation_recommendation] || m.allocation_recommendation}
                                </Badge>
                              ) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations */}
          <TabsContent value="recommendations">
            {recsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (recommendations || []).length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Target className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Sem recomendações pendentes</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations!.map((r) => (
                  <RecommendationCard key={r.id} rec={r} onAct={(id, action) => actOn.mutate({ id, action })} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <div className="max-w-md">
              <SettingsPanel />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
