import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { LeadChefTeamAlert } from "@/hooks/leadchef/useLeadChefTeamAlerts";
import { cn } from "@/lib/utils";

const SEVERITY_COLORS = {
  critical: "border-rose-200 bg-rose-50",
  warning: "border-amber-200 bg-amber-50",
  info: "border-sky-200 bg-sky-50",
};

interface Props {
  alerts: LeadChefTeamAlert[];
  isLoading?: boolean;
}

export function LeadChefTeamAlerts({ alerts, isLoading }: Props) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-4 text-sm text-slate-500">
        A carregar alertas…
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-600">
        Tudo em dia na equipa.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {alerts.slice(0, 30).map((a) => (
        <li key={a.id}>
          <button
            onClick={() => navigate(a.actionHref)}
            className={cn(
              "w-full text-left rounded-xl border p-3 flex items-start gap-3 hover:opacity-90 transition",
              SEVERITY_COLORS[a.severity]
            )}
          >
            <AlertTriangle className="h-4 w-4 text-slate-700 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{a.title}</p>
              <p className="text-xs text-slate-700 truncate">{a.description}</p>
              {a.userName && (
                <p className="text-[11px] text-slate-600 mt-0.5">Agente · {a.userName}</p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        </li>
      ))}
    </ul>
  );
}
