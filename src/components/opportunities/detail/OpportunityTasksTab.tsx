import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, ListTodo, X } from "lucide-react";
import { useTasks, useCreateTask, useToggleTaskStatus, type Task } from "@/hooks/useTasks";
import { formatDate, formatRelativeTime } from "@/lib/formatters";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OpportunityTasksTabProps {
  opportunityId: string;
}

export function OpportunityTasksTab({ opportunityId }: OpportunityTasksTabProps) {
  const { t } = useTranslation("crm");
  const { data: tasks = [], isLoading } = useTasks({ related_type: "opportunity", related_id: opportunityId });
  const createTask = useCreateTask();
  const toggleTask = useToggleTaskStatus();

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      await createTask.mutateAsync({
        related_type: "opportunity",
        related_id: opportunityId,
        title: title.trim(),
        due_at: dueDate || undefined,
      });
      setTitle("");
      setDueDate("");
      setIsAdding(false);
      toast.success(t("oppDetail_taskCreated"));
    } catch {
      toast.error(t("errorUpdatingOpportunity"));
    }
  };

  const handleToggle = async (task: Task) => {
    await toggleTask.mutateAsync({ id: task.id, currentStatus: task.status });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
    if (e.key === "Escape") { setIsAdding(false); setTitle(""); }
  };

  const pendingTasks = tasks.filter(t => t.status === "pending");
  const doneTasks = tasks.filter(t => t.status === "done");

  const renderTask = (task: Task) => (
    <div key={task.id} className="flex items-start gap-3 py-2.5 px-1 group">
      <Checkbox
        checked={task.status === "done"}
        onCheckedChange={() => handleToggle(task)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", task.status === "done" && "line-through text-muted-foreground")}>{task.title}</p>
        {task.due_at && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {formatDate(task.due_at, "dd MMM yyyy")}
          </p>
        )}
      </div>
      {task.status === "pending" && task.due_at && new Date(task.due_at) < new Date() && (
        <Badge variant="destructive" className="text-[10px] h-5">
          {t("oppDetail_overdue")}
        </Badge>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {!isAdding && (
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsAdding(true)}>
          <Plus className="w-3.5 h-3.5" />
          {t("oppDetail_addTask")}
        </Button>
      )}

      {isAdding && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t("oppDetail_taskTitlePlaceholder")}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-40"
              />
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setTitle(""); }}>
                <X className="w-3.5 h-3.5 mr-1" /> {t("cancel")}
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={!title.trim() || createTask.isPending}>
                <Plus className="w-3.5 h-3.5 mr-1" /> {createTask.isPending ? "..." : t("oppDetail_createTask")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tasks.length === 0 && !isAdding ? (
        <div className="text-center py-12 text-muted-foreground">
          <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("oppDetail_noTasks")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pendingTasks.length > 0 && (
            <div className="divide-y divide-border/50">
              {pendingTasks.map(renderTask)}
            </div>
          )}
          {doneTasks.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {t("oppDetail_completedTasks")} ({doneTasks.length})
              </p>
              <div className="divide-y divide-border/50 opacity-60">
                {doneTasks.map(renderTask)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
