import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { FileText, Paperclip, Download, Info, AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageDeliveryStatus, getDeliveryStatus } from "./MessageDeliveryStatus";
import { ResponseInfoSheet } from "./ResponseInfoSheet";
import { cleanEmailPreview } from "@/lib/cleanEmailPreview";
import { WhatsAppProductMessageCard } from "@/components/whatsapp-pro/WhatsAppProductMessageCard";
import { WhatsAppAudioMessageCard } from "@/components/whatsapp-pro/WhatsAppAudioMessageCard";
import { InlineMessageTranslator } from "./InlineMessageTranslator";
interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    direction: "inbound" | "outbound";
    created_at: string;
    read_at?: string | null;
    delivered_at?: string | null;
    sent_at?: string | null;
    status?: string;
    channel_metadata?: Record<string, any>;
    message_type?: string | null;
    product_id?: string | null;
    media_url?: string | null;
    media_mime_type?: string | null;
    conversation_id?: string;
    metadata?: Record<string, any> | null;
  };
  senderName?: string;
  senderAvatar?: string;
  companyName?: string;
  showTimestamp?: boolean;
  onRetry?: (messageContent: string) => void;
  onUseSuggestedReply?: (text: string) => void;
  onCreateTaskFromAudio?: (title: string, description: string, priority: string | null) => void;
}

export function MessageBubble({
  message,
  senderName,
  senderAvatar,
  companyName = "Empresa",
  showTimestamp = true,
  onRetry,
  onUseSuggestedReply,
  onCreateTaskFromAudio,
}: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound";
  const deliveryStatus = getDeliveryStatus(message);
  const isFailed = deliveryStatus === "failed";
  const isAudio = message.message_type === "audio";
  
  // Parse attachments from metadata
  const attachments = message.channel_metadata?.attachments as Array<{
    name?: string;
    url: string;
    type: string;
    ptt?: boolean;
    caption?: string;
  }> | undefined;

  const renderAttachment = (att: { name?: string; url: string; type: string; ptt?: boolean }, idx: number) => {
    if (att.type === "audio") {
      return (
        <div key={idx} className="flex items-center gap-2 w-full">
          <audio
            controls
            preload="metadata"
            src={att.url}
            className="w-full max-w-[260px] h-9"
          >
            <track kind="captions" />
          </audio>
          {att.ptt && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">PTT</span>
          )}
        </div>
      );
    }
    return (
      <Button
        key={idx}
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        asChild
      >
        <a href={att.url} target="_blank" rel="noopener noreferrer">
          {att.type?.includes("pdf") ? (
            <FileText className="w-3.5 h-3.5" />
          ) : (
            <Paperclip className="w-3.5 h-3.5" />
          )}
          <span className="truncate max-w-[120px]">{att.name || "Ficheiro"}</span>
          <Download className="w-3 h-3" />
        </a>
      </Button>
    );
  };

  const formattedTime = format(new Date(message.created_at), "HH:mm", { locale: pt });
  const formattedDate = format(new Date(message.created_at), "d MMM, HH:mm", { locale: pt });

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (isOutbound) {
    // Outbound message (sent by company) - aligned right
    return (
      <div className="flex justify-end mb-3 group">
        <div className="max-w-[78%] flex flex-col items-end">
          {/* Bubble */}
          <div className={cn(
            "rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-sm",
            isFailed
              ? "border border-destructive/50 bg-destructive/5"
              : "bg-primary/10 border border-primary/20 text-foreground"
          )}>
            {isAudio ? (
              <WhatsAppAudioMessageCard
                messageId={message.id}
                conversationId={message.conversation_id ?? ""}
                mediaUrl={message.media_url ?? message.channel_metadata?.attachments?.find((a: any) => a.type?.includes("audio"))?.url}
                isOutbound
              />
            ) : message.message_type === "product" && message.product_id ? (
              <WhatsAppProductMessageCard
                productId={message.product_id}
                caption={message.content}
                metadata={message.metadata ?? undefined}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{cleanEmailPreview(message.content, 5000)}</p>
            )}

            {/* Attachments */}
            {attachments && attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-primary/15">
                {attachments.map((att, idx) => renderAttachment(att, idx))}
              </div>
            )}
          </div>

          {/* Failed indicator */}
          {isFailed && (
            <div className="flex items-center justify-end gap-2 mt-1.5">
              <span className="text-[10px] text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Falha ao enviar
              </span>
              {onRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-destructive hover:text-destructive gap-1"
                  onClick={() => onRetry(message.content)}
                >
                  <RotateCcw className="w-3 h-3" />
                  Reenviar
                </Button>
              )}
            </div>
          )}

          {/* Footer: sender + time + delivery (single source) */}
          {showTimestamp && !isFailed && (
            <div className="flex items-center justify-end gap-1.5 mt-1 px-1 opacity-60 group-hover:opacity-100 transition-opacity">
              <span className="text-[11px] text-muted-foreground">{companyName}</span>
              <span className="text-[11px] text-muted-foreground">·</span>
              <span className="text-[11px] text-muted-foreground">{formattedTime}</span>
              <MessageDeliveryStatus status={deliveryStatus} />
              <ResponseInfoSheet messageId={message.id}>
                <button className="text-muted-foreground hover:text-primary transition-colors">
                  <Info className="w-3 h-3" />
                </button>
              </ResponseInfoSheet>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Inbound message (received) - aligned left
  return (
    <div className="flex gap-3 mb-4">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={senderAvatar} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {senderName ? getInitials(senderName) : "?"}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-foreground">
            {senderName || "Desconhecido"}
          </span>
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
        </div>
        
        {/* Bubble */}
        <div className="bg-muted rounded-2xl rounded-tl-sm p-3 max-w-[85%]">
          {isAudio ? (
            <WhatsAppAudioMessageCard
              messageId={message.id}
              conversationId={message.conversation_id ?? ""}
              mediaUrl={message.media_url ?? message.channel_metadata?.attachments?.find((a: any) => a.type?.includes("audio"))?.url}
              onUseSuggestedReply={onUseSuggestedReply}
              onCreateTask={onCreateTaskFromAudio}
            />
          ) : message.message_type === "product" && message.product_id ? (
            <WhatsAppProductMessageCard
              productId={message.product_id}
              caption={message.content}
              metadata={message.metadata ?? undefined}
            />
          ) : (
            <>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{cleanEmailPreview(message.content, 5000)}</p>
              <InlineMessageTranslator text={message.content} />
            </>
          )}

          {/* Attachments */}
          {attachments && attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
              {attachments.map((att, idx) => renderAttachment(att, idx))}
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        {showTimestamp && (
          <p className="text-xs text-muted-foreground mt-1.5">
            {formattedDate}
          </p>
        )}
      </div>
    </div>
  );
}
