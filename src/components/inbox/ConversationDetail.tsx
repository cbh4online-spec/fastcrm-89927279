import { useState, useEffect, useRef, useMemo } from "react";
import { useConversation, useMarkConversationRead, useUpdateConversationStatus, useAssignConversation } from "@/hooks/useConversations";
import { isToday, isYesterday, format as formatDateFns, isSameDay } from "date-fns";
import { pt } from "date-fns/locale";
import { MessageBubble } from "./MessageBubble";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { useOpportunities } from "@/hooks/useOpportunities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  CheckCircle,
  Archive,
  XCircle,
  Mail,
  Phone,
  MessageSquare,
  Instagram,
  Facebook,
  Globe,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { VariableContext } from "@/lib/templateVariables";
import { EmailMessageBubble } from "./EmailMessageBubble";
import { AIMessageComposer, AIMessageComposerRef } from "./AIMessageComposer";
import { CreateProposalDialog } from "@/components/proposals/CreateProposalDialog";
import { LeadData, OpportunityData } from "@/hooks/useInboxAI";
import { PriorityScoreBadge } from "./PriorityScoreBadge";
import { useAuth } from "@/contexts/AuthContext";
// Design System imports
import { EmptyState, LoadingSpinner } from "@/components/design-system";

const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  whatsapp: Phone,
  email: Mail,
  sms: MessageSquare,
  webchat: Globe,
  instagram: Instagram,
  facebook: Facebook,
  ghl: MessageSquare,
  other: MessageSquare,
};

interface ConversationDetailProps {
  conversationId: string | null;
}

export function ConversationDetail({ conversationId }: ConversationDetailProps) {
  const { user } = useAuth();
  const { data: conversation, isLoading: convLoading } = useConversation(conversationId || undefined);
  const { data: messages, isLoading: messagesLoading } = useMessages(conversationId || undefined);
  const { data: opportunities } = useOpportunities();
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();
  const updateStatus = useUpdateConversationStatus();

  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<AIMessageComposerRef>(null);

  // Build lead data for AI
  const leadData: LeadData | undefined = useMemo(() => {
    if (!conversation?.lead) return undefined;
    return {
      id: conversation.lead.id,
      name: conversation.lead.name,
      email: conversation.lead.email || undefined,
      phone: conversation.lead.phone || undefined,
      status: (conversation.lead as any).status || undefined,
      source: (conversation.lead as any).source || undefined,
      tags: (conversation.lead as any).tags || undefined,
    };
  }, [conversation?.lead]);

  // Find opportunity linked to this lead
  const opportunityData: OpportunityData | undefined = useMemo(() => {
    if (!conversation?.lead_id || !opportunities) return undefined;
    const opp = opportunities.find(o => o.lead_id === conversation.lead_id);
    if (!opp) return undefined;
    return {
      id: opp.id,
      title: opp.title,
      value: opp.value,
      stage: opp.stage_id,
      status: opp.status,
    };
  }, [conversation?.lead_id, opportunities]);

  // Build template context from conversation
  const templateContext: VariableContext = {
    lead: conversation?.lead ? {
      id: conversation.lead.id,
      name: conversation.lead.name,
      email: conversation.lead.email || undefined,
      phone: conversation.lead.phone || undefined,
    } : null,
    user: user ? {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Utilizador',
      email: user.email,
    } : null,
  };

  // Handle sending message
  const handleSendMessage = async (content: string) => {
    if (!conversationId) return;
    try {
      await sendMessage.mutateAsync({ conversationId, content });
    } catch (error) {
      toast.error("Falha ao enviar mensagem");
    }
  };

  // Mark as read when viewing
  useEffect(() => {
    if (conversation && conversation.unread_count > 0) {
      markRead.mutate(conversation.id);
    }
  }, [conversation?.id, conversation?.unread_count]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStatusChange = async (status: "open" | "closed" | "archived") => {
    if (!conversationId) return;
    try {
      await updateStatus.mutateAsync({ conversationId, status });
      toast.success(status === "closed" ? "Conversa fechada" : status === "archived" ? "Conversa arquivada" : "Conversa reaberta");
    } catch (error) {
      toast.error("Falha ao atualizar estado");
    }
  };

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <EmptyState
          type="messages"
          title="Nenhuma conversa selecionada"
          description="Selecione uma conversa da lista para ver as mensagens"
        />
      </div>
    );
  }

  if (convLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="lg" label="A carregar conversa..." />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Conversa não encontrada</p>
      </div>
    );
  }

  const ChannelIcon = channelIcons[conversation.channel] || MessageSquare;
  const priorityScore = (conversation as any).conversation_priority_score || 0;
  const simplifiedStatus = (conversation as any).conversation_status_simplified;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Compact Header */}
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <ChannelIcon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm truncate">
                {conversation.lead?.name || conversation.external_thread_id || "Desconhecido"}
              </h3>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 flex-shrink-0",
                  conversation.status === "open" && "border-green-500/50 text-green-600",
                  conversation.status === "closed" && "border-muted-foreground/50",
                  conversation.status === "archived" && "border-amber-500/50 text-amber-600"
                )}
              >
                {conversation.status === "open" ? "Aberta" :
                 conversation.status === "closed" ? "Fechada" : "Arquivada"}
              </Badge>
              {priorityScore > 0 && <PriorityScoreBadge score={priorityScore} />}
            </div>
            <span className="text-xs text-muted-foreground capitalize">{conversation.channel}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange("open")}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar como Aberta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("closed")}>
                <XCircle className="w-4 h-4 mr-2" />
                Fechar Conversa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleStatusChange("archived")}>
                <Archive className="w-4 h-4 mr-2" />
                Arquivar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !messages?.length ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Sem mensagens
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message, index) => {
                const msgDate = new Date(message.created_at || message.sent_at);
                const prevDate = index > 0 ? new Date(messages[index - 1].created_at || messages[index - 1].sent_at) : null;
                const showDateSeparator = !prevDate || !isSameDay(msgDate, prevDate);

                const getDateLabel = (date: Date) => {
                  if (isToday(date)) return "Hoje";
                  if (isYesterday(date)) return "Ontem";
                  return formatDateFns(date, "d MMM yyyy", { locale: pt });
                };

                if (conversation.channel === "email") {
                  return (
                    <div key={message.id}>
                      {showDateSeparator && (
                        <div className="flex items-center gap-3 py-3">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {getDateLabel(msgDate)}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      )}
                      <EmailMessageBubble message={message} />
                    </div>
                  );
                }

                return (
                  <div key={message.id}>
                    {showDateSeparator && (
                      <div className="flex items-center gap-3 py-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {getDateLabel(msgDate)}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <MessageBubble
                      message={{
                        id: message.id,
                        content: message.content,
                        direction: message.direction as "inbound" | "outbound",
                        created_at: message.created_at || message.sent_at,
                        read_at: message.read_at,
                        delivered_at: message.delivered_at,
                        sent_at: message.sent_at,
                      }}
                      senderName={
                        message.direction === "inbound"
                          ? conversation.lead?.name || "Desconhecido"
                          : undefined
                      }
                      companyName="Você"
                      showTimestamp={true}
                    />
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* AI Message Composer */}
        <AIMessageComposer
          ref={composerRef}
          conversationId={conversationId}
          messages={messages || []}
          leadData={leadData}
          opportunityData={opportunityData}
          channel={conversation.channel}
          templateContext={templateContext}
          onSend={handleSendMessage}
          isSending={sendMessage.isPending}
        />
      </div>

      {/* Create Proposal Dialog */}
      {selectedOpportunityId && (
        <CreateProposalDialog
          open={showProposalDialog}
          onOpenChange={(open) => {
            setShowProposalDialog(open);
            if (!open) setSelectedOpportunityId(null);
          }}
          opportunityId={selectedOpportunityId}
        />
      )}
    </div>
  );
}
