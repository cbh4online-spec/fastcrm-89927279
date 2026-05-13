import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, X, CheckCircle2, AlertCircle } from "lucide-react";
import {
  useLeadChefScheduledMessagesByLead,
  useCancelLeadChefScheduledMessage,
  type LeadChefScheduledMessage,
} from "@/hooks/leadchef/useLeadChefScheduledMessages";

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function timeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "agora";
  const min = Math.round(ms / 60000);
  if (min < 60) return `em ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `em ${h}h`;
  const d = Math.round(h / 24);
  return `em ${d} dias`;
}

function statusMeta(s: LeadChefScheduledMessage["status"]) {
  switch (s) {
    case "scheduled":
      return { label: "Agendado", variant: "default" as const, icon: MessageCircle };
    case "sent":
      return { label: "Enviado", variant: "secondary" as const, icon: CheckCircle2 };
    case "cancelled":
      return { label: "Cancelado", variant: "outline" as const, icon: X };
    case "failed":
      return { label: "Falhou", variant: "destructive" as const, icon: AlertCircle };
  }
}

interface Props {
  leadId: string;
}

export function LeadChefScheduledMessagesCard({ leadId }: Props) {
  const { data, isLoading } = useLeadChefScheduledMessagesByLead(leadId);
  const cancel = useCancelLeadChefScheduledMessage();

  const items = useMemo(() => (data ?? []).slice(0, 5), [data]);

  if (!isLoading && items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4 text-primary" />
          Mensagens agendadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
          </div>
        )}
        {items.map((m) => {
          const meta = statusMeta(m.status);
          const Icon = meta.icon;
          return (
            <div
              key={m.id}
              className="rounded-lg border bg-card p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant={meta.variant} className="gap-1">
                  <Icon className="h-3 w-3" />
                  {meta.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {m.status === "scheduled"
                    ? `${fmtDateTime(m.scheduled_for)} · ${timeUntil(m.scheduled_for)}`
                    : m.sent_at
                    ? `Enviado a ${fmtDateTime(m.sent_at)}`
                    : m.cancelled_at
                    ? `Cancelado a ${fmtDateTime(m.cancelled_at)}`
                    : fmtDateTime(m.scheduled_for)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap line-clamp-4 text-foreground/90">
                {m.rendered_body}
              </p>
              {m.cancel_reason && m.status !== "scheduled" && (
                <p className="text-xs text-muted-foreground">
                  Motivo: {m.cancel_reason.replace(/_/g, " ")}
                </p>
              )}
              {m.last_error && m.status === "failed" && (
                <p className="text-xs text-destructive">Erro: {m.last_error}</p>
              )}
              {m.status === "scheduled" && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancel.mutate(m.id)}
                    disabled={cancel.isPending}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancelar envio
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
