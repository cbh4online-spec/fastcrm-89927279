import {
  Mail, MessageSquare, Phone, StickyNote, AlertTriangle, CreditCard,
  HandCoins, Calendar, Eye, Cpu, Send,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ACTION_LABELS, CHANNEL_LABELS, formatAbsolute, formatRelative,
} from "../lib/collectionsFormat";
import type { CollectionActionRow, CollectionActionType } from "../types/collections";

const ICONS: Record<CollectionActionType, React.ComponentType<{ className?: string }>> = {
  email_sent: Mail,
  whatsapp_sent: MessageSquare,
  sms_sent: Send,
  call_logged: Phone,
  note: StickyNote,
  promise_created: HandCoins,
  plan_created: Calendar,
  payment_received: CreditCard,
  escalation: AlertTriangle,
  portal_view: Eye,
  system: Cpu,
};

export function CaseTimeline({
  actions,
  isLoading,
}: {
  actions: CollectionActionRow[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (actions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Sem ações registadas neste caso.
      </p>
    );
  }
  return (
    <TooltipProvider>
      <ol className="relative space-y-4 border-l border-border pl-6">
        {actions.map((a) => {
          const Icon = ICONS[a.action_type] ?? StickyNote;
          const delivery = (a.metadata as { delivery?: { status?: string; error?: string; reason?: string } } | null)
            ?.delivery;
          const deliveryLabel =
            delivery?.status === "sent" ? "Entregue"
            : delivery?.status === "failed" ? "Falhou"
            : delivery?.status === "manual" ? "Manual"
            : null;
          const deliveryTone =
            delivery?.status === "sent" ? "text-emerald-600"
            : delivery?.status === "failed" ? "text-destructive"
            : "text-muted-foreground";
          return (

            <li key={a.id} className="relative">
              <span className="absolute -left-9 flex h-6 w-6 items-center justify-center rounded-full bg-accent">
                <Icon className="h-3.5 w-3.5 text-accent-foreground" />
              </span>
              <div className="rounded-md border bg-card p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{ACTION_LABELS[a.action_type]}</span>
                  {a.channel && (
                    <span className="text-xs text-muted-foreground">· {CHANNEL_LABELS[a.channel]}</span>
                  )}
                  {a.is_automated && (
                    <span className="text-xs text-muted-foreground">· automático</span>
                  )}
                  {deliveryLabel && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={`text-xs font-medium ${deliveryTone}`}>· {deliveryLabel}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {delivery?.error ?? delivery?.reason ?? "Comunicação processada"}
                      </TooltipContent>
                    </Tooltip>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatRelative(a.created_at)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{formatAbsolute(a.created_at)}</TooltipContent>
                  </Tooltip>
                </div>
                {a.subject && <p className="mt-1 text-sm font-medium">{a.subject}</p>}
                {a.body && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                )}
                {a.outcome && (
                  <p className="mt-1 text-xs text-muted-foreground">Resultado: {a.outcome}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </TooltipProvider>
  );
}
