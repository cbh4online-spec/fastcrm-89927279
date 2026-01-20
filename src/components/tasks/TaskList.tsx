import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ListTodo, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  User,
  MoreVertical,
  Trash2,
  Edit
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { Task, TaskStatus } from "@/hooks/useTasks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  onToggleStatus: (taskId: string, currentStatus: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
}

function formatDueDate(dueAt: string | null): { label: string; isOverdue: boolean; isToday: boolean } {
  if (!dueAt) return { label: 'Sem prazo', isOverdue: false, isToday: false };
  
  const date = parseISO(dueAt);
  const overdue = isPast(date) && !isToday(date);
  
  if (isToday(date)) {
    return { label: 'Hoje', isOverdue: false, isToday: true };
  }
  if (isTomorrow(date)) {
    return { label: 'Amanhã', isOverdue: false, isToday: false };
  }
  
  return { 
    label: format(date, "d MMM", { locale: pt }), 
    isOverdue: overdue,
    isToday: false
  };
}

export function TaskList({
  tasks,
  isLoading,
  onToggleStatus,
  onDelete,
  onEdit
}: TaskListProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'done'>('pending');

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const overdueTasks = pendingTasks.filter(t => {
    if (!t.due_at) return false;
    const date = parseISO(t.due_at);
    return isPast(date) && !isToday(date);
  });

  const displayTasks = activeTab === 'pending' ? pendingTasks : doneTasks;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            Tarefas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <ListTodo className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Lista de Tarefas</CardTitle>
              <CardDescription>
                {pendingTasks.length} pendentes
                {overdueTasks.length > 0 && (
                  <span className="text-red-600 ml-1">
                    • {overdueTasks.length} atrasadas
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'done')}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="pending" className="flex-1 gap-2">
              <Clock className="w-4 h-4" />
              Pendentes ({pendingTasks.length})
            </TabsTrigger>
            <TabsTrigger value="done" className="flex-1 gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Concluídas ({doneTasks.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[350px]">
            {displayTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {activeTab === 'pending' ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">Tudo em dia!</p>
                    <p className="text-xs mt-1">Sem tarefas pendentes</p>
                  </>
                ) : (
                  <>
                    <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">Sem histórico</p>
                    <p className="text-xs mt-1">Tarefas concluídas aparecerão aqui</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2 pr-2">
                {displayTasks.map((task) => {
                  const { label: dueLabel, isOverdue, isToday: isDueToday } = formatDueDate(task.due_at);
                  
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "p-3 rounded-lg border bg-card transition-all hover:shadow-sm",
                        task.status === 'done' && "opacity-60",
                        isOverdue && "border-red-500/30 bg-red-500/5"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={task.status === 'done'}
                          onCheckedChange={() => onToggleStatus(task.id, task.status)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium",
                            task.status === 'done' && "line-through text-muted-foreground"
                          )}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs gap-1",
                                isOverdue && "text-red-600 border-red-500/30 bg-red-500/10",
                                isDueToday && "text-amber-600 border-amber-500/30 bg-amber-500/10",
                                !isOverdue && !isDueToday && "text-muted-foreground"
                              )}
                            >
                              {isOverdue && <AlertCircle className="w-3 h-3" />}
                              <Calendar className="w-3 h-3" />
                              {dueLabel}
                            </Badge>
                            {task.assigned_to && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <User className="w-3 h-3" />
                                Atribuída
                              </Badge>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(task)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onDelete(task.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
