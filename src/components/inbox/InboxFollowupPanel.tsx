import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw, Bell, CheckCircle } from "lucide-react";
import { usePendingFollowups } from "@/hooks/useFollowups";
import { FollowupSuggestionCard } from "./FollowupSuggestionCard";
import { FollowupSuggestion } from "@/hooks/useFollowups";
import { differenceInHours, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface InboxFollowupPanelProps {
  onSelectConversation?: (conversationId: string) => void;
}

export function InboxFollowupPanel({ onSelectConversation }: InboxFollowupPanelProps) {
  const { data: pendingFollowups, isLoading, refetch } = usePendingFollowups();

  const suggestions = useMemo(() => {
    if (!pendingFollowups) return [];

    return pendingFollowups.map((followup) => {
      const hoursSinceReply = followup.hours_since_last_reply;
      const urgencyLevel: FollowupSuggestion["urgencyLevel"] =
        hoursSinceReply >= 72 ? "urgent" : hoursSinceReply >= 48 ? "prepare" : "suggest";

      return {
        suggestion: {
          conversationId: followup.conversation_id,
          leadId: followup.lead_id,
          leadName: followup.conversation?.lead?.name || null,
          hoursSinceReply,
          urgencyLevel,
          message:
            urgencyLevel === "urgent"
              ? "Urgente! Sem resposta há mais de 72h"
              : urgencyLevel === "prepare"
              ? "Automação preparou mensagem - requer aprovação"
              : "Sugestão de follow-up - considere enviar mensagem",
        } as FollowupSuggestion,
        followup,
        conversation: followup.conversation,
      };
    });
  }, [pendingFollowups]);

  const approvedCount = suggestions.filter(
    (s) => s.followup.status === "approved"
  ).length;

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold">Follow-ups</h2>
            {pendingFollowups && pendingFollowups.length > 0 && (
              <Badge variant="secondary">{pendingFollowups.length}</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Quick stats */}
        {approvedCount > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
            <CheckCircle className="w-3 h-3" />
            {approvedCount} mensagem{approvedCount > 1 ? "s" : ""} aprovada
            {approvedCount > 1 ? "s" : ""} para envio
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Clock className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Tudo em dia!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Nenhum follow-up pendente
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {suggestions.map(({ suggestion, followup, conversation }) => (
              <div key={followup.id} className="space-y-2">
                <FollowupSuggestionCard
                  suggestion={suggestion}
                  existingFollowup={followup}
                  onSent={() => {
                    if (onSelectConversation) {
                      onSelectConversation(followup.conversation_id);
                    }
                  }}
                />
                {conversation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() =>
                      onSelectConversation?.(followup.conversation_id)
                    }
                  >
                    Ver conversa →
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
