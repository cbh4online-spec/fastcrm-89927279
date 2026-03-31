import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Calendar, Users, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface CycleStats {
  total: number;
  selfDone: number;
  managerDone: number;
  completed: number;
}

interface ReviewCycle {
  id: string;
  name: string;
  year: number;
  cycle_type: string;
  status: string;
  self_review_deadline: string | null;
  manager_review_deadline: string | null;
  calibration_deadline: string | null;
  final_deadline: string | null;
}

interface Props {
  cycle: ReviewCycle;
  stats: CycleStats | undefined;
  isLoading?: boolean;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  active: { label: "Ativo", variant: "default" },
  completed: { label: "Concluído", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export function ReviewCycleManager({ cycle, stats, isLoading }: Props) {
  const selfPct = stats ? (stats.total > 0 ? Math.round((stats.selfDone / stats.total) * 100) : 0) : 0;
  const managerPct = stats ? (stats.total > 0 ? Math.round((stats.managerDone / stats.total) * 100) : 0) : 0;
  const completedPct = stats ? (stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0) : 0;

  const statusInfo = STATUS_MAP[cycle.status] || STATUS_MAP.draft;

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return format(new Date(d), "dd MMM yyyy", { locale: pt });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{cycle.name}</CardTitle>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Deadlines */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">Auto-avaliação</p>
              <p className="font-medium">{formatDate(cycle.self_review_deadline)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">Manager</p>
              <p className="font-medium">{formatDate(cycle.manager_review_deadline)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">Calibração</p>
              <p className="font-medium">{formatDate(cycle.calibration_deadline)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">Final</p>
              <p className="font-medium">{formatDate(cycle.final_deadline)}</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        {stats && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                Auto-avaliações
              </span>
              <span className="text-muted-foreground">{stats.selfDone}/{stats.total} ({selfPct}%)</span>
            </div>
            <Progress value={selfPct} className="h-2" />

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
                Avaliações Manager
              </span>
              <span className="text-muted-foreground">{stats.managerDone}/{stats.total} ({managerPct}%)</span>
            </div>
            <Progress value={managerPct} className="h-2" />

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Concluídas
              </span>
              <span className="text-muted-foreground">{stats.completed}/{stats.total} ({completedPct}%)</span>
            </div>
            <Progress value={completedPct} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
