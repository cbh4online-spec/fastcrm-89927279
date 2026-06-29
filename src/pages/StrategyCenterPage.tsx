import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, Target, TrendingUp, AlertTriangle, Check, X, ArrowRight, History, Settings, Brain } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useStrategicState,
  useStrategicHypotheses,
  useStrategicRecommendations,
  useStrategySettings,
  useRefreshStrategy,
  useActOnRecommendation,
  useStrategyHistory,
} from "@/hooks/useStrategyLayer";
import StrategyExecutiveBrief from "@/components/strategy/StrategyExecutiveBrief";

const growthModeColors: Record<string, string> = {
  acquisition: "bg-blue-500/10 text-blue-700 border-blue-300",
  conversion: "bg-green-500/10 text-green-700 border-green-300",
  retention: "bg-purple-500/10 text-purple-700 border-purple-300",
  recovery: "bg-orange-500/10 text-orange-700 border-orange-300",
  stabilization: "bg-muted text-muted-foreground border-border",
};

const growthModeLabels: Record<string, string> = {
  acquisition: "Aquisição",
  conversion: "Conversão",
  retention: "Retenção",
  recovery: "Recuperação",
  stabilization: "Estabilização",
};

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-orange-500/10 text-orange-700 border-orange-300",
  low: "bg-muted text-muted-foreground border-border",
};

export default function StrategyCenterPage() {
  const { data: snapshot, isLoading: loadingState } = useStrategicState();
  const { data: hypotheses = [] } = useStrategicHypotheses("active");
  const { data: recommendations = [] } = useStrategicRecommendations();
  const { settings, upsert: upsertSettings } = useStrategySettings();
  const refreshStrategy = useRefreshStrategy();
  const actOnRec = useActOnRecommendation();
  const { data: history = [] } = useStrategyHistory();
  const [tab, setTab] = useState("overview");

  const pendingRecs = recommendations.filter((r: any) => r.status === "pending");

  return (
    <DashboardLayout>
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Centro de Estratégia
          </h1>
          <p className="text-muted-foreground text-sm">Diagnóstico, hipóteses e recomendações estratégicas do workspace</p>
        </div>
        <Button onClick={() => refreshStrategy.mutate()} disabled={refreshStrategy.isPending} size="sm">
          {refreshStrategy.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Atualizar Estratégia
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="hypotheses">Hipóteses ({hypotheses.length})</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendações ({pendingRecs.length})</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="settings">Definições</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          {loadingState ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !snapshot ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">Ainda sem diagnóstico estratégico.</p>
                <Button onClick={() => refreshStrategy.mutate()} disabled={refreshStrategy.isPending}>
                  {refreshStrategy.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Gerar Diagnóstico
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Strategic State */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Saúde Estratégica</p>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold">{snapshot.strategic_health_score ?? 50}</span>
                      <span className="text-muted-foreground text-sm">/100</span>
                    </div>
                    <Progress value={snapshot.strategic_health_score ?? 50} className="h-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Modo de Crescimento</p>
                    <Badge className={growthModeColors[snapshot.growth_mode] ?? "bg-muted"} variant="outline">
                      {growthModeLabels[snapshot.growth_mode] ?? snapshot.growth_mode}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{snapshot.strategic_focus || "—"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Gargalo Principal</p>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium">{snapshot.bottleneck_type?.replace(/_/g, " ") ?? "—"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{snapshot.primary_constraint || "—"}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Diagnosis */}
              {snapshot.diagnosis_summary && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm">{snapshot.diagnosis_summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Constraints & Leverage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" /> Restrições Principais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {((snapshot.top_constraints as string[]) ?? []).map((c: string, i: number) => (
                      <p key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />{c}
                      </p>
                    ))}
                    {((snapshot.top_constraints as string[]) ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground">Sem restrições identificadas</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" /> Alavancas de Crescimento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {((snapshot.top_leverage_points as string[]) ?? []).map((l: string, i: number) => (
                      <p key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />{l}
                      </p>
                    ))}
                    {((snapshot.top_leverage_points as string[]) ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground">Sem alavancas identificadas</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Executive Brief */}
              <StrategyExecutiveBrief snapshot={snapshot} recommendations={pendingRecs} />
            </>
          )}
        </TabsContent>

        {/* Hypotheses */}
        <TabsContent value="hypotheses" className="space-y-4">
          {hypotheses.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Sem hipóteses ativas. Gere um diagnóstico estratégico para obter hipóteses.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hypotheses.map((h: any) => (
                <Card key={h.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{h.title}</p>
                      <Badge variant="outline" className="text-xs shrink-0">{h.hypothesis_type?.replace(/_/g, " ")}</Badge>
                    </div>
                    {h.description && <p className="text-xs text-muted-foreground">{h.description}</p>}
                    {h.rationale && (
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-xs text-muted-foreground"><strong>Rationale:</strong> {h.rationale}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Impacto: {h.expected_impact || "—"}</span>
                      <span>Confiança: {Math.round((h.confidence ?? 0.5) * 100)}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Recommendations */}
        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Sem recomendações. Gere um diagnóstico estratégico.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recommendations.map((r: any) => (
                <Card key={r.id} className={r.status !== "pending" ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{r.title}</p>
                          <Badge variant="outline" className={`text-xs ${priorityColors[r.priority] ?? ""}`}>{r.priority}</Badge>
                          {r.status !== "pending" && <Badge variant="secondary" className="text-xs">{r.status}</Badge>}
                        </div>
                        {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                        {r.rationale && (
                          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mt-1">
                            <strong>Porquê:</strong> {r.rationale}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span>Impacto: {r.expected_impact || "—"}</span>
                          <span>Confiança: {Math.round((r.confidence ?? 0.5) * 100)}%</span>
                        </div>
                      </div>
                      {r.status === "pending" && (
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => actOnRec.mutate({ recommendationId: r.id, action: "accepted" })}
                            title="Aceitar"
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => actOnRec.mutate({ recommendationId: r.id, action: "acted" })}
                            title="Converter em Objetivo"
                          >
                            <ArrowRight className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => actOnRec.mutate({ recommendationId: r.id, action: "dismissed" })}
                            title="Dispensar"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-4">
          {history.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Sem histórico de snapshots estratégicos.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {history.map((h: any) => (
                <Card key={h.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{h.strategic_focus || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(h.created_at).toLocaleDateString("pt-PT")} · {growthModeLabels[h.growth_mode] ?? h.growth_mode}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{h.strategic_health_score ?? 50}</span>
                      <Badge variant="outline" className="text-xs">{Math.round((h.confidence ?? 0.5) * 100)}%</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" /> Definições de Estratégia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Estratégia ativada</p>
                  <p className="text-xs text-muted-foreground">Ativar camada de estratégia autónoma</p>
                </div>
                <Switch
                  checked={settings?.is_enabled ?? false}
                  onCheckedChange={(v) => upsertSettings.mutate({ is_enabled: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Atualização automática</p>
                  <p className="text-xs text-muted-foreground">Refrescar estratégia periodicamente</p>
                </div>
                <Switch
                  checked={settings?.auto_strategy_refresh ?? false}
                  onCheckedChange={(v) => upsertSettings.mutate({ auto_strategy_refresh: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Criar objetivos automaticamente</p>
                  <p className="text-xs text-muted-foreground">Converter recomendações high em objetivos</p>
                </div>
                <Switch
                  checked={settings?.allow_auto_objective_creation ?? false}
                  onCheckedChange={(v) => upsertSettings.mutate({ allow_auto_objective_creation: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </DashboardLayout>
  );
}
