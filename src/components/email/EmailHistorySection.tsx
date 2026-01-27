import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  ChevronDown,
  ChevronUp,
  Inbox,
  Send,
  Clock,
  User,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useContactEmailHistory, EmailConversationWithMessages } from "@/hooks/useContactEmailHistory";
import { Message } from "@/hooks/useMessages";

interface EmailHistorySectionProps {
  entityType: "contact" | "lead" | "company";
  entityId: string;
  entityEmail?: string;
  maxHeight?: string;
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === "outbound";
  
  return (
    <div className={cn("flex gap-2", isOutbound ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isOutbound ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {isOutbound ? <Send className="w-4 h-4" /> : <Inbox className="w-4 h-4" />}
      </div>
      <div className={cn(
        "flex-1 max-w-[85%] rounded-lg p-3",
        isOutbound 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted"
      )}>
        {message.email_subject && (
          <div className={cn(
            "text-xs font-medium mb-1 opacity-80",
            isOutbound ? "text-primary-foreground" : "text-muted-foreground"
          )}>
            {message.email_subject}
          </div>
        )}
        <div 
          className="text-sm whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ 
            __html: message.content.replace(/\n/g, "<br>") 
          }}
        />
        <div className={cn(
          "text-[10px] mt-2 flex items-center gap-1",
          isOutbound ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
        )}>
          <Clock className="w-3 h-3" />
          {format(new Date(message.sent_at), "d MMM yyyy, HH:mm", { locale: pt })}
        </div>
      </div>
    </div>
  );
}

function ConversationThread({ conversation }: { conversation: EmailConversationWithMessages }) {
  const [isOpen, setIsOpen] = useState(false);
  const messageCount = conversation.messages.length;
  const lastMessage = conversation.messages[messageCount - 1];
  const firstMessage = conversation.messages[0];
  
  // Get subject from first message or channel metadata
  const subject = firstMessage?.email_subject || 
    (conversation.channel_metadata?.subject as string) || 
    "Sem assunto";
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors group">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">
                {subject}
              </span>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {messageCount} {messageCount === 1 ? "msg" : "msgs"}
              </Badge>
            </div>
            {lastMessage && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {lastMessage.content.substring(0, 150)}...
              </p>
            )}
            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {conversation.last_message_at && format(
                new Date(conversation.last_message_at), 
                "d MMM yyyy, HH:mm",
                { locale: pt }
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-12 pr-3 pb-3 space-y-3">
          <Separator className="my-2" />
          {conversation.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function EmailHistorySection({
  entityType,
  entityId,
  entityEmail,
  maxHeight = "400px",
}: EmailHistorySectionProps) {
  const { data: conversations, isLoading } = useContactEmailHistory(entityType, entityId);
  
  const totalMessages = (conversations || []).reduce(
    (acc, conv) => acc + conv.messages.length,
    0
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Histórico de Emails</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum email encontrado</p>
            {entityEmail && (
              <p className="text-xs mt-1">
                Envie o primeiro email para {entityEmail}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Histórico de Emails</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {totalMessages} {totalMessages === 1 ? "mensagem" : "mensagens"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }} className="px-4">
          <div className="space-y-1 pb-4">
            {conversations.map((conversation) => (
              <ConversationThread 
                key={conversation.id} 
                conversation={conversation} 
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
