import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, FileText, Zap, ListTodo, Target } from "lucide-react";
import { toast } from "sonner";
import { 
  useTasks, 
  useCreateTask, 
  useToggleTaskStatus, 
  useDeleteTask,
  Task,
  TaskRelatedType
} from "@/hooks/useTasks";
import { TaskAISuggestions, AITaskSuggestion } from "./TaskAISuggestions";
import { TaskTemplateSelector } from "./TaskTemplateSelector";
import { TaskQuickActions } from "./TaskQuickActions";
import { TaskProductivityStats } from "./TaskProductivityStats";
import { TaskList } from "./TaskList";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { TaskTemplate } from "@/types/taskTemplate";
import { isToday, isPast, parseISO } from "date-fns";

interface EntityTasksSectionProps {
  entityType: 'lead' | 'contact' | 'company' | 'opportunity';
  entityId: string;
  entityName: string;
}

export function EntityTasksSection({
  entityType,
  entityId,
  entityName
}: EntityTasksSectionProps) {
  const [activeTab, setActiveTab] = useState<string>('lista');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [initialTitle, setInitialTitle] = useState("");
  const [initialDueDays, setInitialDueDays] = useState(3);
  const [isAILoading, setIsAILoading] = useState(false);

  const { data: tasks = [], isLoading } = useTasks({ 
    related_type: entityType, 
    related_id: entityId 
  });
  const createTask = useCreateTask();
  const toggleStatus = useToggleTaskStatus();
  const deleteTask = useDeleteTask();

  // Calculate stats
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'done');
  const overdueTasks = pendingTasks.filter(t => {
    if (!t.due_at) return false;
    const date = parseISO(t.due_at);
    return isPast(date) && !isToday(date);
  });
  const todayTasks = pendingTasks.filter(t => {
    if (!t.due_at) return false;
    return isToday(parseISO(t.due_at));
  });

  const handleCreateTask = async (task: { title: string; due_at?: string }) => {
    try {
      await createTask.mutateAsync({
        related_type: entityType,
        related_id: entityId,
        title: task.title,
        due_at: task.due_at,
        status: 'pending'
      });
      toast.success("Tarefa criada com sucesso");
    } catch (error) {
      toast.error("Erro ao criar tarefa");
    }
  };

  const handleToggleStatus = async (taskId: string, currentStatus: 'pending' | 'done') => {
    try {
      await toggleStatus.mutateAsync({ id: taskId, currentStatus });
      toast.success(currentStatus === 'pending' ? "Tarefa concluída!" : "Tarefa reaberta");
    } catch (error) {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync(taskId);
      toast.success("Tarefa eliminada");
    } catch (error) {
      toast.error("Erro ao eliminar tarefa");
    }
  };

  const handleAddAISuggestion = (suggestion: AITaskSuggestion) => {
    setInitialTitle(suggestion.title);
    setInitialDueDays(suggestion.dueDays);
    setShowCreateDialog(true);
  };

  const handleSelectTemplate = (template: TaskTemplate, title: string) => {
    setInitialTitle(title);
    setInitialDueDays(template.defaultDueDays);
    setShowCreateDialog(true);
  };

  const handleQuickAction = (action: string, title: string) => {
    setInitialTitle(title);
    setInitialDueDays(action === 'call' || action === 'followup' ? 1 : 3);
    setShowCreateDialog(true);
  };

  const handleRefreshAI = () => {
    setIsAILoading(true);
    setTimeout(() => setIsAILoading(false), 1500);
  };

  const handleEditTask = (task: Task) => {
    setInitialTitle(task.title);
    setShowCreateDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            Gestão de Tarefas
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingTasks.length} tarefas pendentes
            {overdueTasks.length > 0 && (
              <span className="text-red-600 ml-1">• {overdueTasks.length} atrasadas</span>
            )}
          </p>
        </div>
        <Button onClick={() => {
          setInitialTitle("");
          setInitialDueDays(3);
          setShowCreateDialog(true);
        }} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="lista" className="gap-2">
            <ListTodo className="w-4 h-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Sugestões IA
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="rapidas" className="gap-2">
            <Zap className="w-4 h-4" />
            Ações Rápidas
          </TabsTrigger>
          <TabsTrigger value="produtividade" className="gap-2">
            <Target className="w-4 h-4" />
            Produtividade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-6">
          <TaskList
            tasks={tasks}
            isLoading={isLoading}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDeleteTask}
            onEdit={handleEditTask}
          />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <TaskAISuggestions
            entityType={entityType}
            entityId={entityId}
            entityName={entityName}
            onAddTask={handleAddAISuggestion}
            isLoading={isAILoading}
            onRefresh={handleRefreshAI}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TaskTemplateSelector
            entityName={entityName}
            onSelectTemplate={handleSelectTemplate}
          />
        </TabsContent>

        <TabsContent value="rapidas" className="mt-6">
          <TaskQuickActions
            entityName={entityName}
            onQuickAction={handleQuickAction}
          />
        </TabsContent>

        <TabsContent value="produtividade" className="mt-6">
          <TaskProductivityStats
            totalTasks={tasks.length}
            completedTasks={completedTasks.length}
            overdueTasks={overdueTasks.length}
            todayTasks={todayTasks.length}
            completedToday={0}
            streak={5}
          />
        </TabsContent>
      </Tabs>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateTask={handleCreateTask}
        initialTitle={initialTitle}
        initialDueDays={initialDueDays}
        entityName={entityName}
      />
    </div>
  );
}
