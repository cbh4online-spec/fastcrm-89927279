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
  Clock,
  Send,
  X,
  AlarmClock,
  Sparkles,
  CheckCircle,
  Edit3,
} from "lucide-react";
import { addHours, addDays, format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  ConversationFollowup,
  FollowupSuggestion,
  useSnoozeFollowup,
  useDismissFollowup,
  useApproveFollowup,
} from "@/hooks/useFollowups";
import { useSendMessage } from "@/hooks/useMessages";
import { useMarkFollowupSent } from "@/hooks/useFollowups";
import { cn } from "@/lib/utils";

interface FollowupSuggestionCardProps {
  suggestion: FollowupSuggestion;
  existingFollowup?: ConversationFollowup;
  onSent?: () => void;
}

const snoozeOptions = [
  { label: "1 hora", hours: 1 },
  { label: "2 horas", hours: 2 },
  { label: "4 horas", hours: 4 },
  { label: "Amanhã", hours: 24 },
  { label: "2 dias", hours: 48 },
];

export function FollowupSuggestionCard({
  suggestion,
  existingFollowup,
  onSent,
}: FollowupSuggestionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(
    existingFollowup?.prepared_message || ""
  );
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  const snoozeFollowup = useSnoozeFollowup();
  const dismissFollowup = useDismissFollowup();
  const approveFollowup = useApproveFollowup();
  const sendMessage = useSendMessage();
  const markSent = useMarkFollowupSent();

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

  const isApproved = existingFollowup?.status === "approved";
  const hasPreparedMessage = !!existingFollowup?.prepared_message;

  return (
    <Card className={cn("border-2", urgencyColors[suggestion.urgencyLevel])}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Follow-up Sugerido
            </CardTitle>
            <CardDescription className="text-xs">
              {suggestion.leadName && (
                <span className="font-medium">{suggestion.leadName} · </span>
              )}
              {suggestion.hoursSinceReply}h sem resposta
            </CardDescription>
          </div>
          <Badge className={cn("text-xs", urgencyBadgeColors[suggestion.urgencyLevel])}>
            {suggestion.urgencyLevel === "prepare" && (
              <Sparkles className="w-3 h-3 mr-1" />
            )}
            {suggestion.urgencyLevel === "suggest" && "Sugerir"}
            {suggestion.urgencyLevel === "prepare" && "Preparar"}
            {suggestion.urgencyLevel === "urgent" && "Urgente"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Status message */}
        <p className="text-sm text-muted-foreground">{suggestion.message}</p>

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
                onClick={() => setIsEditing(false)}
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

            {/* Edit/Prepare button */}
            {!hasPreparedMessage && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Preparar Mensagem
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
