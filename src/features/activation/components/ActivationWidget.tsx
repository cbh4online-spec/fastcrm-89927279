import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight, Rocket, X, Minimize2 } from "lucide-react";
import { useActivationGoals, useActivationProgress, useActivationScore, useOnboardingState, useMarkGoal } from "../useActivation";
import { CATEGORY_LABELS, type ActivationCategory } from "../types";
import { cn } from "@/lib/utils";

const HIDDEN_PATHS = ["/login", "/signup", "/auth", "/forgot-password", "/onboarding", "/", "/fastcrm", "/pricing", "/changelog"];

export function ActivationWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { data: goals = [] } = useActivationGoals();
  const { data: progress = [] } = useActivationProgress();
  const { data: score } = useActivationScore();
  const { state, update } = useOnboardingState();
  const mark = useMarkGoal();

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

  // Hide on public pages, when fully complete & dismissed, or wizard incomplete
  const shouldHide =
    HIDDEN_PATHS.some((p) => location.pathname === p || location.pathname.startsWith(p + "/")) ||
    state?.widget_dismissed ||
    pct >= 100 ||
    !state?.wizard_completed_at;

  if (shouldHide) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40 group",
          "flex items-center gap-3 pl-2 pr-4 py-2 rounded-full",
          "bg-primary text-primary-foreground shadow-2xl shadow-primary/30",
          "hover:scale-105 active:scale-95 transition-transform"
        )}
        aria-label="Abrir checklist de ativação"
      >
        <div className="relative size-10 grid place-items-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" fill="none" />
            <circle
              cx="20" cy="20" r="16"
              stroke="currentColor" strokeWidth="3" fill="none"
              strokeDasharray={`${(pct / 100) * 100.5} 100.5`}
              strokeLinecap="round"
            />
          </svg>
          <Rocket className="size-4" />
        </div>
        <div className="text-left">
          <p className="text-xs font-medium opacity-80 leading-none">Ativação</p>
          <p className="text-sm font-bold leading-tight">{Math.round(pct)}%</p>
        </div>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-6 border-b bg-gradient-to-br from-primary/10 to-transparent">
            <div className="flex items-start justify-between gap-2">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  <Rocket className="size-5 text-primary" />
                  Configura o teu workspace
                </SheetTitle>
                <SheetDescription>
                  {done} de {total} metas concluídas • Score {Math.round(pct)}%
                </SheetDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    update.mutate({ widget_dismissed: true });
                    setOpen(false);
                  }}
                  title="Esconder permanentemente"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
            <Progress value={pct} className="h-2 mt-3" />
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {(Object.keys(goalsByCategory) as ActivationCategory[]).map((cat) => {
              const list = goalsByCategory[cat];
              const catDone = list.filter((g) => completedSet.has(g.goal_key)).length;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">{CATEGORY_LABELS[cat]}</h4>
                    <Badge variant="secondary" className="text-xs">{catDone}/{list.length}</Badge>
                  </div>
                  <ul className="space-y-2">
                    {list.map((g) => {
                      const isDone = completedSet.has(g.goal_key);
                      return (
                        <li key={g.id}>
                          <button
                            onClick={() => {
                              if (g.cta_route) {
                                navigate(g.cta_route);
                                setOpen(false);
                              }
                            }}
                            className={cn(
                              "w-full text-left p-3 rounded-lg border transition-colors",
                              "hover:bg-accent/50 hover:border-primary/40",
                              isDone && "bg-primary/5 border-primary/30"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "size-5 rounded-full grid place-items-center mt-0.5 shrink-0",
                                isDone ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/30"
                              )}>
                                {isDone && <Check className="size-3" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-sm font-medium", isDone && "line-through text-muted-foreground")}>{g.title}</p>
                                {g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}
                              </div>
                              {!isDone && g.cta_route && <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-1" />}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="p-4 border-t bg-muted/20">
            <Button variant="outline" className="w-full" onClick={() => { navigate("/dashboard/onboarding"); setOpen(false); }}>
              Abrir centro de configuração
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
