import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lead, LeadStatus } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";

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

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  in_progress: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  completed: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
};

export function LeadLifecycleSection({ lead, onStatusChange }: LeadLifecycleSectionProps) {
  const currentStatus = lead.status || 'new';
  const currentIndex = LIFECYCLE_STEPS.indexOf(currentStatus);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Ciclo de Vida</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-1 mb-4">
          {LIFECYCLE_STEPS.map((step, i) => {
            const isActive = step === currentStatus;
            const isPast = i <= currentIndex;
            return (
              <button
                key={step}
                onClick={() => onStatusChange(step)}
                className={cn(
                  "flex-1 h-8 rounded-md text-xs font-medium transition-all",
                  "border flex items-center justify-center",
                  isActive && STATUS_COLORS[step],
                  isPast && !isActive && "bg-muted text-muted-foreground border-border",
                  !isPast && "bg-background text-muted-foreground/50 border-border/50 hover:border-border"
                )}
              >
                {STATUS_LABELS[step]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {LIFECYCLE_STEPS.map((status) => (
            <Badge
              key={status}
              variant="outline"
              className={cn(
                "cursor-pointer text-xs transition-all",
                status === currentStatus ? STATUS_COLORS[status] : "opacity-50 hover:opacity-75"
              )}
              onClick={() => onStatusChange(status)}
            >
              {STATUS_LABELS[status]}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
