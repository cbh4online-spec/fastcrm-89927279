import { useQuery } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Pause,
  Play,
  RefreshCw,
  CreditCard,
  Settings,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SubscriptionEvent {
  id: string;
  workspace_id: string;
  subscription_id: string;
  event_type: string;
  amount: number | null;
  currency: string | null;
  occurred_at: string;
  raw_payload: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

const EVENT_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  created: { icon: CheckCircle2, color: "text-green-600", label: "Subscrição criada" },
  payment_succeeded: { icon: CreditCard, color: "text-green-600", label: "Pagamento recebido" },
  payment_failed: { icon: AlertCircle, color: "text-red-600", label: "Pagamento falhado" },
  paused: { icon: Pause, color: "text-yellow-600", label: "Subscrição pausada" },
  resumed: { icon: Play, color: "text-green-600", label: "Subscrição retomada" },
  canceled: { icon: XCircle, color: "text-red-600", label: "Subscrição cancelada" },
  renewed: { icon: RefreshCw, color: "text-blue-600", label: "Subscrição renovada" },
  plan_changed: { icon: Settings, color: "text-purple-600", label: "Plano alterado" },
  manual_adjustment: { icon: FileText, color: "text-muted-foreground", label: "Ajuste manual" },
};

interface SubscriptionTimelineProps {
  subscriptionId: string;
  maxItems?: number;
}

export function SubscriptionTimeline({
  subscriptionId,
  maxItems = 10,
}: SubscriptionTimelineProps) {
  const { workspaceClient } = useWorkspaceInstance();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["subscription-events", subscriptionId],
    queryFn: async () => {
      if (!workspaceClient) return [];

      const { data, error } = await workspaceClient
        .from("subscription_events")
        .select("*")
        .eq("subscription_id", subscriptionId)
        .order("occurred_at", { ascending: false })
        .limit(maxItems);

      if (error) throw error;
      return data as SubscriptionEvent[];
    },
    enabled: !!workspaceClient && !!subscriptionId,
  });

  const formatCurrency = (value: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Sem eventos registados</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {events.map((event, index) => {
          const config = EVENT_CONFIG[event.event_type] || {
            icon: FileText,
            color: "text-muted-foreground",
            label: event.event_type,
          };
          const Icon = config.icon;

          return (
            <div key={event.id} className="relative flex gap-3 pl-1">
              {/* Icon */}
              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2",
                  config.color.replace("text-", "border-")
                )}
              >
                <Icon className={cn("h-4 w-4", config.color)} />
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{config.label}</p>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(event.occurred_at), "dd MMM yyyy HH:mm", {
                      locale: pt,
                    })}
                  </span>
                </div>
                {event.amount !== null && (
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(event.amount, event.currency || "EUR")}
                  </p>
                )}
                {event.notes && (
                  <p className="text-sm text-muted-foreground mt-1">{event.notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
