import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Loader2 } from "lucide-react";
import {
  useLeadChefPendingScheduledMessages,
  useCancelLeadChefScheduledMessage,
} from "@/hooks/leadchef/useLeadChefScheduledMessages";
import { useAuth } from "@/contexts/AuthContext";

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

export function LeadChefPendingMessagesBlock() {
  const { user } = useAuth();
  const { data, isLoading } = useLeadChefPendingScheduledMessages();
  const cancel = useCancelLeadChefScheduledMessage();

  const mine = (data ?? []).filter(
    (m) => !user?.id || m.agent_id === user.id || m.leads?.assigned_to === user.id,
  );

  if (!isLoading && mine.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4 text-primary" />
          Envios pendentes ({mine.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
          </div>
        )}
        {mine.slice(0, 6).map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2.5 text-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  to={`/dashboard/leadchef/leads/${m.lead_id}`}
                  className="font-medium truncate hover:underline"
                >
                  {m.leads?.name ?? "Lead"}
                </Link>
                <Badge variant="secondary" className="text-[10px]">
                  {timeUntil(m.scheduled_for)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {m.rendered_body.split("\n")[0]}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => cancel.mutate(m.id)}
              disabled={cancel.isPending}
              title="Cancelar envio"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
