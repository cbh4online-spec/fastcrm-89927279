import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Calendar, Zap, Trophy, TrendingUp } from "lucide-react";
import { useVisionSprints, useVisionWins, useVisionBriefings, type VisionProfile } from "@/hooks/useVision";

interface Props {
  vision: VisionProfile;
}

export function VisionCorePanel({ vision }: Props) {
  const { data: sprints = [] } = useVisionSprints(vision.id);
  const { data: wins = [] } = useVisionWins(vision.id);
  const { data: briefings = [] } = useVisionBriefings(vision.id);

  const activeSprint = sprints.find(s => s.status === "active");
  const metrics = (activeSprint?.metrics as any) || { tasks_done: 0, tasks_total: 0, leads_generated: 0 };
  const sprintProgress = metrics.tasks_total > 0 ? Math.round((metrics.tasks_done / metrics.tasks_total) * 100) : 0;
  const todayBriefing = briefings[0];
  const focusItems = (todayBriefing?.focus_items as string[]) || [];
  const blockers = (todayBriefing?.blockers as string[]) || [];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-violet-500/10 to-purple-600/10 border-violet-500/20">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="border-violet-500/50 text-violet-400">Visão Ativa</Badge>
              <h2 className="text-xl font-bold text-foreground">{vision.title}</h2>
              {vision.objective && <p className="text-sm text-muted-foreground max-w-lg">{vision.objective}</p>}
            </div>
            {vision.target_date && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Data-alvo</p>
                <p className="text-sm font-semibold text-foreground">{new Date(vision.target_date).toLocaleDateString("pt-PT")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sprint Atual</p>
              <p className="text-sm font-semibold text-foreground">{activeSprint?.title?.split("—")[0] || "Nenhum"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vitórias</p>
              <p className="text-sm font-semibold text-foreground">{wins.length} registadas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Energia Hoje</p>
              <p className="text-sm font-semibold text-foreground">{todayBriefing?.energy_level ?? "—"}/10</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Progresso Sprint</p>
              <p className="text-sm font-semibold text-foreground">{sprintProgress}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeSprint && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />{activeSprint.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{activeSprint.goal}</p>
              <Progress value={sprintProgress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{metrics.tasks_done}/{metrics.tasks_total} tarefas</span>
                <span>{metrics.leads_generated} leads gerados</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-500" />Foco de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {focusItems.length > 0 ? (
              <ul className="space-y-2">
                {focusItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum briefing registado hoje.</p>
            )}
            {blockers.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-destructive font-medium mb-1">Bloqueios:</p>
                {blockers.map((b, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {b}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
