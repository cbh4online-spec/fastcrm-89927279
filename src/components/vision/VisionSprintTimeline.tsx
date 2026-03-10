import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle, Clock, Circle } from "lucide-react";
import { mockSprints } from "./mockData";

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  completed: { label: "Concluído", icon: CheckCircle, color: "text-green-500" },
  active: { label: "Em Curso", icon: Clock, color: "text-amber-500" },
  planned: { label: "Planeado", icon: Circle, color: "text-muted-foreground" },
};

export function VisionSprintTimeline() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Sprints Quinzenais</h2>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Novo Sprint</Button>
      </div>

      <div className="space-y-4">
        {mockSprints.map((sprint) => {
          const cfg = statusConfig[sprint.status] || statusConfig.planned;
          const Icon = cfg.icon;
          const progress = sprint.metrics.tasks_total > 0
            ? Math.round((sprint.metrics.tasks_done / sprint.metrics.tasks_total) * 100)
            : 0;

          return (
            <Card key={sprint.id} className={`border-border/50 ${sprint.status === "active" ? "ring-1 ring-amber-500/30" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${cfg.color}`} />
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{sprint.title}</h3>
                      <p className="text-xs text-muted-foreground">{sprint.goal}</p>
                    </div>
                  </div>
                  <Badge variant={sprint.status === "active" ? "default" : "outline"} className="text-xs">
                    {cfg.label}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Progress value={progress} className="h-1.5" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{sprint.start_date} → {sprint.end_date}</span>
                    <span>{sprint.metrics.tasks_done}/{sprint.metrics.tasks_total} tarefas</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
