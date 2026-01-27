import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Check, CheckCheck, FileText, Paperclip, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    direction: "inbound" | "outbound";
    created_at: string;
    read_at?: string | null;
    channel_metadata?: Record<string, any>;
  };
  senderName?: string;
  senderAvatar?: string;
  companyName?: string;
  showTimestamp?: boolean;
}

export function MessageBubble({
  message,
  senderName,
  senderAvatar,
  companyName = "Empresa",
  showTimestamp = true,
}: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound";
  const isRead = !!message.read_at;
  
  // Parse attachments from metadata
  const attachments = message.channel_metadata?.attachments as Array<{
    name: string;
    url: string;
    type: string;
  }> | undefined;

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
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%]">
          {/* Header */}
          <div className="flex items-center justify-end gap-2 mb-1">
            <span className="text-xs font-medium text-foreground">{companyName}</span>
            {isRead ? (
              <CheckCheck className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Check className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
          
          {/* Bubble */}
          <div className="bg-card border border-border rounded-2xl rounded-tr-sm p-3">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
            
            {/* Attachments */}
            {attachments && attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                {attachments.map((att, idx) => (
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
                      <span className="truncate max-w-[120px]">{att.name}</span>
                      <Download className="w-3 h-3" />
                    </a>
                  </Button>
                ))}
              </div>
            )}
          </div>
          
          {/* Timestamp */}
          {showTimestamp && (
            <p className="text-[10px] text-muted-foreground mt-1 text-right">
              Mensagem Enviada {formattedDate}
            </p>
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
          <span className="text-[10px] text-muted-foreground">{formattedTime}</span>
        </div>
        
        {/* Bubble */}
        <div className="bg-muted rounded-2xl rounded-tl-sm p-3 max-w-[85%]">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          
          {/* Attachments */}
          {attachments && attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
              {attachments.map((att, idx) => (
                <Button
                  key={idx}
                  variant="secondary"
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
                    <span className="truncate max-w-[120px]">{att.name}</span>
                  </a>
                </Button>
              ))}
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        {showTimestamp && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Mensagem Recebida {formattedDate}
          </p>
        )}
      </div>
    </div>
  );
}
