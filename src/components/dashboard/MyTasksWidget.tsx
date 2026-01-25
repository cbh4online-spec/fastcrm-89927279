import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTasks } from "@/hooks/useTasks";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Calendar } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { ListSkeleton, EmptyState } from "@/components/design-system";

interface MyTasksWidgetProps {
  maxItems?: number;
  isLoading?: boolean;
}

const categoryColors: Record<string, string> = {
  marketing: "bg-purple-100 text-purple-700 border-purple-200",
  sales: "bg-emerald-100 text-emerald-700 border-emerald-200",
  general: "bg-blue-100 text-blue-700 border-blue-200",
  urgent: "bg-red-100 text-red-700 border-red-200",
};

export function MyTasksWidget({ maxItems = 5, isLoading = false }: MyTasksWidgetProps) {
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const navigate = useNavigate();

  const loading = isLoading || tasksLoading;

  // Filter pending/in-progress tasks sorted by due date
  const myTasks = tasks
    ?.filter((t: any) => t.status === "pending" || t.status === "in_progress")
    .slice()
    .sort((a: any, b: any) => {
      const dateA = a.due_at ? new Date(a.due_at).getTime() : Infinity;
      const dateB = b.due_at ? new Date(b.due_at).getTime() : Infinity;
      return dateA - dateB;
    })
    .slice(0, maxItems) || [];

  const getCategoryFromTitle = (title: string): string => {
    const lower = title.toLowerCase();
    if (lower.includes("marketing") || lower.includes("campanha") || lower.includes("email")) return "marketing";
    if (lower.includes("venda") || lower.includes("lead") || lower.includes("pipeline") || lower.includes("proposta")) return "sales";
    if (lower.includes("urgente") || lower.includes("crítico")) return "urgent";
    return "general";
  };

  if (loading) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Minhas Tarefas</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ListSkeleton count={4} />
        </CardContent>
      </Card>
    );
  }

  if (myTasks.length === 0) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Minhas Tarefas</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <EmptyState
            type="tasks"
            title="Sem tarefas pendentes"
            description="Novas tarefas aparecerão aqui"
            size="sm"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Minhas Tarefas</CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {myTasks.map((task: any) => {
          const category = getCategoryFromTitle(task.title);
          const categoryColor = categoryColors[category] || categoryColors.general;
          const isCompleted = task.status === "done";
          const dueDate = task.due_at ? new Date(task.due_at) : null;

          return (
            <div
              key={task.id}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => navigate("/dashboard/tasks")}
            >
              <Checkbox
                checked={isCompleted}
                className="mt-0.5 h-4 w-4 rounded-full"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {dueDate && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{format(dueDate, "d MMM", { locale: pt })}</span>
                    </div>
                  )}
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${categoryColor}`}>
                    {category === "marketing" && "Marketing"}
                    {category === "sales" && "Vendas"}
                    {category === "general" && "Geral"}
                    {category === "urgent" && "Urgente"}
                  </Badge>
                </div>
              </div>
              <div className="flex -space-x-1">
                <Avatar className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                    U1
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
