import { CommandAction } from "@/hooks/useCommandOrchestrator";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, CheckSquare, Mail, Calendar, FileText, Loader2,
  RefreshCw, Search, Download, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCreateTask } from "@/hooks/useTasks";
import { addDays, format } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CommandQuickActionsProps {
  actions: CommandAction[];
  entityId?: string;
  entityName?: string;
  onExecuteCommand?: (command: string) => void;
}

const actionIcons: Record<string, any> = {
  navigate: ArrowRight,
  create_task: CheckSquare,
  send_email: Mail,
  schedule_meeting: Calendar,
  generate_report: FileText,
  create_followup: RefreshCw,
  analyze_deeper: Search,
  export_pdf: Download,
};

const actionStyles: Record<string, string> = {
  create_task: "border-emerald-500/20 hover:bg-emerald-500/5",
  schedule_meeting: "border-blue-500/20 hover:bg-blue-500/5",
  generate_report: "border-violet-500/20 hover:bg-violet-500/5",
  send_email: "border-amber-500/20 hover:bg-amber-500/5",
  create_followup: "border-primary/20 hover:bg-primary/5",
};

export function CommandQuickActions({ actions, entityId, entityName, onExecuteCommand }: CommandQuickActionsProps) {
  const navigate = useNavigate();
  const createTask = useCreateTask();
  const [loadingAction, setLoadingAction] = useState<number | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<number>>(new Set());

  if (!actions || actions.length === 0) return null;

  const markCompleted = (index: number) => {
    setCompletedActions((prev) => new Set(prev).add(index));
  };

  const handleAction = async (action: CommandAction, index: number) => {
    switch (action.action_type) {
      case "navigate":
        if (action.target) navigate(action.target);
        break;

      case "generate_report": {
        const target = action.target || "/dashboard/proposals";
        toast.info("A abrir gerador de proposta…");
        navigate(target);
        break;
      }

      case "export_pdf": {
        const target = action.target || "/dashboard/proposals";
        toast.info("A abrir exportação…");
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

          markCompleted(index);
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

          markCompleted(index);
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

      case "create_followup": {
        setLoadingAction(index);
        try {
          const title = entityName
            ? `Follow-up — ${entityName}`
            : action.label || "Follow-up";
          const dueAt = format(addDays(new Date(), 3), "yyyy-MM-dd'T'09:00:00");

          await createTask.mutateAsync({
            title,
            related_type: entityId ? "opportunity" : undefined,
            related_id: entityId || undefined,
            due_at: dueAt,
            status: "pending",
          });

          markCompleted(index);
          toast.success("Follow-up agendado para 3 dias", {
            description: title,
            action: {
              label: "Ver tarefas",
              onClick: () => navigate("/dashboard/tasks"),
            },
          });
        } catch {
          toast.error("Erro ao criar follow-up");
        } finally {
          setLoadingAction(null);
        }
        break;
      }

      case "analyze_deeper": {
        if (onExecuteCommand) {
          const cmd = entityName
            ? `Aprofunda a análise de ${entityName}`
            : "Aprofunda a análise anterior";
          onExecuteCommand(cmd);
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
      <div className="flex items-center gap-1.5">
        <Zap className="h-3 w-3 text-primary" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações Rápidas</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((action, i) => {
          const Icon = actionIcons[action.action_type] || ArrowRight;
          const isActionLoading = loadingAction === i;
          const isCompleted = completedActions.has(i);
          const style = actionStyles[action.action_type] || "";
          return (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={() => handleAction(action, i)}
              disabled={isActionLoading || isCompleted}
              className={cn(
                "gap-2 text-xs transition-all",
                isCompleted && "bg-emerald-500/10 border-emerald-500/30 text-emerald-600",
                !isCompleted && style
              )}
            >
              {isActionLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isCompleted ? (
                <CheckSquare className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              {isCompleted ? `${action.label} ✓` : action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
