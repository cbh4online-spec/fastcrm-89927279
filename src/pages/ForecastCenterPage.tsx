import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScenarioComparisonTable } from "@/components/forecast/ScenarioComparisonTable";
import {
  useBaselineForecast,
  useSimulationScenarios,
  useRunSimulation,
  useForecastSettings,
} from "@/hooks/useForecastSimulation";
import {
  TrendingUp,
  Target,
  Zap,
  AlertTriangle,
  Play,
  ChevronDown,
  BarChart3,
  Settings,
  Loader2,
  Brain,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";

const SCENARIO_TYPES = [
  { value: "follow_up_boost", label: "Reforçar Follow-up" },
  { value: "channel_switch", label: "Trocar Canal → WhatsApp" },
  { value: "sla_reduction", label: "Reduzir SLA Follow-up" },
  { value: "recovery_boost", label: "Reforçar Recovery" },
  { value: "agent_swap", label: "Trocar Agente/Equipa" },
  { value: "auto_execution", label: "Aumentar Auto-Execução" },
  { value: "backlog_reduction", label: "Reduzir Backlog" },
  { value: "meeting_boost", label: "Reforçar Reuniões" },
];

function getRiskConfig(risk: string) {
  switch (risk) {
    case "low": return { label: "Baixo", color: "bg-green-100 text-green-700", pct: 25 };
    case "medium": return { label: "Médio", color: "bg-yellow-100 text-yellow-700", pct: 50 };
    case "high": return { label: "Alto", color: "bg-orange-100 text-orange-700", pct: 75 };
    case "critical": return { label: "Crítico", color: "bg-red-100 text-red-700", pct: 95 };
    default: return { label: "—", color: "bg-muted text-muted-foreground", pct: 0 };
  }
}

export default function ForecastCenterPage() {
  const { data: baselineRun, isLoading: baselineLoading } = useBaselineForecast();
  const { data: scenarios, isLoading: scenariosLoading } = useSimulationScenarios();
  const runSimulation = useRunSimulation();
  const { data: settings, upsert: upsertSettings } = useForecastSettings();

  const [selectedType, setSelectedType] = useState("follow_up_boost");
  const [intensity, setIntensity] = useState([75]);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const baseline = baselineRun?.output_snapshot_json as Record<string, any> | null;
  const assumptions = (baselineRun?.assumptions_json as string[]) || [];
  const risk = getRiskConfig(baseline?.risk_of_miss_target || "");

  const handleRunBaseline = () => runSimulation.mutate({});
  const handleRunScenario = () =>
    runSimulation.mutate({ scenario_type: selectedType, inputs: { intensity: intensity[0] } });

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const comparedScenarios = (scenarios || []).filter((s: any) => compareIds.includes(s.id));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Forecast Center
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Projeções operacionais e simulação de cenários
            </p>
          </div>
          <Button onClick={handleRunBaseline} disabled={runSimulation.isPending} size="sm">
            {runSimulation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Atualizar Baseline
          </Button>
        </div>

        <Tabs defaultValue="forecast">
          <TabsList>
            <TabsTrigger value="forecast">
              <BarChart3 className="h-4 w-4 mr-1" />
              Forecast
            </TabsTrigger>
            <TabsTrigger value="simulate">
              <Zap className="h-4 w-4 mr-1" />
              Simular
            </TabsTrigger>
            <TabsTrigger value="compare">
              <Target className="h-4 w-4 mr-1" />
              Comparar
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-1" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* FORECAST TAB */}
          <TabsContent value="forecast" className="space-y-4">
            {baselineLoading ? (
              <Card><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
            ) : !baseline ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-3">Sem forecast calculado. Gere o baseline primeiro.</p>
                  <Button onClick={handleRunBaseline} disabled={runSimulation.isPending}>
                    {runSimulation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                    Gerar Baseline
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Receita 30d</span>
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-2xl font-bold">€{Number(baseline.forecast_revenue_30d).toLocaleString("pt-PT")}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Deals 30d</span>
                        <Target className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-2xl font-bold">{baseline.forecast_deals_30d}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Pipeline Coverage</span>
                        <BarChart3 className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-2xl font-bold">{baseline.pipeline_coverage}x</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Risco de Falhar Meta</span>
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      </div>
                      <Badge className={risk.color}>{risk.label}</Badge>
                      <Progress value={risk.pct} className="mt-2 h-1.5" />
                    </CardContent>
                  </Card>
                </div>

                {/* Extended metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <span className="text-xs text-muted-foreground">Receita 90d</span>
                      <p className="text-xl font-bold mt-1">€{Number(baseline.forecast_revenue_90d).toLocaleString("pt-PT")}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <span className="text-xs text-muted-foreground">Conversão Estimada</span>
                      <p className="text-xl font-bold mt-1">{Math.round(baseline.forecast_conversion_rate * 100)}%</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <span className="text-xs text-muted-foreground">Capacidade de Execução</span>
                      <p className="text-xl font-bold mt-1">{baseline.execution_capacity_score}/100</p>
                      <Progress value={baseline.execution_capacity_score} className="mt-2 h-1.5" />
                    </CardContent>
                  </Card>
                </div>

                {/* Assumptions */}
                <Collapsible>
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="flex flex-row items-center justify-between py-3">
                        <CardTitle className="text-sm">Pressupostos do Baseline</CardTitle>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <ul className="space-y-1">
                          {assumptions.map((a: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-0.5">•</span>{a}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </>
            )}
          </TabsContent>

          {/* SIMULATE TAB */}
          <TabsContent value="simulate" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Construtor de Cenário</CardTitle>
                <CardDescription>Selecione um tipo de cenário e ajuste a intensidade</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Cenário</Label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCENARIO_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Intensidade: {intensity[0]}%</Label>
                    <Slider value={intensity} onValueChange={setIntensity} min={10} max={100} step={5} />
                  </div>
                </div>
                <Button onClick={handleRunScenario} disabled={runSimulation.isPending} className="w-full md:w-auto">
                  {runSimulation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  Simular Cenário
                </Button>
              </CardContent>
            </Card>

            {/* Recent scenarios */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Cenários Recentes</h3>
              {scenariosLoading ? (
                <Card><CardContent className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>
              ) : (scenarios || []).length === 0 ? (
                <Card><CardContent className="text-center py-8 text-sm text-muted-foreground">Sem cenários simulados</CardContent></Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(scenarios || []).map((s: any) => {
                    const delta = s.delta_json || {};
                    const revDelta = delta.revenue_30d_delta || 0;
                    return (
                      <Card key={s.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => toggleCompare(s.id)}>
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{s.title}</span>
                            <Badge variant="outline" className="text-xs">{s.scenario_type}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className={`flex items-center gap-1 ${revDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {revDelta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              €{Math.abs(revDelta).toLocaleString("pt-PT")}
                            </span>
                            <span className="text-muted-foreground">Confiança: {Math.round((s.confidence || 0) * 100)}%</span>
                          </div>
                          {compareIds.includes(s.id) && (
                            <Badge variant="secondary" className="text-xs">Selecionado para comparação</Badge>
                          )}
                          <Collapsible>
                            <CollapsibleTrigger className="text-xs text-primary hover:underline flex items-center gap-1">
                              Pressupostos <ChevronDown className="h-3 w-3" />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <ul className="mt-1 space-y-0.5">
                                {(s.assumptions || []).map((a: string, i: number) => (
                                  <li key={i} className="text-xs text-muted-foreground">• {a}</li>
                                ))}
                              </ul>
                            </CollapsibleContent>
                          </Collapsible>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* COMPARE TAB */}
          <TabsContent value="compare" className="space-y-4">
            {comparedScenarios.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-sm text-muted-foreground">
                  <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                  Selecione cenários na tab "Simular" para comparar (clique nos cards).
                </CardContent>
              </Card>
            ) : (
              <ScenarioComparisonTable baseline={baseline} scenarios={comparedScenarios} />
            )}
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configurações de Forecast</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Forecast ativo</Label>
                  <Switch
                    checked={settings?.is_enabled ?? false}
                    onCheckedChange={(v) => upsertSettings.mutate({ is_enabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Permitir boost com memória</Label>
                  <Switch
                    checked={settings?.allow_memory_boost ?? true}
                    onCheckedChange={(v) => upsertSettings.mutate({ allow_memory_boost: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horizonte padrão (dias): {settings?.default_horizon_days ?? 30}</Label>
                  <Slider
                    value={[settings?.default_horizon_days ?? 30]}
                    onValueChange={([v]) => upsertSettings.mutate({ default_horizon_days: v })}
                    min={7} max={180} step={7}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Threshold de confiança: {Math.round((settings?.confidence_threshold ?? 0.3) * 100)}%</Label>
                  <Slider
                    value={[Math.round((settings?.confidence_threshold ?? 0.3) * 100)]}
                    onValueChange={([v]) => upsertSettings.mutate({ confidence_threshold: v / 100 })}
                    min={10} max={90} step={5}
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
