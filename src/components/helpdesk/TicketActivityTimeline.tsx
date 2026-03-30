import { useHelpdeskHistory } from "@/hooks/useHelpdeskHistory";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ArrowRight, Tag, User, Flag, Headphones, MessageSquare } from "lucide-react";
import TimeAgo from "react-timeago";
import { cn } from "@/lib/utils";

const FIELD_LABELS: Record<string, string> = {
  status: "Estado",
  priority: "Prioridade",
  assigned_to: "Agente",
  department: "Departamento",
  tags: "Tags",
  subject: "Assunto",
  type: "Tipo",
};

const FIELD_ICONS: Record<string, typeof Clock> = {
  status: Clock,
  priority: Flag,
  assigned_to: User,
  department: Headphones,
  tags: Tag,
};

interface TicketActivityTimelineProps {
  ticketId: string;
}

export function TicketActivityTimeline({ ticketId }: TicketActivityTimelineProps) {
  const { history, isLoading } = useHelpdeskHistory(ticketId);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <MessageSquare className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">Sem histórico de alterações</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-4">
          {history.map((entry) => {
            const Icon = FIELD_ICONS[entry.field_changed] || Clock;
            const label = FIELD_LABELS[entry.field_changed] || entry.field_changed;
            const initials = entry.profile?.full_name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "?";

            return (
              <div key={entry.id} className="flex gap-3 relative pl-1">
                <div className="relative z-10 flex items-center justify-center h-8 w-8 rounded-full bg-muted border shrink-0">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {entry.profile?.full_name || "Sistema"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      alterou <strong>{label}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                    {entry.old_value && (
                      <>
                        <span className="line-through opacity-60">{entry.old_value}</span>
                        <ArrowRight className="h-3 w-3" />
                      </>
                    )}
                    {entry.new_value && (
                      <span className="font-medium text-foreground">{entry.new_value}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    <TimeAgo date={entry.created_at} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
