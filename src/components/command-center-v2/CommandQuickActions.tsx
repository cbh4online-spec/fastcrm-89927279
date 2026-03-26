import { CommandAction } from "@/hooks/useCommandOrchestrator";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckSquare, Mail, Calendar, FileText, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCreateTask } from "@/hooks/useTasks";
import { addDays, format } from "date-fns";
import { useState } from "react";

interface CommandQuickActionsProps {
  actions: CommandAction[];
  entityId?: string;
  entityName?: string;
}

const actionIcons: Record<string, any> = {
  navigate: ArrowRight,
  create_task: CheckSquare,
  send_email: Mail,
  schedule_meeting: Calendar,
  generate_report: FileText,
};

export function CommandQuickActions({ actions, entityId, entityName }: CommandQuickActionsProps) {
  const navigate = useNavigate();
  const createTask = useCreateTask();
  const [loadingAction, setLoadingAction] = useState<number | null>(null);

  if (!actions || actions.length === 0) return null;

  const handleAction = async (action: CommandAction, index: number) => {
    switch (action.action_type) {
      case "navigate":
        if (action.target) navigate(action.target);
        break;

      case "generate_report": {
        const target = action.target || (entityId ? `/dashboard/proposals` : "/dashboard/proposals");
        toast.info("A abrir gerador de proposta…");
        navigate(target);
        break;
      }

      case "schedule_meeting": {
        setLoadingAction(index);
        try {
          const title = entityName
            ? `Review com Cliente — ${entityName}`
            : action.label || "Review com Cliente";
          const dueAt = format(addDays(new Date(), 1), "yyyy-MM-dd'T'09:00:00");

          await createTask.mutateAsync({
            title,
            related_type: entityId ? "opportunity" : undefined,
            related_id: entityId || undefined,
            due_at: dueAt,
            status: "pending",
          });

          toast.success("Reunião de review agendada", {
            description: title,
            action: {
              label: "Ver tarefas",
              onClick: () => navigate("/dashboard/tasks"),
            },
          });
        } catch {
          toast.error("Erro ao agendar reunião");
        } finally {
          setLoadingAction(null);
        }
        break;
      }

      case "create_task": {
        setLoadingAction(index);
        try {
          const title = action.label || "Nova tarefa";
          await createTask.mutateAsync({
            title,
            related_type: entityId ? "opportunity" : undefined,
            related_id: entityId || undefined,
            status: "pending",
          });

          toast.success("Tarefa criada", {
            description: title,
            action: {
              label: "Ver tarefas",
              onClick: () => navigate("/dashboard/tasks"),
            },
          });
        } catch {
          toast.error("Erro ao criar tarefa");
        } finally {
          setLoadingAction(null);
        }
        break;
      }

      case "send_email":
        navigate("/dashboard/inbox");
        break;
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações Sugeridas</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action, i) => {
          const Icon = actionIcons[action.action_type] || ArrowRight;
          const isLoading = loadingAction === i;
          return (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={() => handleAction(action, i)}
              disabled={isLoading}
              className="gap-2 text-xs"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
