import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Phone,
  Mail,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { format, isToday, isPast, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Task {
  id: string;
  title: string;
  type: "follow_up" | "call" | "email" | "meeting" | "other";
  dueDate: Date;
  entityName?: string;
  entityType?: "lead" | "opportunity" | "contact";
  completed: boolean;
}

interface DashboardNextActionsProps {
  tasks: Task[];
  overdueCount: number;
  isLoading: boolean;
  onCompleteTask?: (taskId: string) => void;
}

const typeIcons: Record<Task["type"], React.ElementType> = {
  follow_up: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Clock,
  other: CheckCircle2,
};

const typeLabels: Record<Task["type"], string> = {
  follow_up: "Follow-up",
  call: "Chamada",
  email: "Email",
  meeting: "Reunião",
  other: "Tarefa",
};

function TaskItem({ 
  task, 
  onComplete 
}: { 
  task: Task; 
  onComplete?: () => void;
}) {
  const Icon = typeIcons[task.type];
  const isOverdue = isPast(task.dueDate) && !task.completed;
  const isDueToday = isToday(task.dueDate);
  
  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border transition-all",
      isOverdue && "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
      isDueToday && !isOverdue && "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
      !isOverdue && !isDueToday && "border-border bg-card"
    )}>
      <Checkbox 
        checked={task.completed}
        onCheckedChange={() => onComplete?.()}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{task.title}</span>
        </div>
        {task.entityName && (
          <p className="text-xs text-muted-foreground truncate">
            {task.entityName}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] px-1.5 py-0",
              isOverdue && "border-red-300 text-red-600 bg-red-100 dark:bg-red-900/30",
              isDueToday && !isOverdue && "border-amber-300 text-amber-600 bg-amber-100 dark:bg-amber-900/30"
            )}
          >
            {isOverdue ? (
              <>
                <AlertCircle className="h-2.5 w-2.5 mr-1" />
                Atrasado
              </>
            ) : isDueToday ? (
              "Hoje"
            ) : (
              formatDistanceToNow(task.dueDate, { addSuffix: true, locale: pt })
            )}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {typeLabels[task.type]}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DashboardNextActions({ 
  tasks, 
  overdueCount, 
  isLoading,
  onCompleteTask 
}: DashboardNextActionsProps) {
  const navigate = useNavigate();
  
  // Show only the most important tasks (max 5)
  const displayTasks = tasks.slice(0, 5);
  const hasMore = tasks.length > 5;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Próximas Ações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              Próximas Ações
              {overdueCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              Tarefas mais importantes para hoje
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {displayTasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Tudo em dia!</p>
            <p className="text-xs mt-1">Não há tarefas pendentes.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={() => onCompleteTask?.(task.id)}
              />
            ))}
            
            {hasMore && (
              <Button 
                variant="ghost" 
                className="w-full mt-2 text-xs"
                onClick={() => navigate("/dashboard/crm")}
              >
                Ver todas as tarefas ({tasks.length})
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { Task };
