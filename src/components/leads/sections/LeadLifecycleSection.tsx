import { Lead, LeadStatus } from "@/hooks/useLeads";
import { IXCard } from "@/components/entity/ix/IXCard";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface LeadLifecycleSectionProps {
  lead: Lead;
  onStatusChange: (status: LeadStatus) => void;
}

const LIFECYCLE_STEPS: LeadStatus[] = ['new', 'in_progress', 'completed'];

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Novo',
  in_progress: 'Em Progresso',
  completed: 'Concluído',
};

export function LeadLifecycleSection({ lead, onStatusChange }: LeadLifecycleSectionProps) {
  const currentStatus = (lead.status as LeadStatus) || 'new';
  const currentIndex = LIFECYCLE_STEPS.indexOf(currentStatus);

  return (
    <IXCard title="Ciclo de Vida">
      <div
        className="flex items-center gap-2"
        role="group"
        aria-label="Estado do lead"
      >
        {LIFECYCLE_STEPS.map((step, i) => {
          const isActive = step === currentStatus;
          const isPast = i < currentIndex;
          return (
            <button
              key={step}
              type="button"
              onClick={() => onStatusChange(step)}
              aria-current={isActive ? "step" : undefined}
              aria-label={`Marcar como ${STATUS_LABELS[step]}`}
              className={cn(
                "flex-1 h-9 rounded-full border text-xs font-medium transition-colors",
                "inline-flex items-center justify-center gap-1.5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive && "border-primary bg-primary/10 text-primary",
                isPast && !isActive && "border-border bg-muted text-foreground",
                !isPast && !isActive && "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {isPast && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              {STATUS_LABELS[step]}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Estado atual: <span className="text-foreground">{STATUS_LABELS[currentStatus]}</span>
      </p>
    </IXCard>
  );
}
