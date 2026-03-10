import { CheckCircle2, Circle, ArrowRight, AlertTriangle, Clock, Wrench, Package, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  currentStatus: string;
  escalationLevel?: number;
  slaResponseMet?: boolean | null;
  slaResolutionMet?: boolean | null;
}

const STEPS = [
  { key: "open", label: "Aberta", icon: AlertTriangle },
  { key: "in_progress", label: "Em Progresso", icon: Wrench },
  { key: "waiting_parts", label: "Aguardar Peças", icon: Package, optional: true },
  { key: "resolved", label: "Resolvida", icon: CheckCircle2 },
  { key: "closed", label: "Fechada", icon: CheckCircle2 },
];

const STATUS_ORDER: Record<string, number> = {
  open: 0,
  in_progress: 1,
  waiting_parts: 2,
  resolved: 3,
  closed: 4,
  cancelled: -1,
};

export function OccurrenceWorkflowStepper({ currentStatus, escalationLevel = 0, slaResponseMet, slaResolutionMet }: Props) {
  const currentIndex = STATUS_ORDER[currentStatus] ?? 0;
  const isCancelled = currentStatus === "cancelled";

  // Filter out waiting_parts if not relevant
  const visibleSteps = STEPS.filter((s) => {
    if (!s.optional) return true;
    return currentStatus === s.key || currentIndex > (STATUS_ORDER[s.key] ?? 0);
  });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {visibleSteps.map((step, idx) => {
          const stepIndex = STATUS_ORDER[step.key];
          const isActive = step.key === currentStatus;
          const isCompleted = !isCancelled && currentIndex > stepIndex;
          const isFuture = !isCancelled && currentIndex < stepIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 relative z-10">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors",
                    isCancelled
                      ? "border-destructive/50 bg-destructive/10"
                      : isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/30 bg-muted/50 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium text-center whitespace-nowrap",
                    isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < visibleSteps.length - 1 && (
                <div className="flex-1 mx-2 mt-[-18px]">
                  <div
                    className={cn(
                      "h-0.5 w-full transition-colors",
                      isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cancelled overlay */}
      {isCancelled && (
        <div className="mt-3 text-center">
          <span className="text-xs font-medium text-destructive bg-destructive/10 px-3 py-1 rounded-full">
            Ocorrência Cancelada
          </span>
        </div>
      )}

      {/* Escalation + SLA indicators */}
      {(escalationLevel > 0 || slaResponseMet !== null || slaResolutionMet !== null) && (
        <div className="flex gap-3 mt-3 justify-center flex-wrap">
          {escalationLevel > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
              <ShieldAlert className="h-3 w-3" /> Escalação Nível {escalationLevel}
            </span>
          )}
          {slaResponseMet !== null && (
            <span className={cn(
              "flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
              slaResponseMet ? "text-emerald-600 bg-emerald-500/10" : "text-destructive bg-destructive/10"
            )}>
              <Clock className="h-3 w-3" /> Resposta {slaResponseMet ? "✓" : "✗"}
            </span>
          )}
          {slaResolutionMet !== null && (
            <span className={cn(
              "flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
              slaResolutionMet ? "text-emerald-600 bg-emerald-500/10" : "text-destructive bg-destructive/10"
            )}>
              <CheckCircle2 className="h-3 w-3" /> Resolução {slaResolutionMet ? "✓" : "✗"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
