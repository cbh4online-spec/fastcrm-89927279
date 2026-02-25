import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ENIContact, LeadStatus, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from "../ENIContactTypes";
import { cn } from "@/lib/utils";

interface ContactLifecycleSectionProps {
  contact: ENIContact;
  onFieldChange: (field: keyof ENIContact, value: unknown) => void;
}

const LIFECYCLE_STEPS: LeadStatus[] = ['new', 'contacted', 'qualified', 'customer'];

export function ContactLifecycleSection({ contact, onFieldChange }: ContactLifecycleSectionProps) {
  const currentStatus = (contact.lead_status || 'new') as LeadStatus;
  const currentIndex = LIFECYCLE_STEPS.indexOf(currentStatus);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Ciclo de Vida</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Pipeline visual */}
        <div className="flex items-center gap-1 mb-4">
          {LIFECYCLE_STEPS.map((step, i) => {
            const isActive = step === currentStatus;
            const isPast = i <= currentIndex;
            return (
              <button
                key={step}
                onClick={() => onFieldChange('lead_status', step)}
                className={cn(
                  "flex-1 h-8 rounded-md text-xs font-medium transition-all",
                  "border flex items-center justify-center",
                  isActive && LEAD_STATUS_COLORS[step],
                  isPast && !isActive && "bg-muted text-muted-foreground border-border",
                  !isPast && "bg-background text-muted-foreground/50 border-border/50 hover:border-border"
                )}
              >
                {LEAD_STATUS_LABELS[step]}
              </button>
            );
          })}
        </div>

        {/* All statuses as badges */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((status) => (
            <Badge
              key={status}
              variant="outline"
              className={cn(
                "cursor-pointer text-xs transition-all",
                status === currentStatus ? LEAD_STATUS_COLORS[status] : "opacity-50 hover:opacity-75"
              )}
              onClick={() => onFieldChange('lead_status', status)}
            >
              {LEAD_STATUS_LABELS[status]}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
