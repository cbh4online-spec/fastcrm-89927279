import { useMemo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Send,
  AlarmClock,
  X,
  Sparkles,
  Edit3,
  CheckCircle,
  Eye,
  Flame,
  MessageSquare,
  Loader2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  analyzeFollowupNeed,
  useFollowups,
  useCreateFollowup,
  useSnoozeFollowup,
  useDismissFollowup,
  useApproveFollowup,
  useMarkFollowupSent,
  useGenerateFollowupDraft,
  FollowupTriggerType,
  ProposalContext,
} from "@/hooks/useFollowups";
import { useSendMessage, Message } from "@/hooks/useMessages";
import { Conversation } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";
import { addHours, addDays } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

interface ConversationFollowupBannerProps {
  conversation: Conversation;
  messages: Message[];
  proposalContext?: ProposalContext;
  temperatureScore?: number;
}

const snoozeOptions = [
  { label: "1h", hours: 1 },
  { label: "2h", hours: 2 },
  { label: "4h", hours: 4 },
  { label: "Amanhã", hours: 24 },
];

const triggerIcons: Record<FollowupTriggerType, typeof Clock> = {
  no_reply: Clock,
  proposal_viewed: Eye,
  hot_stalled: Flame,
  general: MessageSquare,
};

const triggerLabels: Record<FollowupTriggerType, string> = {
  no_reply: "Sem resposta",
  proposal_viewed: "Proposta visualizada",
  hot_stalled: "Conversa esfriando",
  general: "Follow-up sugerido",
};

export function ConversationFollowupBanner({
  conversation,
  messages,
  proposalContext,
  temperatureScore,
}: ConversationFollowupBannerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState("");
  const [showSnooze, setShowSnooze] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  const { data: existingFollowups } = useFollowups(conversation.id);
  const createFollowup = useCreateFollowup();
  const snoozeFollowup = useSnoozeFollowup();
  const dismissFollowup = useDismissFollowup();
  const approveFollowup = useApproveFollowup();
  const markSent = useMarkFollowupSent();
  const sendMessage = useSendMessage();
  const { generateDraft, isLoading: isGeneratingDraft } = useGenerateFollowupDraft();

  // Analyze if follow-up is needed with enhanced detection
  const suggestion = useMemo(() => {
    return analyzeFollowupNeed(conversation, messages, proposalContext, temperatureScore);
  }, [conversation, messages, proposalContext, temperatureScore]);

  // Get active followup for this conversation
  const activeFollowup = useMemo(() => {
    return existingFollowups?.find(
      (f) => f.status === "pending" || f.status === "approved"
    );
  }, [existingFollowups]);

  // Auto-create followup if suggestion exists and no active followup
  useEffect(() => {
    if (suggestion && !activeFollowup && !createFollowup.isPending) {
      createFollowup.mutate({
        conversationId: conversation.id,
        leadId: conversation.lead_id,
        hoursSinceReply: suggestion.hoursSinceReply,
      });
    }
  }, [suggestion?.conversationId, activeFollowup, conversation.id, conversation.lead_id]);

  // Don't show if no suggestion and no active followup
  if (!suggestion && !activeFollowup) return null;

  const hoursSinceReply = activeFollowup?.hours_since_last_reply || suggestion?.hoursSinceReply || 0;
  const isApproved = activeFollowup?.status === "approved";
  const hasPreparedMessage = !!activeFollowup?.prepared_message;
  const triggerType: FollowupTriggerType = suggestion?.triggerType || "general";
  const TriggerIcon = triggerIcons[triggerType];

  const urgencyColors = {
    suggest: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400",
    prepare: "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400",
    urgent: "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400",
  };

  const urgencyLevel: "suggest" | "prepare" | "urgent" =
    hoursSinceReply >= 72 ? "urgent" : hoursSinceReply >= 48 ? "prepare" : "suggest";

  const handleSnooze = (hours: number) => {
    if (!activeFollowup) return;
    const snoozeUntil = hours < 24 ? addHours(new Date(), hours) : addDays(new Date(), hours / 24);
    snoozeFollowup.mutate({ followupId: activeFollowup.id, snoozeUntil });
    setShowSnooze(false);
  };

  const handleDismiss = () => {
    if (!activeFollowup) return;
    dismissFollowup.mutate(activeFollowup.id);
  };

  const handleApprove = () => {
    if (!activeFollowup) return;
    approveFollowup.mutate({
      followupId: activeFollowup.id,
      message: editedMessage,
    });
    setIsEditing(false);
  };

  const handleSend = async () => {
    if (!activeFollowup?.prepared_message) return;
    try {
      await sendMessage.mutateAsync({
        conversationId: conversation.id,
        content: activeFollowup.prepared_message,
      });
      await markSent.mutateAsync(activeFollowup.id);
    } catch (error) {
      console.error("Failed to send follow-up:", error);
    }
  };

  const handleGenerateAIDraft = async () => {
    if (!suggestion) return;

    const draft = await generateDraft(messages, {
      triggerType: suggestion.triggerType,
      hoursSinceLastMessage: suggestion.hoursSinceReply,
      proposalTitle: suggestion.context?.proposalTitle,
      proposalValue: suggestion.context?.proposalValue,
      proposalViewCount: suggestion.context?.proposalViewCount,
      temperatureScore: suggestion.context?.temperatureScore,
      leadName: conversation.lead?.name || undefined,
      leadEmail: conversation.lead?.email || undefined,
      channel: conversation.channel,
    });

    if (draft) {
      setEditedMessage(draft.draftMessage);
      setAiReasoning(draft.reasoning);
      setIsEditing(true);
    }
  };

  return (
    <div className={cn("border-b p-3", urgencyColors[urgencyLevel])}>
      {!isEditing ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <TriggerIcon className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">
                  {triggerLabels[triggerType]}
                </span>
                <Badge variant="outline" className="text-xs py-0">
                  {hoursSinceReply}h
                </Badge>
                {triggerType === "proposal_viewed" && suggestion?.context?.proposalViewCount && (
                  <Badge variant="outline" className="text-xs py-0 gap-1">
                    <Eye className="w-3 h-3" />
                    {suggestion.context.proposalViewCount}x
                  </Badge>
                )}
                {triggerType === "hot_stalled" && suggestion?.context?.temperatureScore && (
                  <Badge variant="outline" className="text-xs py-0 gap-1 border-red-500/50">
                    <Flame className="w-3 h-3 text-red-500" />
                    {suggestion.context.temperatureScore}
                  </Badge>
                )}
                {urgencyLevel === "prepare" && (
                  <Badge variant="outline" className="text-xs gap-1 py-0">
                    <Sparkles className="w-3 h-3" />
                    Automação
                  </Badge>
                )}
                {isApproved && (
                  <Badge variant="outline" className="text-xs gap-1 py-0 border-green-500 text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    Aprovada
                  </Badge>
                )}
              </div>
              {hasPreparedMessage && (
                <p className="text-xs truncate mt-1 opacity-80">
                  "{activeFollowup?.prepared_message}"
                </p>
              )}
              {suggestion?.message && !hasPreparedMessage && (
                <p className="text-xs mt-1 opacity-70">{suggestion.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Send button - only if approved */}
            {isApproved && hasPreparedMessage && (
              <Button
                size="sm"
                variant="default"
                onClick={handleSend}
                disabled={sendMessage.isPending}
                className="gap-1 h-7"
              >
                <Send className="w-3 h-3" />
                Enviar
              </Button>
            )}

            {/* AI Draft button */}
            {!hasPreparedMessage && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleGenerateAIDraft}
                    disabled={isGeneratingDraft}
                    className="gap-1 h-7"
                  >
                    {isGeneratingDraft ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    IA
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Gerar rascunho com IA</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Manual prepare button */}
            {!hasPreparedMessage && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="gap-1 h-7"
              >
                <Edit3 className="w-3 h-3" />
                Manual
              </Button>
            )}

            {/* Edit button for existing message */}
            {hasPreparedMessage && !isApproved && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEditedMessage(activeFollowup?.prepared_message || "");
                  setIsEditing(true);
                }}
                className="gap-1 h-7"
              >
                <Edit3 className="w-3 h-3" />
                Editar
              </Button>
            )}

            {/* Snooze */}
            <Popover open={showSnooze} onOpenChange={setShowSnooze}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <AlarmClock className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-32 p-1" align="end">
                {snoozeOptions.map((opt) => (
                  <Button
                    key={opt.label}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-7"
                    onClick={() => handleSnooze(opt.hours)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </PopoverContent>
            </Popover>

            {/* Dismiss */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-7 px-2"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {aiReasoning && (
            <div className="flex items-start gap-2 p-2 bg-background/50 rounded-md text-xs">
              <Sparkles className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
              <p className="text-muted-foreground">{aiReasoning}</p>
            </div>
          )}
          <Textarea
            value={editedMessage}
            onChange={(e) => setEditedMessage(e.target.value)}
            placeholder="Escreva a mensagem de follow-up..."
            rows={3}
            className="bg-background"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={!editedMessage.trim() || approveFollowup.isPending}
              className="gap-1"
            >
              <CheckCircle className="w-4 h-4" />
              Aprovar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                setAiReasoning(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
