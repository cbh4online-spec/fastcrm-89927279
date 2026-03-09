import { CommandAction } from "@/hooks/useCommandOrchestrator";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckSquare, Mail, Calendar, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface CommandQuickActionsProps {
  actions: CommandAction[];
}

const actionIcons: Record<string, any> = {
  navigate: ArrowRight,
  create_task: CheckSquare,
  send_email: Mail,
  schedule_meeting: Calendar,
  generate_report: FileText,
};

export function CommandQuickActions({ actions }: CommandQuickActionsProps) {
  const navigate = useNavigate();

  if (!actions || actions.length === 0) return null;

  const handleAction = (action: CommandAction) => {
    switch (action.action_type) {
      case "navigate":
        if (action.target) navigate(action.target);
        break;
      case "create_task":
        toast.info("Funcionalidade de criar tarefa em breve");
        break;
      case "send_email":
        toast.info("Funcionalidade de enviar email em breve");
        break;
      case "schedule_meeting":
        toast.info("Funcionalidade de agendar reunião em breve");
        break;
      case "generate_report":
        toast.info("Funcionalidade de gerar relatório em breve");
        break;
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações Sugeridas</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action, i) => {
          const Icon = actionIcons[action.action_type] || ArrowRight;
          return (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={() => handleAction(action)}
              className="gap-2 text-xs"
            >
              <Icon className="h-3.5 w-3.5" />
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
