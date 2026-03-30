import { CommandAction } from "@/hooks/useCommandOrchestrator";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, CheckSquare, Mail, Calendar, FileText, Loader2,
  RefreshCw, Search, Download, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useExecuteAction } from "@/hooks/useActionExecution";

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

// Client-side only actions that don't need server execution
const CLIENT_ONLY_ACTIONS = new Set(['navigate', 'analyze_deeper', 'export_pdf', 'generate_report']);

export function CommandQuickActions({ actions, entityId, entityName, onExecuteCommand }: CommandQuickActionsProps) {
  const navigate = useNavigate();
  const executeAction = useExecuteAction();
  const [loadingAction, setLoadingAction] = useState<number | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<number>>(new Set());

  if (!actions || actions.length === 0) return null;

  const markCompleted = (index: number) => {
    setCompletedActions((prev) => new Set(prev).add(index));
  };

  const handleAction = async (action: CommandAction, index: number) => {
    // Client-side only actions
    if (action.action_type === 'navigate') {
      if (action.target) navigate(action.target);
      return;
    }

    if (action.action_type === 'analyze_deeper') {
      if (onExecuteCommand) {
        const cmd = entityName
          ? `Aprofunda a análise de ${entityName}`
          : "Aprofunda a análise anterior";
        onExecuteCommand(cmd);
      }
      return;
    }

    if (action.action_type === 'generate_report' || action.action_type === 'export_pdf') {
      const target = action.target || "/dashboard/proposals";
      toast.info(action.action_type === 'generate_report' ? "A abrir gerador de proposta…" : "A abrir exportação…");
      navigate(target);
      return;
    }

    if (action.action_type === 'send_email') {
      // Route through execution engine for audit, but navigate to inbox
      setLoadingAction(index);
      try {
        await executeAction.mutateAsync({
          action_type: 'send_email',
          title: action.label || 'Enviar email',
          source_type: 'command_center',
          entity_type: entityId ? 'opportunity' : undefined,
          entity_id: entityId,
          payload: { entity_name: entityName },
          correlation_id: `cmd-send_email-${entityId || 'none'}-${Date.now()}`,
        });
        navigate("/dashboard/inbox");
      } catch {
        // toast handled by hook
      } finally {
        setLoadingAction(null);
      }
      return;
    }

    // Server-executed actions: create_task, schedule_meeting, create_followup
    setLoadingAction(index);
    try {
      const payload: Record<string, unknown> = {
        title: action.label || action.action_type,
        entity_name: entityName,
      };

      if (action.action_type === 'schedule_meeting') {
        const dueAt = new Date();
        dueAt.setDate(dueAt.getDate() + 1);
        dueAt.setHours(9, 0, 0, 0);
        payload.title = entityName ? `Review com Cliente — ${entityName}` : (action.label || 'Review com Cliente');
        payload.due_at = dueAt.toISOString();
        payload.related_type = entityId ? 'opportunity' : undefined;
        payload.related_id = entityId || undefined;
      }

      if (action.action_type === 'create_followup') {
        const dueAt = new Date();
        dueAt.setDate(dueAt.getDate() + 3);
        dueAt.setHours(9, 0, 0, 0);
        payload.title = entityName ? `Follow-up — ${entityName}` : (action.label || 'Follow-up');
        payload.due_at = dueAt.toISOString();
        payload.days = 3;
        payload.related_type = entityId ? 'opportunity' : undefined;
        payload.related_id = entityId || undefined;
      }

      if (action.action_type === 'create_task') {
        payload.related_type = entityId ? 'opportunity' : undefined;
        payload.related_id = entityId || undefined;
      }

      // Map create_followup to create_followup_note action_type
      const mappedType = action.action_type === 'create_followup' ? 'create_followup_note' : action.action_type;

      const result = await executeAction.mutateAsync({
        action_type: mappedType,
        title: (payload.title as string) || action.label || action.action_type,
        source_type: 'command_center',
        entity_type: entityId ? 'opportunity' : undefined,
        entity_id: entityId,
        payload,
        correlation_id: `cmd-${action.action_type}-${entityId || 'none'}-${Date.now()}`,
      });

      if (result.status === 'completed') {
        markCompleted(index);
      }
    } catch {
      // toast handled by hook
    } finally {
      setLoadingAction(null);
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
