import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Shield, Activity, Link2, RefreshCw, AlertTriangle, Target,
  Zap, Bot, CheckCircle2, XCircle, ChevronDown, Settings,
  TrendingUp, Eye, GitBranch
} from "lucide-react";
import {
  useControlTowerState,
  useControlTowerSettings,
  useRefreshControlTower,
  useControlTowerInterventions,
  type Intervention,
} from "@/hooks/useControlTower";
import { useKernelEvents } from "@/hooks/useKernelEvents";
import { useLedgerChains, useLedgerStats } from "@/hooks/useLedger";
import { Skeleton } from "@/components/ui/skeleton";

/* ─── Status helpers ─── */
const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  stable:   { label: "Estável",  color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: <CheckCircle2 className="h-4 w-4" /> },
  watch:    { label: "Vigiar",   color: "bg-amber-500/15 text-amber-600 border-amber-500/30",       icon: <Eye className="h-4 w-4" /> },
  risk:     { label: "Risco",    color: "bg-orange-500/15 text-orange-600 border-orange-500/30",     icon: <AlertTriangle className="h-4 w-4" /> },
  critical: { label: "Crítico",  color: "bg-destructive/15 text-destructive border-destructive/30",  icon: <XCircle className="h-4 w-4" /> },
};

const urgencyColor: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  low: "bg-muted text-muted-foreground",
};

function RiskGauge({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const color = value >= 70 ? "text-destructive" : value >= 40 ? "text-amber-500" : "text-emerald-500";
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`${color}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
        </div>
        <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${value >= 70 ? "bg-destructive" : value >= 40 ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function InterventionCard({ item }: { item: Intervention }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card/50">
      <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{item.title}</span>
          <Badge variant="outline" className={`text-[10px] ${urgencyColor[item.urgency] ?? urgencyColor.low}`}>
            {item.urgency}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{item.rationale}</p>
        <p className="text-xs text-primary/70">Impacto: {item.impact_estimate}</p>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function ControlTowerPage() {
  const { data: state, isLoading } = useControlTowerState();
  const { data: settings, upsert } = useControlTowerSettings();
  const refresh = useRefreshControlTower();
  const interventions = useControlTowerInterventions();
  const { data: events } = useKernelEvents(20);
  const { data: chains } = useLedgerChains();
  const { data: ledgerStats } = useLedgerStats();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const status = state?.overall_status ?? "stable";
  const sc = statusConfig[status] ?? statusConfig.stable;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Control Tower</h1>
              <p className="text-sm text-muted-foreground">Cockpit unificado de comando e supervisão</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`gap-1.5 ${sc.color}`}>
              {sc.icon} {sc.label}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${refresh.isPending ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* ─── Focus ─── */}
        {state?.focus_priority && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Target className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-medium">{state.focus_priority}</span>
            </CardContent>
          </Card>
        )}

        {/* ─── Tabs ─── */}
        <Tabs defaultValue="executive" className="space-y-4">
          <TabsList>
            <TabsTrigger value="executive" className="gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Executivo
            </TabsTrigger>
            <TabsTrigger value="operations" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Operações
            </TabsTrigger>
            <TabsTrigger value="causality" className="gap-1.5">
              <GitBranch className="h-3.5 w-3.5" /> Causalidade
            </TabsTrigger>
          </TabsList>

          {/* ─── EXECUTIVE ─── */}
          <TabsContent value="executive" className="space-y-4">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <RiskGauge label="Risco Receita" value={state?.revenue_risk ?? 0} icon={<TrendingUp className="h-4 w-4" />} />
                  <RiskGauge label="Risco Execução" value={state?.execution_risk ?? 0} icon={<Zap className="h-4 w-4" />} />
                  <RiskGauge label="Risco Contexto" value={state?.context_risk ?? 0} icon={<Eye className="h-4 w-4" />} />
                  <RiskGauge label="Risco Forecast" value={state?.forecast_risk ?? 0} icon={<Target className="h-4 w-4" />} />
                </div>

                <div className="grid md:grid-cols-4 gap-3">
                  <Card className="border-border/50">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{state?.open_critical_items ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Itens Críticos</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/50">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{state?.active_missions ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Missões Ativas</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/50">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{state?.active_agents ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Agentes Ativos</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/50">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{state?.overdue_tasks ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Tarefas Atrasadas</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Interventions */}
                {interventions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Intervenções Recomendadas ({interventions.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {interventions.map((item, i) => (
                        <InterventionCard key={i} item={item} />
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* ─── OPERATIONS ─── */}
          <TabsContent value="operations" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <Bot className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{state?.active_agents ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Agentes em Execução</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <Zap className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                  <p className="text-2xl font-bold">{state?.overdue_tasks ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Ações Falhadas</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <Target className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                  <p className="text-2xl font-bold">{state?.active_missions ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Missões Ativas</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent events */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Eventos Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!events || events.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sem eventos recentes</p>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {events.slice(0, 15).map((evt: any) => (
                      <div key={evt.id} className="flex items-center gap-2 text-xs p-2 rounded hover:bg-muted/50">
                        <span className="text-muted-foreground w-28 shrink-0">
                          {new Date(evt.created_at).toLocaleString("pt-PT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                        </span>
                        <Badge variant="outline" className="text-[10px]">{evt.type}</Badge>
                        <span className="truncate text-muted-foreground">{evt.entity_kind}/{evt.entity_id?.slice(0, 8)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── CAUSALITY ─── */}
          <TabsContent value="causality" className="space-y-4">
            <div className="grid md:grid-cols-4 gap-3">
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{ledgerStats?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Total Chains</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-500">{ledgerStats?.completed ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Concluídas</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">{ledgerStats?.failed ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Falhadas</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">€{(ledgerStats?.totalRevenue ?? 0).toLocaleString("pt-PT")}</p>
                  <p className="text-xs text-muted-foreground">Receita Atribuída</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="h-4 w-4" /> Chains Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!chains || chains.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sem chains registadas</p>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {chains.slice(0, 15).map((ch: any) => (
                      <div key={ch.id} className="flex items-center gap-2 text-xs p-2 rounded hover:bg-muted/50">
                        <Badge variant="outline" className="text-[10px]">{ch.chain_type}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${
                          ch.status === "completed" ? "text-emerald-600" :
                          ch.status === "failed" ? "text-destructive" : ""
                        }`}>{ch.status}</Badge>
                        <span className="truncate flex-1">{ch.title ?? ch.correlation_id?.slice(0, 16)}</span>
                        {ch.outcome_value ? (
                          <span className="text-emerald-600 font-medium">€{Number(ch.outcome_value).toLocaleString("pt-PT")}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ─── Settings ─── */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <Settings className="h-4 w-4" />
              Definições
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Control Tower ativa</Label>
                  <Switch
                    checked={settings?.is_enabled ?? false}
                    onCheckedChange={(v) => upsert.mutate({ is_enabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Fila de intervenções</Label>
                  <Switch
                    checked={settings?.enable_intervention_queue ?? true}
                    onCheckedChange={(v) => upsert.mutate({ enable_intervention_queue: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Mostrar executivo primeiro</Label>
                  <Switch
                    checked={settings?.show_executive_first ?? true}
                    onCheckedChange={(v) => upsert.mutate({ show_executive_first: v })}
                  />
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </DashboardLayout>
  );
}
