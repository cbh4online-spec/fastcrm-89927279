import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Target, CheckCircle2, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import type { StatsEvent } from "./statsHelpers";

interface Props {
  events: StatsEvent[];
  templateSlug: string;
}

interface Goal {
  id: string;
  name: string;
  goal_type: string;
  goal_config: any;
  target_value: number | null;
  enabled: boolean;
}

const GOAL_TYPE_LABELS: Record<string, string> = {
  form_submit: "Submissão de Formulário",
  cta_click: "Clique no CTA",
  page_visit: "Visita à Página",
  scroll_depth: "Profundidade de Scroll",
  time_on_site: "Tempo no Site",
};

const GOAL_TYPE_OPTIONS = Object.entries(GOAL_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export function StatsGoalsTab({ events, templateSlug }: Props) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState("form_submit");
  const [targetValue, setTargetValue] = useState("");

  const { data: goals = [] } = useQuery({
    queryKey: ["conversion_goals", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversion_goals")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Goal[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("conversion_goals")
        .insert({
          workspace_id: currentWorkspace!.id,
          name,
          goal_type: goalType,
          goal_config: {},
          target_value: targetValue ? parseInt(targetValue) : null,
          enabled: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversion_goals"] });
      toast.success("Objetivo criado");
      setDialogOpen(false);
      setName("");
      setGoalType("form_submit");
      setTargetValue("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("conversion_goals")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversion_goals"] });
      toast.success("Objetivo eliminado");
    },
  });

  const goalResults = useMemo(() => {
    return goals.filter(g => g.enabled).map(goal => {
      let completions = 0;
      const total = events.filter(e => e.event_type === "view").length;

      switch (goal.goal_type) {
        case "form_submit":
          completions = events.filter(e => e.event_type === "form_submit").length;
          break;
        case "cta_click":
          completions = events.filter(e => e.event_type === "cta_click" || e.event_type === "element_click").length;
          break;
        case "page_visit":
          completions = events.filter(e => e.event_type === "view").length;
          break;
        case "scroll_depth":
          completions = events.filter(e =>
            e.event_type === "section_view" && e.page_section === "cta-form"
          ).length;
          break;
        case "time_on_site":
          completions = events.filter(e =>
            e.event_type === "section_exit" && (e.time_on_section_ms || 0) > 60000
          ).length;
          break;
        default:
          completions = 0;
      }

      const rate = total > 0 ? (completions / total) * 100 : 0;
      const achieved = goal.target_value ? completions >= goal.target_value : false;
      const progress = goal.target_value ? Math.min(100, (completions / goal.target_value) * 100) : 0;

      return { ...goal, completions, total, rate, achieved, progress };
    });
  }, [goals, events]);

  const totalAchieved = goalResults.filter(g => g.achieved).length;
  const avgRate = goalResults.length > 0
    ? goalResults.reduce((s, g) => s + g.rate, 0) / goalResults.length
    : 0;

  return (
    <div className="space-y-4">
      {/* Header with summary and create button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {goalResults.length > 0 && (
            <>
              <Badge variant="outline" className="text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {totalAchieved}/{goalResults.length} atingidos
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Taxa média: {avgRate.toFixed(1)}%
              </Badge>
            </>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Novo Objetivo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Objetivo de Conversão</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label>Nome do objetivo</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Leads captados" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={goalType} onValueChange={setGoalType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Meta (opcional)</Label>
                <Input
                  type="number"
                  value={targetValue}
                  onChange={e => setTargetValue(e.target.value)}
                  placeholder="Ex: 100"
                />
                <p className="text-[10px] text-muted-foreground">Número de conversões pretendido no período</p>
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!name || createMutation.isPending}
                className="w-full"
              >
                Criar Objetivo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Goals list */}
      {goalResults.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <Target className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm mb-3">
              Sem objetivos configurados. Define objetivos para medir o sucesso.
            </p>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Criar Primeiro Objetivo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {goalResults.map(goal => (
            <Card key={goal.id} className={`border-border/50 ${goal.achieved ? "ring-1 ring-emerald-500/30" : ""}`}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {goal.achieved ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate block">{goal.name}</span>
                      <Badge variant="outline" className="text-[9px] mt-0.5">
                        {GOAL_TYPE_LABELS[goal.goal_type] || goal.goal_type}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteMutation.mutate(goal.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {goal.completions} conversões
                      {goal.target_value ? ` / ${goal.target_value}` : ""}
                    </span>
                    <span className="font-medium flex items-center gap-1">
                      {goal.rate > 5 ? (
                        <TrendingUp className="h-3 w-3 text-emerald-400" />
                      ) : goal.rate < 1 ? (
                        <TrendingDown className="h-3 w-3 text-red-400" />
                      ) : null}
                      {goal.rate.toFixed(1)}%
                    </span>
                  </div>
                  {goal.target_value && (
                    <Progress value={goal.progress} className="h-2" />
                  )}
                </div>

                {goal.achieved && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] mt-2">
                    ✓ Objetivo atingido
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
