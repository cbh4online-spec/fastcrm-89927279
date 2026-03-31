import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskKanbanView } from "@/components/tasks/TaskKanbanView";
import { TaskOverdueBanner } from "@/components/tasks/TaskOverdueBanner";
import { TaskTodayFocus } from "@/components/tasks/TaskTodayFocus";
import { TasksFilterSidebar, TaskFilters } from "@/components/tasks/TasksFilterSidebar";
import { TaskProductivityStats } from "@/components/tasks/TaskProductivityStats";
import { TaskQuickActions } from "@/components/tasks/TaskQuickActions";
import { TaskAISuggestions, AITaskSuggestion } from "@/components/tasks/TaskAISuggestions";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { useTasks, useCreateTask, useDeleteTask, useToggleTaskStatus, useUpdateTask, Task, TaskRelatedType } from "@/hooks/useTasks";
import { Plus, ListTodo, LayoutGrid, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { isToday, isPast, parseISO, isThisWeek, isThisMonth } from "date-fns";

type ViewMode = "list" | "kanban";

export default function TasksPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filters, setFilters] = useState<TaskFilters>({ status: "all", dateRange: "all", relatedType: "all" });
  const [initialTitle, setInitialTitle] = useState("");
  const [initialDueDays, setInitialDueDays] = useState(3);
  const [showAI, setShowAI] = useState(false);

  const { data: tasks = [], isLoading } = useTasks();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();
  const toggleStatus = useToggleTaskStatus();
  const updateTask = useUpdateTask();

  // Computed stats
  const pendingTasks = useMemo(() => tasks.filter((t) => t.status === "pending"), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.status === "done"), [tasks]);
  const overdueTasks = useMemo(() => pendingTasks.filter((t) => {
    if (!t.due_at) return false;
    const d = parseISO(t.due_at);
    return isPast(d) && !isToday(d);
  }), [pendingTasks]);
  const todayTasks = useMemo(() => pendingTasks.filter((t) => t.due_at && isToday(parseISO(t.due_at))), [pendingTasks]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.relatedType !== "all" && t.related_type !== filters.relatedType) return false;
      if (filters.dateRange !== "all" && t.due_at) {
        const d = parseISO(t.due_at);
        if (filters.dateRange === "overdue" && !(isPast(d) && !isToday(d))) return false;
        if (filters.dateRange === "today" && !isToday(d)) return false;
        if (filters.dateRange === "week" && !isThisWeek(d, { weekStartsOn: 1 })) return false;
        if (filters.dateRange === "month" && !isThisMonth(d)) return false;
      } else if (filters.dateRange !== "all" && !t.due_at) {
        return filters.dateRange !== "overdue"; // tasks without date are not overdue
      }
      return true;
    });
  }, [tasks, filters]);

  const handleCreate = async (task: { title: string; due_at?: string; related_type?: TaskRelatedType; related_id?: string }) => {
    try {
      await createTask.mutateAsync({ ...task });
      toast.success("Tarefa criada com sucesso");
    } catch { toast.error("Erro ao criar tarefa"); }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync(taskId);
      toast.success("Tarefa eliminada");
    } catch { toast.error("Erro ao eliminar tarefa"); }
  };

  const handleToggle = async (taskId: string, currentStatus: "pending" | "done") => {
    try {
      await toggleStatus.mutateAsync({ id: taskId, currentStatus });
    } catch { toast.error("Erro ao atualizar tarefa"); }
  };

  const handleEditSave = async (id: string, updates: { title?: string; due_at?: string | null; assigned_to?: string | null }) => {
    try {
      await updateTask.mutateAsync({ id, ...updates });
      toast.success("Tarefa atualizada");
    } catch { toast.error("Erro ao atualizar tarefa"); }
  };

  const handleQuickAction = (_action: string, title: string) => {
    setInitialTitle(title);
    setInitialDueDays(1);
    setCreateOpen(true);
  };

  const handleAISuggestion = (s: AITaskSuggestion) => {
    setInitialTitle(s.title);
    setInitialDueDays(s.dueDays);
    setCreateOpen(true);
  };

  const openCreate = () => {
    setInitialTitle("");
    setInitialDueDays(3);
    setCreateOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        {/* Overdue Banner */}
        <TaskOverdueBanner
          count={overdueTasks.length}
          onFocusOverdue={() => setFilters({ ...filters, dateRange: "overdue", status: "pending" })}
        />

        {/* Header */}
        <PageHeader
          title="Tarefas"
          count={pendingTasks.length}
          description="Hub de produtividade — gere, prioriza e executa"
          tabs={[
            { id: "list", label: "Lista", icon: <ListTodo className="w-4 h-4" /> },
            { id: "kanban", label: "Kanban", icon: <LayoutGrid className="w-4 h-4" /> },
            { id: "ai", label: "Sugestões IA", icon: <Sparkles className="w-4 h-4" /> },
          ]}
          activeTab={showAI ? "ai" : viewMode}
          onTabChange={(id) => {
            if (id === "ai") { setShowAI(true); } else {
              setShowAI(false);
              setViewMode(id as ViewMode);
            }
          }}
          actions={[
            { label: "Nova Tarefa", icon: <Plus className="h-4 w-4" />, onClick: openCreate },
          ]}
        />

        {/* Main layout */}
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block w-[260px] shrink-0 space-y-6">
            <TasksFilterSidebar filters={filters} onFiltersChange={setFilters} />

            <TaskProductivityStats
              totalTasks={tasks.length}
              completedTasks={completedTasks.length}
              overdueTasks={overdueTasks.length}
              todayTasks={todayTasks.length}
              completedToday={completedTasks.filter((t) => t.updated_at && isToday(parseISO(t.updated_at))).length}
              streak={0}
            />

            <TaskQuickActions entityName="Geral" onQuickAction={handleQuickAction} />
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Today Focus */}
            {!showAI && viewMode === "list" && (
              <TaskTodayFocus tasks={todayTasks} onToggleStatus={handleToggle} />
            )}

            {/* Views */}
            {showAI ? (
              <TaskAISuggestions
                entityType="lead"
                entityId=""
                entityName="Geral"
                onAddTask={handleAISuggestion}
              />
            ) : viewMode === "kanban" ? (
              <TaskKanbanView
                tasks={filteredTasks}
                onToggleStatus={handleToggle}
                onEdit={setEditTask}
              />
            ) : (
              <TaskList
                tasks={filteredTasks}
                isLoading={isLoading}
                onToggleStatus={handleToggle}
                onDelete={handleDelete}
                onEdit={setEditTask}
              />
            )}
          </div>
        </div>

        {/* Dialogs */}
        <CreateTaskDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreateTask={handleCreate}
          initialTitle={initialTitle}
          initialDueDays={initialDueDays}
          entityName="Geral"
        />

        <EditTaskDialog
          task={editTask}
          open={!!editTask}
          onOpenChange={(open) => { if (!open) setEditTask(null); }}
          onSave={handleEditSave}
          onDelete={handleDelete}
        />
      </div>
    </DashboardLayout>
  );
}
