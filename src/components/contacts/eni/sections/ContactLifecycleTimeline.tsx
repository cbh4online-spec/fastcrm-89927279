import { useMemo } from "react";
import { useContactAuditLog } from "@/hooks/useContactAuditLog";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LeadStatus } from "../ENIContactTypes";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { ArrowRight, Clock, Loader2 } from "lucide-react";

interface ContactLifecycleTimelineProps {
  contactId: string;
}

export function ContactLifecycleTimeline({ contactId }: ContactLifecycleTimelineProps) {
  const { data: auditLog, isLoading } = useContactAuditLog(contactId);

  const transitions = useMemo(() => {
    if (!auditLog) return [];
    return auditLog
      .filter((entry) => entry.field_name === "lead_status")
      .map((entry) => ({
        id: entry.id,
        from: entry.old_value as string | null,
        to: entry.new_value as string,
        date: entry.changed_at,
        changedBy: entry.changed_by,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [auditLog]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (transitions.length === 0) {
    return (
      <div className="text-center py-4">
        <Clock className="h-5 w-5 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-xs text-muted-foreground">Sem transições registadas</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {transitions.map((transition, index) => {
        const fromLabel = transition.from
          ? LEAD_STATUS_LABELS[transition.from as LeadStatus] || transition.from
          : "—";
        const toLabel =
          LEAD_STATUS_LABELS[transition.to as LeadStatus] || transition.to;
        const toColor =
          LEAD_STATUS_COLORS[transition.to as LeadStatus] ||
          "bg-muted text-muted-foreground border-border";
        const isLast = index === transitions.length - 1;

        return (
          <div key={transition.id} className="relative flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full border-2 mt-1.5 flex-shrink-0",
                  index === 0
                    ? "border-primary bg-primary"
                    : "border-border bg-background"
                )}
              />
              {!isLast && (
                <div className="w-px flex-1 bg-border/60 min-h-[24px]" />
              )}
            </div>

            {/* Content */}
            <div className="pb-4 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {transition.from && (
                  <span className="text-xs text-muted-foreground">
                    {fromLabel}
                  </span>
                )}
                <ArrowRight className="h-3 w-3 text-muted-foreground/60 flex-shrink-0" />
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-md border",
                    toColor
                  )}
                >
                  {toLabel}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {format(new Date(transition.date), "d MMM yyyy, HH:mm", {
                  locale: pt,
                })}{" "}
                · {formatDistanceToNow(new Date(transition.date), { addSuffix: true, locale: pt })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
