import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePerformanceGoals, useCreateGoal, useDeleteGoal } from "@/hooks/usePerformanceGoals";
import { Target, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

export default function PerformanceGoalsPage() {
  const { data: goals, isLoading } = usePerformanceGoals();
  const createGoal = useCreateGoal();
  const deleteGoal = useDeleteGoal();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    goal_name: "",
    goal_type: "company",
    target_value: 0,
    period_type: "monthly",
    period_start: new Date().toISOString().split("T")[0],
    period_end: "",
    scope_type: "company",
  });

  const handleCreate = async () => {
    if (!form.goal_name || !form.period_end) {
      toast.error("Preenche nome e data fim");
      return;
    }
    await createGoal.mutateAsync(form as any);
    toast.success("Meta criada!");
    setShowCreate(false);
  };

  const handleDelete = async (id: string) => {
    await deleteGoal.mutateAsync(id);
    toast.success("Meta removida");
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader title="Metas de Performance" description="Define objetivos por empresa, equipa ou individual" />
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nova Meta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Meta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={form.goal_name} onChange={e => setForm(f => ({ ...f, goal_name: e.target.value }))} placeholder="ex: Receita Mensal Q1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Scope</Label>
                    <Select value={form.scope_type} onValueChange={v => setForm(f => ({ ...f, scope_type: v, goal_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SCOPE_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Período</Label>
                    <Select value={form.period_type} onValueChange={v => setForm(f => ({ ...f, period_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PERIOD_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Valor Alvo</Label>
                  <Input type="number" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: Number(e.target.value) }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Início</Label>
                    <Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Fim</Label>
                    <Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={createGoal.isPending} className="w-full">Criar Meta</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals?.map(g => (
            <Card key={g.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{g.goal_name}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(g.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">{SCOPE_TYPES.find(s => s.value === g.scope_type)?.label || g.scope_type}</Badge>
                  <Badge variant="secondary" className="text-xs">{PERIOD_TYPES.find(p => p.value === g.period_type)?.label || g.period_type}</Badge>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-bold">0 / {g.target_value}</span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground">{g.period_start} — {g.period_end}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {!goals?.length && !isLoading && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma meta definida. Cria a primeira!</CardContent></Card>
        )}
      </div>
    </DashboardLayout>
  );
}
