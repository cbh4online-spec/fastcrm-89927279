import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight, Rocket, Sparkles, Target, MessageSquare, ShoppingBag } from "lucide-react";
import { useActivationGoals, useActivationProgress, useActivationScore, useOnboardingState } from "@/features/activation/useActivation";
import { CATEGORY_LABELS, type ActivationCategory } from "@/features/activation/types";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<ActivationCategory, typeof Sparkles> = {
  setup_base: Sparkles,
  primeiros_dados: Target,
  comunicacao_automacao: MessageSquare,
  comercio_checkout: ShoppingBag,
};

export default function OnboardingHubPage() {
  const navigate = useNavigate();
  const { data: goals = [] } = useActivationGoals();
  const { data: progress = [] } = useActivationProgress();
  const { data: score } = useActivationScore();
  const { state } = useOnboardingState();

  const completedSet = useMemo(() => new Set(progress.filter((p) => p.completed_at).map((p) => p.goal_key)), [progress]);
  const pct = score?.score ?? 0;
  const done = score?.goals_completed ?? 0;
  const total = score?.goals_total ?? goals.length;

  const goalsByCategory = useMemo(() => {
    const groups: Record<string, typeof goals> = {};
    for (const g of goals) {
      if (!groups[g.category]) groups[g.category] = [];
      groups[g.category].push(g);
    }
    return groups;
  }, [goals]);

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-8 border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <Badge variant="secondary" className="gap-1.5">
              <Rocket className="size-3" /> Centro de configuração
            </Badge>
            <h1 className="text-3xl font-bold">Vamos pôr o teu CRM a faturar</h1>
            <p className="text-muted-foreground max-w-xl">
              Completa as metas abaixo para desbloquear todo o potencial da plataforma.
              Equipas que completam 80%+ ativam 3x mais rápido.
            </p>
          </div>
          <div className="md:text-right space-y-2 min-w-[200px]">
            <p className="text-sm text-muted-foreground">Score de ativação</p>
            <div className="flex items-baseline gap-2 md:justify-end">
              <span className="text-5xl font-bold text-primary">{Math.round(pct)}</span>
              <span className="text-xl text-muted-foreground">/100</span>
            </div>
            <Progress value={pct} className="h-2" />
            <p className="text-xs text-muted-foreground">{done} de {total} metas concluídas</p>
          </div>
        </div>
      </div>

      {/* Categorias */}
      <div className="grid gap-6 md:grid-cols-2">
        {(Object.keys(goalsByCategory) as ActivationCategory[]).map((cat) => {
          const list = goalsByCategory[cat];
          const Icon = CATEGORY_ICONS[cat];
          const catDone = list.filter((g) => completedSet.has(g.goal_key)).length;
          const catPct = list.length ? (catDone / list.length) * 100 : 0;
          return (
            <Card key={cat}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-primary/10 grid place-items-center">
                      <Icon className="size-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{CATEGORY_LABELS[cat]}</CardTitle>
                      <CardDescription>{catDone}/{list.length} concluídas</CardDescription>
                    </div>
                  </div>
                  <Badge variant={catPct === 100 ? "default" : "outline"}>{Math.round(catPct)}%</Badge>
                </div>
                <Progress value={catPct} className="h-1.5 mt-2" />
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map((g) => {
                  const isDone = completedSet.has(g.goal_key);
                  return (
                    <button
                      key={g.id}
                      onClick={() => g.cta_route && navigate(g.cta_route)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-colors flex items-center gap-3",
                        "hover:bg-accent/50 hover:border-primary/40",
                        isDone && "bg-primary/5 border-primary/30"
                      )}
                    >
                      <div className={cn(
                        "size-6 rounded-full grid place-items-center shrink-0",
                        isDone ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/30"
                      )}>
                        {isDone && <Check className="size-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium", isDone && "line-through text-muted-foreground")}>
                          {g.title}
                        </p>
                        {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                      </div>
                      {!isDone && g.cta_route && (
                        <Button variant="ghost" size="sm" className="shrink-0">
                          {g.cta_label || "Abrir"} <ChevronRight className="size-3.5 ml-1" />
                        </Button>
                      )}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {state?.first_login_at && (
        <p className="text-center text-xs text-muted-foreground">
          Workspace criado há {Math.floor((Date.now() - new Date(state.first_login_at).getTime()) / 86400000)} dias
        </p>
      )}
    </div>
  );
}
