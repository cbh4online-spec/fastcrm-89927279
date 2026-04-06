import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, CheckCircle2, TrendingUp } from "lucide-react";
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

export function StatsGoalsTab({ events, templateSlug }: Props) {
  const { currentWorkspace } = useWorkspace();

  const { data: goals = [] } = useQuery({
    queryKey: ["conversion_goals", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("conversion_goals")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("enabled", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Goal[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const goalResults = useMemo(() => {
    return goals.map(goal => {
      let completions = 0;
      const total = events.filter(e => e.event_type === "view").length;

      switch (goal.goal_type) {
        case "form_submit":
          completions = events.filter(e => e.event_type === "form_submit").length;
          break;
        case "cta_click":
          completions = events.filter(e => e.event_type === "cta_click").length;
          break;
        case "page_visit":
          completions = events.filter(e => e.event_type === "view").length;
          break;
        case "scroll_depth": {
          const targetPct = goal.goal_config?.pct || 75;
          completions = events.filter(e =>
            e.event_type === "section_view" &&
            e.page_section === "cta-form" // reached bottom
          ).length;
          break;
        }
        default:
          completions = 0;
      }

      const rate = total > 0 ? (completions / total) * 100 : 0;
      const achieved = goal.target_value ? completions >= goal.target_value : false;

      return { ...goal, completions, total, rate, achieved };
    });
  }, [goals, events]);

  if (goals.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <Target className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground text-sm">
            Sem objetivos configurados. Define objetivos de conversão nas definições do funil.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {goalResults.map(goal => (
        <Card key={goal.id} className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {goal.achieved ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Target className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{goal.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {GOAL_TYPE_LABELS[goal.goal_type] || goal.goal_type}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{goal.completions}</span>
                {goal.target_value && (
                  <span className="text-xs text-muted-foreground">/ {goal.target_value}</span>
                )}
              </div>
            </div>
            {goal.target_value && (
              <Progress
                value={Math.min(100, (goal.completions / goal.target_value) * 100)}
                className="h-2"
              />
            )}
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>Taxa: {goal.rate.toFixed(1)}%</span>
              {goal.achieved && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                  ✓ Objetivo atingido
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
