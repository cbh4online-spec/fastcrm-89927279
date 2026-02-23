import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MessageSquare, Mail, Phone, Instagram, MessageCircle, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LinkedConversationsCardProps {
  entityType: 'lead' | 'contact' | 'company';
  entityId: string;
}

const channelIcons: Record<string, React.ElementType> = {
  email: Mail,
  whatsapp: Phone,
  instagram: Instagram,
  sms: MessageCircle,
};

const channelLabels: Record<string, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  sms: 'SMS',
};

export function LinkedConversationsCard({ entityType, entityId }: LinkedConversationsCardProps) {
  const navigate = useNavigate();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['entity-conversations', entityType, entityId],
    queryFn: async () => {
      const column = entityType === 'lead' ? 'lead_id'
        : entityType === 'contact' ? 'contact_id'
        : 'company_id';

      const { data, error } = await supabase
        .from('conversations')
        .select('id, channel, last_message_preview, last_message_at, last_message_direction, status')
        .eq(column, entityId)
        .order('last_message_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!entityId,
  });

  const handleOpenConversation = (conversationId: string) => {
    navigate(`/dashboard/inbox?conversation=${conversationId}`);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Histórico Recente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !conversations?.length ? (
          <div className="text-center py-4 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Nenhuma conversa associada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const ChannelIcon = channelIcons[conv.channel] || MessageSquare;
              const isOutbound = conv.last_message_direction === 'outbound';

              return (
                <button
                  key={conv.id}
                  onClick={() => handleOpenConversation(conv.id)}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-muted/50 transition-colors group flex items-start gap-2.5"
                >
                  <ChannelIcon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {channelLabels[conv.channel] || conv.channel}
                      </Badge>
                      {conv.last_message_at && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: pt })}
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      "text-xs truncate",
                      conv.status === 'open' ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {isOutbound && <span className="text-muted-foreground">Tu: </span>}
                      {conv.last_message_preview || "Sem mensagens"}
                    </p>
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
