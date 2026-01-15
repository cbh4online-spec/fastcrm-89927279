import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Clock,
  Send,
  X,
  AlarmClock,
  Sparkles,
  CheckCircle,
  Edit3,
  Eye,
  Flame,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { addHours, addDays } from "date-fns";
import {
  ConversationFollowup,
  FollowupSuggestion,
  FollowupTriggerType,
  useSnoozeFollowup,
  useDismissFollowup,
  useApproveFollowup,
  useGenerateFollowupDraft,
} from "@/hooks/useFollowups";
import { useSendMessage } from "@/hooks/useMessages";
import { useMarkFollowupSent } from "@/hooks/useFollowups";
import { useMessages } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";

interface FollowupSuggestionCardProps {
  suggestion: FollowupSuggestion;
  existingFollowup?: ConversationFollowup;
  channel?: string;
  onSent?: () => void;
}

const snoozeOptions = [
  { label: "1 hora", hours: 1 },
  { label: "2 horas", hours: 2 },
  { label: "4 horas", hours: 4 },
  { label: "Amanhã", hours: 24 },
  { label: "2 dias", hours: 48 },
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

export function FollowupSuggestionCard({
  suggestion,
  existingFollowup,
  channel = "email",
  onSent,
}: FollowupSuggestionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(
    existingFollowup?.prepared_message || ""
  );
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  const snoozeFollowup = useSnoozeFollowup();
  const dismissFollowup = useDismissFollowup();
  const approveFollowup = useApproveFollowup();
  const sendMessage = useSendMessage();
  const markSent = useMarkFollowupSent();
  const { generateDraft, isLoading: isGeneratingDraft } = useGenerateFollowupDraft();
  const { data: messages } = useMessages(suggestion.conversationId);

  const TriggerIcon = triggerIcons[suggestion.triggerType || "general"];

  const urgencyColors = {
    suggest: "border-amber-500/50 bg-amber-500/5",
    prepare: "border-orange-500/50 bg-orange-500/5",
    urgent: "border-red-500/50 bg-red-500/5",
  };

  const urgencyBadgeColors = {
    suggest: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    prepare: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const handleSnooze = (hours: number) => {
    if (!existingFollowup) return;
    const snoozeUntil = hours < 24 ? addHours(new Date(), hours) : addDays(new Date(), hours / 24);
    snoozeFollowup.mutate({ followupId: existingFollowup.id, snoozeUntil });
    setShowSnoozeMenu(false);
  };

  const handleDismiss = () => {
    if (!existingFollowup) return;
    dismissFollowup.mutate(existingFollowup.id);
  };

  const handleApprove = () => {
    if (!existingFollowup) return;
    approveFollowup.mutate({
      followupId: existingFollowup.id,
      message: editedMessage,
    });
    setIsEditing(false);
  };

  const handleSend = async () => {
    if (!existingFollowup?.prepared_message) return;

    try {
      await sendMessage.mutateAsync({
        conversationId: suggestion.conversationId,
        content: existingFollowup.prepared_message,
      });
      await markSent.mutateAsync(existingFollowup.id);
      onSent?.();
    } catch (error) {
      console.error("Failed to send follow-up:", error);
    }
  };

  const handleGenerateAIDraft = async () => {
    if (!messages || messages.length === 0) return;

    const draft = await generateDraft(messages, {
      triggerType: suggestion.triggerType || "general",
      hoursSinceLastMessage: suggestion.hoursSinceReply,
      proposalTitle: suggestion.context?.proposalTitle,
      proposalValue: suggestion.context?.proposalValue,
      proposalViewCount: suggestion.context?.proposalViewCount,
      temperatureScore: suggestion.context?.temperatureScore,
      leadName: suggestion.leadName || undefined,
      channel,
    });

    if (draft) {
      setEditedMessage(draft.draftMessage);
      setAiReasoning(draft.reasoning);
      setIsEditing(true);
    }
  };

  const isApproved = existingFollowup?.status === "approved";
  const hasPreparedMessage = !!existingFollowup?.prepared_message;

  return (
    <Card className={cn("border-2", urgencyColors[suggestion.urgencyLevel])}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <TriggerIcon className="w-4 h-4" />
              {triggerLabels[suggestion.triggerType || "general"]}
            </CardTitle>
            <CardDescription className="text-xs">
              {suggestion.leadName && (
                <span className="font-medium">{suggestion.leadName} · </span>
              )}
              {suggestion.hoursSinceReply}h sem resposta
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            {suggestion.triggerType === "proposal_viewed" && suggestion.context?.proposalViewCount && (
              <Badge variant="outline" className="text-xs py-0 gap-1">
                <Eye className="w-3 h-3" />
                {suggestion.context.proposalViewCount}x
              </Badge>
            )}
            {suggestion.triggerType === "hot_stalled" && suggestion.context?.temperatureScore && (
              <Badge variant="outline" className="text-xs py-0 gap-1 border-red-500/50">
                <Flame className="w-3 h-3 text-red-500" />
                {suggestion.context.temperatureScore}
              </Badge>
            )}
            <Badge className={cn("text-xs", urgencyBadgeColors[suggestion.urgencyLevel])}>
              {suggestion.urgencyLevel === "prepare" && (
                <Sparkles className="w-3 h-3 mr-1" />
              )}
              {suggestion.urgencyLevel === "suggest" && "Sugerir"}
              {suggestion.urgencyLevel === "prepare" && "Preparar"}
              {suggestion.urgencyLevel === "urgent" && "Urgente"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Status message */}
        <p className="text-sm text-muted-foreground">{suggestion.message}</p>

        {/* AI Reasoning */}
        {aiReasoning && isEditing && (
          <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md text-xs">
            <Sparkles className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
            <p className="text-muted-foreground">{aiReasoning}</p>
          </div>
        )}

        {/* Prepared message section */}
        {hasPreparedMessage && !isEditing && (
          <div className="p-3 bg-muted rounded-lg relative">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm whitespace-pre-wrap pr-8">
                {existingFollowup.prepared_message}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 absolute top-2 right-2"
                onClick={() => {
                  setEditedMessage(existingFollowup.prepared_message || "");
                  setIsEditing(true);
                }}
              >
                <Edit3 className="w-3 h-3" />
              </Button>
            </div>
            {isApproved && (
              <div className="flex items-center gap-1 mt-2 text-xs text-green-600 dark:text-green-400">
                <CheckCircle className="w-3 h-3" />
                Aprovada - aguardando envio
              </div>
            )}
          </div>
        )}

        {/* Edit mode */}
        {isEditing && (
          <div className="space-y-2">
            <Textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              placeholder="Escreva a mensagem de follow-up..."
              rows={4}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={!editedMessage.trim() || approveFollowup.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
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

        {/* Action buttons */}
        {!isEditing && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Send button - only if approved */}
            {isApproved && hasPreparedMessage && (
              <Button
                size="sm"
                onClick={handleSend}
                disabled={sendMessage.isPending}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Enviar Agora
              </Button>
            )}

            {/* AI Draft button */}
            {!hasPreparedMessage && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleGenerateAIDraft}
                    disabled={isGeneratingDraft}
                    className="gap-2"
                  >
                    {isGeneratingDraft ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Gerar com IA
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>IA irá redigir follow-up adaptado ao contexto</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Manual prepare button */}
            {!hasPreparedMessage && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Manual
              </Button>
            )}

            {/* Snooze button */}
            <Popover open={showSnoozeMenu} onOpenChange={setShowSnoozeMenu}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <AlarmClock className="w-4 h-4" />
                  Adiar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                    Adiar para:
                  </p>
                  {snoozeOptions.map((option) => (
                    <Button
                      key={option.label}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleSnooze(option.hours)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Dismiss button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="gap-2 text-muted-foreground"
            >
              <X className="w-4 h-4" />
              Descartar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
