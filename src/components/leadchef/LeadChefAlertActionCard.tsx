import { useNavigate } from "react-router-dom";
import { AlertTriangle, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeadChefActionableAlert } from "@/types/leadchefTemplates";

const SEV_STYLES: Record<string, string> = {
  info: "bg-sky-50 border-sky-200 text-sky-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  critical: "bg-rose-50 border-rose-200 text-rose-900",
};

interface Props {
  alert: LeadChefActionableAlert;
  onSendMessage?: (a: LeadChefActionableAlert) => void;
}

export function LeadChefAlertActionCard({ alert, onSendMessage }: Props) {
  const navigate = useNavigate();
  const Icon = alert.severity === "critical" ? AlertCircle : AlertTriangle;

  const open = () => {
    if (alert.actionHref) navigate(alert.actionHref);
  };

  return (
    <div className={cn("rounded-xl border p-3 flex items-start gap-2", SEV_STYLES[alert.severity])}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{alert.title}</p>
        {alert.description && (
          <p className="text-xs opacity-80 mt-0.5">{alert.description}</p>
        )}
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <button onClick={open} className="text-xs font-medium underline-offset-2 hover:underline">
            {alert.actionLabel ?? "Abrir"}
          </button>
          {alert.templateCategory && onSendMessage && (
            <button
              onClick={() => onSendMessage(alert)}
              className="text-xs font-medium underline-offset-2 hover:underline"
            >
              Enviar mensagem
            </button>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 opacity-60 mt-1" onClick={open} />
    </div>
  );
}
