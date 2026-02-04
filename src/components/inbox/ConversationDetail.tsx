import { useState, useEffect, useRef, useMemo } from "react";
import { useConversation, useMarkConversationRead, useUpdateConversationStatus, useAssignConversation } from "@/hooks/useConversations";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { useAgentMembers } from "@/hooks/useWorkspaceMembers";
import { useAuth } from "@/contexts/AuthContext";
import { useOpportunities } from "@/hooks/useOpportunities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { VariableContext } from "@/lib/templateVariables";
import { EnhancedAIReplyPanel } from "./EnhancedAIReplyPanel";
import { ConversationClassification } from "./ConversationClassification";
import { InboxActionsMenu } from "./InboxActionsMenu";
import { InboxSafetyIndicator } from "./InboxSafetyIndicator";
import { ConversationTemperature } from "./ConversationTemperature";
import { ConversationAutopilotToggle } from "./ConversationAutopilotToggle";
import { ConversationStatusBanner } from "./ConversationStatusBanner";
import { AIActionSuggestions } from "./AIActionSuggestions";
import { useInboxActionSuggestions } from "@/hooks/useInboxActionSuggestions";
import { EmailMessageBubble } from "./EmailMessageBubble";
import { AIMessageComposer, AIMessageComposerRef } from "./AIMessageComposer";
import { CreateProposalDialog } from "@/components/proposals/CreateProposalDialog";
import { Separator } from "@/components/ui/separator";
import { LeadData, OpportunityData } from "@/hooks/useInboxAI";
import { UnifiedActivityLog } from "@/components/crm/UnifiedActivityLog";
import { useProposals } from "@/hooks/useProposals";
import { calculateTemperature } from "@/lib/conversationTemperature";
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
  const { data: agents } = useAgentMembers();
  const { data: opportunities } = useOpportunities();
  const { data: proposals } = useProposals();
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();
  const updateStatus = useUpdateConversationStatus();
  const assignConversation = useAssignConversation();

  const [showAIAssistant, setShowAIAssistant] = useState(true);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [dismissedOpportunityBanner, setDismissedOpportunityBanner] = useState(false);
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
      stage: opp.stage_id, // Could enhance by fetching stage name
      status: opp.status,
    };
  }, [conversation?.lead_id, opportunities]);

  // Calculate proposal data for AI suggestions
  const leadOpportunities = useMemo(() => 
    opportunities?.filter(o => o.lead_id === conversation?.lead_id) || []
  , [opportunities, conversation?.lead_id]);

  const proposalData = useMemo(() => {
    const leadProposals = proposals?.filter(p => 
      leadOpportunities.some(o => o.id === p.opportunity_id)
    ) || [];
    return {
      count: leadProposals.length,
      hasAccepted: leadProposals.some(p => p.status === "accepted"),
      hasPending: leadProposals.some(p => p.status === "published"),
    };
  }, [proposals, leadOpportunities]);

  // Calculate conversation data for AI suggestions
  const conversationDataForAI = useMemo(() => {
    if (!conversation) return undefined;
    const hoursSinceLastMessage = conversation.last_message_at 
      ? Math.floor((Date.now() - new Date(conversation.last_message_at).getTime()) / (1000 * 60 * 60))
      : 0;
    const temp = messages && messages.length > 0 
      ? calculateTemperature({
          ...conversation,
          messages: messages || [],
          opportunities: leadOpportunities.filter(o => o.status === "open").map(o => ({ id: o.id, status: o.status, value: o.value })),
        }).score
      : 0;
    return {
      channel: conversation.channel,
      status: conversation.status,
      assignedTo: conversation.assigned_to || undefined,
      hoursSinceLastMessage,
      temperature: temp,
    };
  }, [conversation, messages, leadOpportunities]);

  // Get AI action suggestions with opportunity trigger detection
  const { opportunityTrigger } = useInboxActionSuggestions({
    conversationId,
    messages,
    leadData,
    opportunityData,
    proposalData,
    conversationData: conversationDataForAI,
  });

  // Reset dismissed banner when conversation changes
  useEffect(() => {
    setDismissedOpportunityBanner(false);
  }, [conversationId]);

  // Handler for proposal click from AI suggestions
  const handleProposalClick = (opportunityId: string) => {
    setSelectedOpportunityId(opportunityId);
    setShowProposalDialog(true);
  };

  // Handler for reply focus from AI suggestions
  const handleFocusReply = () => {
    composerRef.current?.focus();
  };

  // Handler for inserting AI reply
  const handleInsertReply = (text: string) => {
    composerRef.current?.setMessage(text);
  };

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
      await sendMessage.mutateAsync({
        conversationId,
        content,
      });
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

  const handleAssign = async (userId: string) => {
    if (!conversationId) return;
    try {
      await assignConversation.mutateAsync({
        conversationId,
        assignTo: userId || null,
      });
      toast.success("Conversa atribuída");
    } catch (error) {
      toast.error("Falha ao atribuir conversa");
    }
  };

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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ChannelIcon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-foreground text-sm">
              {conversation.lead?.name || conversation.external_thread_id || "Desconhecido"}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="capitalize">{conversation.channel}</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  conversation.status === "open" && "border-green-500 text-green-500",
                  conversation.status === "closed" && "border-muted-foreground",
                  conversation.status === "archived" && "border-amber-500 text-amber-500"
                )}
              >
                {conversation.status === "open" ? "Aberta" : 
                 conversation.status === "closed" ? "Fechada" : "Arquivada"}
              </Badge>
              {/* Temperature badge in header */}
              <ConversationTemperature 
                conversation={{ 
                  ...conversation, 
                  messages: messages || [],
                  opportunities: opportunities?.filter(o => o.lead_id === conversation.lead_id && o.status === "open") || [],
                }}
                variant="badge"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Per-Conversation Autopilot Toggle */}
          <ConversationAutopilotToggle conversationId={conversationId} compact />

          {/* AI Toggle */}
          <Button
            variant={showAIAssistant ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowAIAssistant(!showAIAssistant)}
            className="gap-1"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">AI</span>
          </Button>

          {/* Assign */}
          <Select
            value={conversation.assigned_to || "unassigned"}
            onValueChange={handleAssign}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Atribuir..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Não atribuído</SelectItem>
              {agents?.map((agent) => (
                <SelectItem key={agent.user_id} value={agent.user_id}>
                  {agent.profile?.full_name || agent.profile?.email || "Agente"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Safety Indicator */}
          <InboxSafetyIndicator conversationId={conversationId} />

          {/* Inbox Actions */}
          <InboxActionsMenu
            conversationId={conversationId}
            leadId={conversation.lead_id}
            leadName={conversation.lead?.name || null}
            currentPriority={conversation.user_priority || conversation.ai_priority}
          />

          {/* Quick Status Actions */}
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

      {/* Consolidated Status Banner - Single compact banner */}
      <ConversationStatusBanner
        conversation={conversation}
        messages={messages}
        opportunityTrigger={opportunityTrigger}
      />

      {/* Messages Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Chat Messages */}
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
              <div className="space-y-3">
                {messages.map((message) => (
                  conversation.channel === "email" ? (
                    <EmailMessageBubble key={message.id} message={message} />
                  ) : (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.direction === "outbound" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-lg px-3 py-2",
                          message.direction === "outbound"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p
                          className={cn(
                            "text-[10px] mt-1",
                            message.direction === "outbound"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          )}
                        >
                          {format(new Date(message.sent_at), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  )
                ))}
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

        {/* AI Assistant Panel */}
        {showAIAssistant && messages && messages.length > 0 && (
          <div className="w-80 border-l border-border bg-muted/20 hidden lg:flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* AI Action Suggestions */}
              <AIActionSuggestions
                conversationId={conversationId}
                messages={messages}
                leadId={conversation.lead_id || undefined}
                leadData={leadData}
                opportunityData={opportunityData}
                proposalData={proposalData}
                conversationData={conversationDataForAI}
                onReplyClick={handleFocusReply}
                onProposalClick={handleProposalClick}
              />

              <Separator className="my-2" />

              {/* AI Classification */}
              <ConversationClassification
                conversationId={conversationId}
                leadId={conversation.lead_id}
                messages={messages.map(m => ({
                  direction: m.direction,
                  content: m.content,
                }))}
                leadName={conversation.lead?.name}
                channel={conversation.channel}
                aiPriority={conversation.ai_priority}
                aiIntent={conversation.ai_intent}
                aiSentiment={conversation.ai_sentiment}
                userPriority={conversation.user_priority}
                userIntent={conversation.user_intent}
                classificationConfirmed={conversation.classification_confirmed}
              />

              <Separator className="my-2" />

              {/* Enhanced AI Reply Panel */}
              <EnhancedAIReplyPanel
                messages={messages}
                leadData={leadData}
                opportunityData={opportunityData}
                channel={conversation.channel}
                onInsertReply={handleInsertReply}
              />

              <Separator className="my-2" />

              {/* Unified Activity Log */}
              <UnifiedActivityLog
                conversationId={conversationId}
                leadId={conversation.lead_id || undefined}
                compact
                limit={10}
              />
            </div>
          </div>
        )}
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
