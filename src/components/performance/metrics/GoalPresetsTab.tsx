import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePerformanceGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, PerformanceGoal } from "@/hooks/usePerformanceGoals";
import { useAllGoalsProgress, GOAL_PRESETS, GoalStatus } from "@/hooks/useGoalProgress";
import { Target, Plus, Trash2, Pencil, TrendingUp, Users, FileText, Handshake, Calendar, BarChart3, Clock, ArrowUpRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = { TrendingUp, Users, FileText, Handshake, Calendar, BarChart3 };

const STATUS_CONFIG: Record<GoalStatus, { label: string; color: string; icon: React.ElementType }> = {
  on_track: { label: "No Ritmo", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  at_risk: { label: "Em Risco", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: AlertTriangle },
  behind: { label: "Atrasado", color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
  exceeded: { label: "Superado", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: ArrowUpRight },
  not_started: { label: "Não Iniciado", color: "bg-muted text-muted-foreground border-border", icon: Clock },
  completed: { label: "Concluído", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
};

const SCOPE_TYPES = [
  { value: "company", label: "Empresa" },
  { value: "team", label: "Equipa" },
  { value: "individual", label: "Individual" },
];

const PERIOD_TYPES = [
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
];

function formatValue(value: number, goalType: string) {
  const preset = GOAL_PRESETS.find(p => p.value === goalType);
  if (preset?.unit === "€") return `€${value.toLocaleString("pt-PT")}`;
  return value.toLocaleString("pt-PT");
}

const DEFAULT_FORM = {
  goal_name: "", goal_type: "", target_value: 0, period_type: "monthly",
  period_start: new Date().toISOString().split("T")[0], period_end: "", scope_type: "company",
};

export function GoalPresetsTab() {
  const { data: goals, isLoading } = usePerformanceGoals();
  const { data: progressMap } = useAllGoalsProgress(goals);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const [showDialog, setShowDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PerformanceGoal | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const openCreate = () => { setEditingGoal(null); setForm(DEFAULT_FORM); setShowDialog(true); };
  const openEdit = (goal: PerformanceGoal) => {
    setEditingGoal(goal);
    setForm({ goal_name: goal.goal_name, goal_type: goal.goal_type, target_value: goal.target_value, period_type: goal.period_type, period_start: goal.period_start, period_end: goal.period_end, scope_type: goal.scope_type });
    setShowDialog(true);
  };

  const selectPreset = (presetValue: string) => {
    const preset = GOAL_PRESETS.find(p => p.value === presetValue);
    if (preset) setForm(f => ({ ...f, goal_type: preset.value, goal_name: f.goal_name || preset.label }));
  };

  const handleSubmit = async () => {
    if (!form.goal_name || !form.period_end || !form.goal_type) { toast.error("Preenche todos os campos obrigatórios"); return; }
    try {
      if (editingGoal) { await updateGoal.mutateAsync({ id: editingGoal.id, ...form } as any); toast.success("Meta atualizada!"); }
      else { await createGoal.mutateAsync(form as any); toast.success("Meta criada!"); }
      setShowDialog(false);
    } catch { toast.error("Erro ao guardar meta"); }
  };

  const handleDelete = async (id: string) => { await deleteGoal.mutateAsync(id); toast.success("Meta removida"); };
  const isSaving = createGoal.isPending || updateGoal.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Novo Objetivo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingGoal ? "Editar Objetivo" : "Criar Objetivo"}</DialogTitle></DialogHeader>
            <div className="space-y-5">
              <div>
                <Label className="mb-2 block">Tipo de Objetivo</Label>
                <div className="grid grid-cols-3 gap-2">
                  {GOAL_PRESETS.map(preset => {
                    const Icon = ICON_MAP[preset.icon] || Target;
                    const selected = form.goal_type === preset.value;
                    return (
                      <button key={preset.value} type="button" onClick={() => selectPreset(preset.value)}
                        className={cn("flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-sm",
                          selected ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                        )}>
                        <Icon className="h-5 w-5" />
                        <span className="text-xs leading-tight text-center">{preset.label}</span>
                        <span className="text-[10px] opacity-60">{preset.unit}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div><Label>Nome</Label><Input value={form.goal_name} onChange={e => setForm(f => ({ ...f, goal_name: e.target.value }))} placeholder="ex: Receita Mensal Q1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Âmbito</Label>
                  <Select value={form.scope_type} onValueChange={v => setForm(f => ({ ...f, scope_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SCOPE_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Período</Label>
                  <Select value={form.period_type} onValueChange={v => setForm(f => ({ ...f, period_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PERIOD_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Valor Alvo {form.goal_type && `(${GOAL_PRESETS.find(p => p.value === form.goal_type)?.unit || ""})`}</Label>
                <Input type="number" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: Number(e.target.value) }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Início</Label><Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} /></div>
                <div><Label>Fim</Label><Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} /></div>
              </div>
              <Button onClick={handleSubmit} disabled={isSaving} className="w-full">
                {editingGoal ? "Guardar Alterações" : "Criar Objetivo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!goals?.length && !isLoading ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Target className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum objetivo definido</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Cria o primeiro objetivo ligado aos teus dados reais</p>
            <Button variant="outline" className="mt-4" onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Criar Objetivo</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals?.map(g => {
            const progress = progressMap?.[g.id];
            const preset = GOAL_PRESETS.find(p => p.value === g.goal_type);
            const Icon = preset ? (ICON_MAP[preset.icon] || Target) : Target;
            const statusCfg = progress ? STATUS_CONFIG[progress.status] : STATUS_CONFIG.not_started;
            const StatusIcon = statusCfg.icon;
            return (
              <Card key={g.id} className="group relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-4.5 w-4.5 text-primary" /></div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold truncate">{g.goal_name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{preset?.label || g.goal_type}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(g)}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(g.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className={cn("text-[10px] border", statusCfg.color)}><StatusIcon className="h-3 w-3 mr-1" />{statusCfg.label}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{SCOPE_TYPES.find(s => s.value === g.scope_type)?.label}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{PERIOD_TYPES.find(p => p.value === g.period_type)?.label}</Badge>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground text-xs">Progresso</span>
                      <span className="font-bold text-xs">{formatValue(progress?.currentValue || 0, g.goal_type)} / {formatValue(g.target_value, g.goal_type)}</span>
                    </div>
                    <Progress value={Math.min(progress?.percentage || 0, 100)} className="h-2" />
                    <p className="text-right text-[10px] text-muted-foreground mt-0.5">{progress?.percentage || 0}%</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground text-[10px] flex items-center gap-1"><Clock className="h-3 w-3" /> Tempo</span>
                      <span className="text-[10px] text-muted-foreground">{progress?.daysElapsed || 0}d / {progress?.daysTotal || 0}d</span>
                    </div>
                    <Progress value={progress?.timePercentage || 0} className="h-1.5" />
                  </div>
                  {progress && progress.daysElapsed > 0 && progress.status !== "exceeded" && progress.status !== "completed" && (
                    <p className="text-[10px] text-muted-foreground italic">Projeção: {formatValue(progress.projectedValue, g.goal_type)} no final do período</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">{g.period_start} — {g.period_end}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
