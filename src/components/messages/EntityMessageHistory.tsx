import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MessageSquare,
  Mail,
  Phone,
  Instagram,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/formatters";
import { useEntityMessages, EntityConversation } from "@/hooks/useEntityMessages";

interface EntityMessageHistoryProps {
  entityType: 'lead' | 'contact' | 'company';
  entityId: string;
}

const channelConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  email: { icon: Mail, label: 'Email', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  whatsapp: { icon: Phone, label: 'WhatsApp', color: 'bg-green-500/10 text-green-600 border-green-500/30' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'bg-pink-500/10 text-pink-600 border-pink-500/30' },
  sms: { icon: MessageCircle, label: 'SMS', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
};

function ConversationThread({ conversation }: { conversation: EntityConversation }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const config = channelConfig[conversation.channel] || { icon: MessageSquare, label: conversation.channel, color: 'bg-muted text-muted-foreground' };
  const ChannelIcon = config.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors flex items-center gap-3">
          <ChannelIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.color)}>
                {config.label}
              </Badge>
              {conversation.unread_count > 0 && (
                <Badge className="text-[10px] px-1.5 py-0 bg-primary">
                  {conversation.unread_count} nova{conversation.unread_count > 1 ? 's' : ''}
                </Badge>
              )}
              {conversation.last_message_at && (
                <span className="text-[10px] text-muted-foreground">
                  {formatRelativeTime(conversation.last_message_at)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {conversation.last_message_preview || "Sem mensagens"}
            </p>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
            isOpen && "rotate-180"
          )} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-4 pr-2 py-2 space-y-1.5 border-l-2 border-muted ml-5 mt-1">
          {conversation.messages.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Sem mensagens</p>
          ) : (
            conversation.messages.map((msg) => {
              const isOutbound = msg.direction === 'outbound';
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2 items-start",
                    isOutbound && "flex-row-reverse"
                  )}
                >
                  <div className={cn(
                    "max-w-[85%] px-3 py-1.5 rounded-lg text-xs",
                    isOutbound
                      ? "bg-primary/10 text-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  )}>
                    {msg.email_subject && (
                      <p className="font-medium text-[10px] text-muted-foreground mb-0.5">
                        {msg.email_subject}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                      {formatRelativeTime(msg.sent_at)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs gap-1 mt-1"
            onClick={() => navigate(`/dashboard/inbox?conversation=${conversation.id}`)}
          >
            <ExternalLink className="h-3 w-3" />
            Ver no Inbox
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function EntityMessageHistory({ entityType, entityId }: EntityMessageHistoryProps) {
  const { data: conversations, isLoading } = useEntityMessages(entityType, entityId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Mensagens Trocadas
          {conversations && conversations.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {conversations.length} conversa{conversations.length > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !conversations?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhuma mensagem trocada</p>
            <p className="text-xs mt-1">As conversas associadas aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <ConversationThread key={conv.id} conversation={conv} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
