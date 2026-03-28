import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Calendar, Clock, ArrowRight, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, TaskStatus } from "@/hooks/useTasks";
import { isToday, isPast, parseISO, isThisWeek, addWeeks, isWithinInterval, startOfWeek, endOfWeek } from "date-fns";

interface TaskKanbanViewProps {
  tasks: Task[];
  onToggleStatus: (taskId: string, currentStatus: TaskStatus) => void;
  onEdit: (task: Task) => void;
}

interface KanbanColumn {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  tasks: Task[];
}

export function TaskKanbanView({ tasks, onToggleStatus, onEdit }: TaskKanbanViewProps) {
  const columns = useMemo<KanbanColumn[]>(() => {
    const pending = tasks.filter((t) => t.status === "pending");
    const now = new Date();
    const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
    const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });

    const overdue: Task[] = [];
    const today: Task[] = [];
    const thisWeek: Task[] = [];
    const nextWeek: Task[] = [];
    const future: Task[] = [];
    const noDate: Task[] = [];

    pending.forEach((t) => {
      if (!t.due_at) { noDate.push(t); return; }
      const d = parseISO(t.due_at);
      if (isPast(d) && !isToday(d)) overdue.push(t);
      else if (isToday(d)) today.push(t);
      else if (isThisWeek(d, { weekStartsOn: 1 })) thisWeek.push(t);
      else if (isWithinInterval(d, { start: nextWeekStart, end: nextWeekEnd })) nextWeek.push(t);
      else future.push(t);
    });

    return [
      { id: "overdue", title: "Atrasadas", icon: <AlertCircle className="w-4 h-4" />, color: "text-red-600", bgColor: "bg-red-500/10 border-red-500/30", tasks: overdue },
      { id: "today", title: "Hoje", icon: <Clock className="w-4 h-4" />, color: "text-amber-600", bgColor: "bg-amber-500/10 border-amber-500/30", tasks: today },
      { id: "week", title: "Esta Semana", icon: <Calendar className="w-4 h-4" />, color: "text-blue-600", bgColor: "bg-blue-500/10 border-blue-500/30", tasks: thisWeek },
      { id: "next", title: "Próx. Semana", icon: <ArrowRight className="w-4 h-4" />, color: "text-purple-600", bgColor: "bg-purple-500/10 border-purple-500/30", tasks: nextWeek },
      { id: "future", title: "Futuro", icon: <Calendar className="w-4 h-4" />, color: "text-muted-foreground", bgColor: "bg-muted/50 border-border", tasks: future },
      { id: "nodate", title: "Sem Data", icon: <HelpCircle className="w-4 h-4" />, color: "text-muted-foreground", bgColor: "bg-muted/30 border-border/50", tasks: noDate },
    ];
  }, [tasks]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {columns.map((col) => (
        <div key={col.id} className={cn("rounded-lg border p-3 min-h-[200px]", col.bgColor)}>
          <div className={cn("flex items-center gap-2 mb-3 font-semibold text-sm", col.color)}>
            {col.icon}
            <span>{col.title}</span>
            <Badge variant="outline" className={cn("text-xs ml-auto", col.color)}>
              {col.tasks.length}
            </Badge>
          </div>
          <ScrollArea className="h-[350px]">
            <div className="space-y-2 pr-1">
              {col.tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onEdit(task)}
                  className="p-2.5 rounded-md bg-card border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={false}
                      onCheckedChange={(e) => { e && onToggleStatus(task.id, task.status); }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5"
                    />
                    <span className="text-xs font-medium leading-tight">{task.title}</span>
                  </div>
                </div>
              ))}
              {col.tasks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6 opacity-60">Nenhuma tarefa</p>
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
