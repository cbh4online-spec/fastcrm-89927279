import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Flame, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, TaskStatus } from "@/hooks/useTasks";

interface TaskTodayFocusProps {
  tasks: Task[];
  onToggleStatus: (taskId: string, currentStatus: TaskStatus) => void;
}

export function TaskTodayFocus({ tasks, onToggleStatus }: TaskTodayFocusProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-amber-500/10">
          <Sun className="w-4 h-4 text-amber-600" />
        </div>
        <h3 className="font-semibold text-sm">Foco de Hoje</h3>
        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-500/30">
          {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"}
        </Badge>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 p-3 rounded-lg border bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 transition-colors"
          >
            <Checkbox
              checked={task.status === "done"}
              onCheckedChange={() => onToggleStatus(task.id, task.status)}
            />
            <span className={cn("text-sm font-medium flex-1", task.status === "done" && "line-through text-muted-foreground")}>
              {task.title}
            </span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
        ))}
      </div>
    </div>
  );
}
