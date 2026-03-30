import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Play, CheckCircle, AlertTriangle, Shield, Target, Activity, Settings, Loader2 } from 'lucide-react';
import {
  useWorkspaceState, useWorkspaceMissions, useWorkspaceAlerts,
  useWorkspaceEngineSettings, useRecalculateWorkspace,
  useExecuteMission, useResolveMission, useResolveAlert,
} from '@/hooks/useWorkspaceEngine';
import { WorkspaceExecutiveBrief } from '@/components/workspace-ops/WorkspaceExecutiveBrief';

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const SEVERITY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  critical: 'destructive',
};

const SUB_SCORES = [
  { key: 'revenue_health', label: 'Receita', icon: Target },
  { key: 'pipeline_health', label: 'Pipeline', icon: Activity },
  { key: 'execution_health', label: 'Execução', icon: Play },
  { key: 'response_health', label: 'Resposta', icon: RefreshCw },
  { key: 'context_health', label: 'Contexto', icon: Shield },
  { key: 'automation_health', label: 'Automação', icon: Settings },
];

export default function WorkspaceOpsPage() {
  const { data: state, isLoading: stateLoading } = useWorkspaceState();
  const { data: missions = [] } = useWorkspaceMissions(['pending', 'active']);
  const { data: alerts = [] } = useWorkspaceAlerts();
  const { data: settings, upsert: upsertSettings } = useWorkspaceEngineSettings();
  const recalculate = useRecalculateWorkspace();
  const executeMission = useExecuteMission();
  const resolveMission = useResolveMission();
  const resolveAlert = useResolveAlert();
  const [tab, setTab] = useState('overview');

  const healthScore = state?.health_score ?? 50;
  const riskLevel = state?.risk_level ?? 'medium';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Workspace Operations</h1>
            <p className="text-muted-foreground text-sm">Governação operacional centralizada</p>
          </div>
          <Button onClick={() => recalculate.mutate()} disabled={recalculate.isPending} size="sm">
            {recalculate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Recalcular
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="missions">Missões ({missions.length})</TabsTrigger>
            <TabsTrigger value="alerts">Alertas ({alerts.length})</TabsTrigger>
            <TabsTrigger value="settings">Definições</TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Health Score */}
              <Card>
                <CardContent className="pt-6 flex flex-col items-center gap-3">
                  <div className="relative flex items-center justify-center w-28 h-28">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-muted" />
                      <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8"
                        strokeDasharray={`${healthScore * 2.64} 264`}
                        className={healthScore >= 70 ? 'stroke-green-500' : healthScore >= 50 ? 'stroke-yellow-500' : 'stroke-destructive'}
                        strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-2xl font-bold">{healthScore}</span>
                  </div>
                  <Badge className={RISK_COLORS[riskLevel]}>{riskLevel.toUpperCase()}</Badge>
                  {state?.primary_focus && <p className="text-xs text-muted-foreground text-center">Foco: {state.primary_focus}</p>}
                </CardContent>
              </Card>

              {/* Sub-scores */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Saúde por Área</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {SUB_SCORES.map(({ key, label, icon: Icon }) => {
                    const val = state?.[key] ?? 50;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm w-24 shrink-0">{label}</span>
                        <Progress value={val} className="flex-1 h-2" />
                        <span className="text-sm font-mono w-8 text-right">{val}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{state?.active_missions_count ?? 0}</p>
                <p className="text-xs text-muted-foreground">Missões Ativas</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{state?.blockers_count ?? 0}</p>
                <p className="text-xs text-muted-foreground">Blockers</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{alerts.length}</p>
                <p className="text-xs text-muted-foreground">Alertas Abertos</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{missions.filter((m: any) => m.status === 'pending').length}</p>
                <p className="text-xs text-muted-foreground">Missões Pendentes</p>
              </CardContent></Card>
            </div>

            {/* Executive Brief */}
            <WorkspaceExecutiveBrief state={state} missions={missions} alerts={alerts} />
          </TabsContent>

          {/* ── Missions ── */}
          <TabsContent value="missions" className="space-y-4">
            {missions.length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Sem missões ativas.</CardContent></Card>
            )}
            {missions.map((m: any) => (
              <Card key={m.id}>
                <CardContent className="pt-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{m.title}</h3>
                      <Badge variant="outline">{m.mission_type}</Badge>
                      <Badge variant={SEVERITY_VARIANT[m.urgency] || 'outline'}>{m.urgency}</Badge>
                    </div>
                    {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>Prioridade: {m.priority}</span>
                      {m.impact_estimate && <span>Impacto: {Number(m.impact_estimate).toLocaleString('pt-PT')}€</span>}
                      <span>Estado: {m.status}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {m.status === 'pending' && (
                      <Button size="sm" onClick={() => executeMission.mutate(m.id)} disabled={executeMission.isPending}>
                        <Play className="h-3 w-3 mr-1" /> Executar
                      </Button>
                    )}
                    {(m.status === 'pending' || m.status === 'active') && (
                      <Button size="sm" variant="outline" onClick={() => resolveMission.mutate(m.id)} disabled={resolveMission.isPending}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Concluir
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Alerts ── */}
          <TabsContent value="alerts" className="space-y-4">
            {alerts.length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Sem alertas abertos.</CardContent></Card>
            )}
            {alerts.map((a: any) => (
              <Card key={a.id}>
                <CardContent className="pt-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-4 w-4 ${a.severity === 'critical' ? 'text-destructive' : 'text-orange-500'}`} />
                      <h3 className="font-medium">{a.title}</h3>
                      <Badge variant={SEVERITY_VARIANT[a.severity] || 'outline'}>{a.severity}</Badge>
                      <Badge variant="outline">{a.alert_type}</Badge>
                    </div>
                    {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => resolveAlert.mutate(a.id)} disabled={resolveAlert.isPending}>
                    <CheckCircle className="h-3 w-3 mr-1" /> Resolver
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Settings ── */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configuração do Motor</CardTitle>
                <CardDescription>Controlar comportamento automático do workspace engine.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'is_enabled', label: 'Motor Ativo' },
                  { key: 'auto_mission_generation', label: 'Geração Automática de Missões' },
                  { key: 'auto_escalation_enabled', label: 'Escalação Automática' },
                  { key: 'auto_brief_enabled', label: 'Briefing Executivo Automático' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <Switch
                      checked={settings?.[key] ?? false}
                      onCheckedChange={(v) => upsertSettings.mutate({ [key]: v })}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
