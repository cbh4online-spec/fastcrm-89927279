import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { TaskList } from "@/components/tasks/TaskList";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { useTasks, useCreateTask, useDeleteTask, useToggleTaskStatus } from "@/hooks/useTasks";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function TasksPage() {
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get("selected");

  const [createOpen, setCreateOpen] = useState(false);

  const { data: tasks = [], isLoading } = useTasks();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();
  const toggleStatus = useToggleTaskStatus();

  const pendingCount = tasks.filter((t) => t.status === "pending").length;

  const handleCreate = async (task: { title: string; due_at?: string; assigned_to?: string }) => {
    try {
      await createTask.mutateAsync({ ...task });
      toast.success("Tarefa criada com sucesso");
    } catch {
      toast.error("Erro ao criar tarefa");
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync(taskId);
      toast.success("Tarefa eliminada");
    } catch {
      toast.error("Erro ao eliminar tarefa");
    }
  };

  const handleToggle = async (taskId: string, currentStatus: "pending" | "done") => {
    try {
      await toggleStatus.mutateAsync({ id: taskId, currentStatus });
    } catch {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <PageHeader
          title="Minhas Tarefas"
          count={pendingCount}
          actions={[
            {
              label: "Nova Tarefa",
              icon: <Plus className="h-4 w-4" />,
              onClick: () => setCreateOpen(true),
            },
          ]}
        />

        <TaskList
          tasks={tasks}
          isLoading={isLoading}
          onToggleStatus={handleToggle}
          onDelete={handleDelete}
          onEdit={() => {}}
        />

        <CreateTaskDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreateTask={handleCreate}
          entityName="Geral"
        />
      </div>
    </DashboardLayout>
  );
}
