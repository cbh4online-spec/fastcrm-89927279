import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  Clock,
  Flame,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskProductivityStatsProps {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  todayTasks: number;
  completedToday: number;
  streak: number;
}

export function TaskProductivityStats({
  totalTasks,
  completedTasks,
  overdueTasks,
  todayTasks,
  completedToday,
  streak
}: TaskProductivityStatsProps) {
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const todayRate = todayTasks > 0 ? Math.round((completedToday / todayTasks) * 100) : 0;

  return (
    <Card className="bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Produtividade</CardTitle>
              <CardDescription>
                O teu desempenho em tarefas
              </CardDescription>
            </div>
          </div>
          {streak > 0 && (
            <Badge variant="outline" className="gap-1 bg-orange-500/10 text-orange-600 border-orange-500/30">
              <Flame className="w-3 h-3" />
              {streak} dias seguidos
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso de Hoje</span>
            <span className="font-medium">{completedToday}/{todayTasks}</span>
          </div>
          <Progress value={todayRate} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-card border">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground">Concluídas</span>
            </div>
            <p className="text-2xl font-bold">{completedTasks}</p>
            <p className="text-xs text-muted-foreground">{completionRate}% do total</p>
          </div>
          
          <div className="p-3 rounded-lg bg-card border">
            <div className="flex items-center gap-2 mb-1">
              <Clock className={cn(
                "w-4 h-4",
                overdueTasks > 0 ? "text-red-600" : "text-muted-foreground"
              )} />
              <span className="text-xs text-muted-foreground">Atrasadas</span>
            </div>
            <p className={cn(
              "text-2xl font-bold",
              overdueTasks > 0 && "text-red-600"
            )}>
              {overdueTasks}
            </p>
            <p className="text-xs text-muted-foreground">requerem atenção</p>
          </div>
        </div>

        {/* Achievement Banner */}
        {completionRate >= 80 && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-700">Excelente trabalho!</p>
                <p className="text-xs text-amber-600/80">
                  Mantém o ritmo - estás a {completionRate}% de conclusão
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Productivity Tip */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-primary mt-0.5" />
            <div>
              <p className="text-xs font-medium text-primary">Dica de Produtividade</p>
              <p className="text-xs text-muted-foreground mt-1">
                {overdueTasks > 0 
                  ? "Foca-te primeiro nas tarefas atrasadas para limpar a fila."
                  : todayTasks > completedToday
                  ? "Tens tarefas para hoje - prioriza as de alta importância."
                  : "Ótimo progresso! Considera rever tarefas futuras."}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
