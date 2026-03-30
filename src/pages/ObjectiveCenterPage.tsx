import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  useBusinessObjectives,
  useCreateObjective,
  useObjectiveStats,
  useGeneratePlan,
  useRecalculateProgress,
  useObjectiveSettings,
  OBJECTIVE_TYPES,
  type BusinessObjective,
} from "@/hooks/useBusinessObjectives";
import { ObjectiveDetail } from "@/components/objectives/ObjectiveDetail";
import {
  Target,
  Plus,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
  Zap,
  Settings,
  Loader2,
  Eye,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Target }> = {
  draft: { label: "Rascunho", variant: "secondary", icon: Target },
  active: { label: "Ativo", variant: "default", icon: Zap },
  on_track: { label: "No Caminho", variant: "default", icon: TrendingUp },
  at_risk: { label: "Em Risco", variant: "destructive", icon: AlertTriangle },
  completed: { label: "Concluído", variant: "outline", icon: CheckCircle2 },
  paused: { label: "Pausado", variant: "secondary", icon: Target },
  cancelled: { label: "Cancelado", variant: "secondary", icon: Target },
};

function ObjectiveCard({ obj, onViewDetail, onGeneratePlan }: {
  obj: BusinessObjective;
  onViewDetail: () => void;
  onGeneratePlan: () => void;
}) {
  const progress = obj.target_value
    ? Math.min(100, Math.round(((Number(obj.current_value) || 0) / Number(obj.target_value)) * 100))
    : 0;
  const statusCfg = STATUS_CONFIG[obj.status] || STATUS_CONFIG.draft;
  const typeLabel = OBJECTIVE_TYPES.find(t => t.value === obj.objective_type)?.label || obj.objective_type;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <h3 className="font-medium text-sm truncate">{obj.title}</h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant={statusCfg.variant} className="text-xs">{statusCfg.label}</Badge>
              <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold">{progress}%</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Number(obj.current_value || 0).toLocaleString()} {obj.unit}</span>
            <span>{Number(obj.target_value || 0).toLocaleString()} {obj.unit}</span>
          </div>
        </div>

        {(obj.period_start || obj.period_end) && (
          <p className="text-xs text-muted-foreground">
            {obj.period_start && new Date(obj.period_start).toLocaleDateString("pt-PT")}
            {obj.period_start && obj.period_end && " → "}
            {obj.period_end && new Date(obj.period_end).toLocaleDateString("pt-PT")}
          </p>
        )}

        <div className="flex gap-1.5 pt-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onViewDetail}>
            <Eye className="h-3 w-3 mr-1" /> Detalhe
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onGeneratePlan}>
            <Zap className="h-3 w-3 mr-1" /> Plano
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ObjectiveCenterPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    objective_type: "recover_revenue",
    target_value: "",
    unit: "€",
    period_start: "",
    period_end: "",
    priority: "medium",
  });

  const { data: objectives = [], isLoading } = useBusinessObjectives(
    tab === "all" ? undefined : tab
  );
  const stats = useObjectiveStats();
  const createObj = useCreateObjective();
  const generatePlan = useGeneratePlan();
  const recalculate = useRecalculateProgress();
  const { settings, upsertSettings } = useObjectiveSettings();

  const handleCreate = () => {
    if (!form.title || !form.target_value) return;
    createObj.mutate({
      title: form.title,
      objective_type: form.objective_type,
      target_value: Number(form.target_value),
      unit: form.unit,
      period_start: form.period_start || undefined,
      period_end: form.period_end || undefined,
      priority: form.priority,
    }, {
      onSuccess: () => {
        setCreateOpen(false);
        setForm({ title: "", objective_type: "recover_revenue", target_value: "", unit: "€", period_start: "", period_end: "", priority: "medium" });
      },
    });
  };

  const kpis = stats.data || { active: 0, atRisk: 0, completed: 0, totalTarget: 0, totalCurrent: 0 };
  const execRate = kpis.totalTarget > 0 ? Math.round((kpis.totalCurrent / kpis.totalTarget) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Centro de Objetivos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Business Autopilot — defina metas, gere planos, execute e meça progresso
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => recalculate.mutate(undefined)} disabled={recalculate.isPending}>
            {recalculate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Recalcular
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(!settingsOpen)}>
            <Settings className="h-4 w-4 mr-1" /> Definições
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Novo Objetivo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Objetivo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Recuperar 5.000€ em carrinhos" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={form.objective_type} onValueChange={v => setForm(f => ({ ...f, objective_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OBJECTIVE_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="critical">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Meta</Label>
                    <Input type="number" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))} placeholder="5000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidade</Label>
                    <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="€" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim</Label>
                    <Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={createObj.isPending || !form.title || !form.target_value}>
                  {createObj.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Criar Objetivo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ativos</p>
            <p className="text-2xl font-bold">{kpis.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-destructive" /> Em Risco</p>
            <p className="text-2xl font-bold text-destructive">{kpis.atRisk}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> Concluídos</p>
            <p className="text-2xl font-bold">{kpis.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Taxa Execução</p>
            <p className="text-2xl font-bold">{execRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings Panel */}
      {settingsOpen && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Definições de Objetivos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Objetivos ativados</Label>
              <Switch checked={settings?.is_enabled ?? false} onCheckedChange={v => upsertSettings.mutate({ is_enabled: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto-planeamento</Label>
              <Switch checked={settings?.auto_plan_enabled ?? false} onCheckedChange={v => upsertSettings.mutate({ auto_plan_enabled: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto-replaneamento</Label>
              <Switch checked={settings?.auto_replan_enabled ?? false} onCheckedChange={v => upsertSettings.mutate({ auto_replan_enabled: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto-execução</Label>
              <Switch checked={settings?.auto_execute_enabled ?? false} onCheckedChange={v => upsertSettings.mutate({ auto_execute_enabled: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Alertar quando em risco</Label>
              <Switch checked={settings?.alert_when_at_risk ?? true} onCheckedChange={v => upsertSettings.mutate({ alert_when_at_risk: v })} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Objectives List */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="active">Ativos</TabsTrigger>
          <TabsTrigger value="at_risk">Em Risco</TabsTrigger>
          <TabsTrigger value="on_track">No Caminho</TabsTrigger>
          <TabsTrigger value="completed">Concluídos</TabsTrigger>
          <TabsTrigger value="draft">Rascunhos</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : objectives.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum objetivo encontrado</p>
                <Button size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Criar Primeiro Objetivo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {objectives.map(obj => (
                <ObjectiveCard
                  key={obj.id}
                  obj={obj}
                  onViewDetail={() => { setSelectedId(obj.id); setDetailOpen(true); }}
                  onGeneratePlan={() => generatePlan.mutate(obj.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <ObjectiveDetail
        objectiveId={selectedId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
