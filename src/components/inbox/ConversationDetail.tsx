import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useConversation, useMarkConversationRead, useUpdateConversationStatus, useAssignConversation } from "@/hooks/useConversations";
import { isToday, isYesterday, format as formatDateFns, isSameDay, differenceInHours, differenceInMinutes } from "date-fns";
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
  Clock,
  UserPlus,
  ArrowLeft,
  MousePointerClick,
  CalendarClock,
} from "lucide-react";
import { WhatsAppInteractiveButtonsDialog } from "./WhatsAppInteractiveButtonsDialog";
import { useCreateLead } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { VariableContext } from "@/lib/templateVariables";
import { EmailMessageBubble } from "./EmailMessageBubble";
import { AIMessageComposer, AIMessageComposerRef } from "./AIMessageComposer";
import { InstagramWindowAlert } from "./InstagramWindowAlert";
import { CreateProposalDialog } from "@/components/proposals/CreateProposalDialog";
import { ScheduleAppointmentDialog } from "@/components/whatsapp-pro/ScheduleAppointmentDialog";
import { CreateTicketFromConversationDialog } from "@/components/whatsapp-pro/CreateTicketFromConversationDialog";
import { LifeBuoy } from "lucide-react";
import { AssignConversationButton } from "@/components/team-inbox/AssignConversationButton";
import { ConversationPrivacyPopover } from "./ConversationPrivacyPopover";
import { LeadData, OpportunityData } from "@/hooks/useInboxAI";
import { PriorityScoreBadge } from "./PriorityScoreBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { useWorkspace } from "@/contexts/WorkspaceContext";
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
  onBack?: () => void;
}

export function ConversationDetail({ conversationId, onBack }: ConversationDetailProps) {
  const { user } = useAuth();
  const workspaceCtx = useWorkspace();
  const currentWorkspace = workspaceCtx?.currentWorkspace;
  const { data: conversation, isLoading: convLoading } = useConversation(conversationId || undefined);
  const { data: messages, isLoading: messagesLoading } = useMessages(conversationId || undefined);
  const { data: opportunities } = useOpportunities();
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();
  const updateStatus = useUpdateConversationStatus();
  const { trackConversationOpened } = useCRMAnalytics();
  const createLead = useCreateLead();

  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [igWindowExpired, setIgWindowExpired] = useState(false);
  const [showButtonsDialog, setShowButtonsDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<AIMessageComposerRef>(null);
  const trackedConvId = useRef<string | null>(null);

  // ── Analytics: conversation.opened ──
  useEffect(() => {
    if (!conversation || trackedConvId.current === conversation.id) return;
    trackedConvId.current = conversation.id;

    const priorityScore = (conversation as any).conversation_priority_score || 0;
    trackConversationOpened({
      priority_score: priorityScore,
      sla_risk: priorityScore > 70,
      pipeline_stage: undefined,
      potential_value: 0,
      conversion_probability: 0,
      channel: conversation.channel,
    });
  }, [conversation, trackConversationOpened]);

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
    workspace: currentWorkspace ? {
      name: currentWorkspace.name || undefined,
    } : null,
  };

  // Handle sending message
  const handleSendMessage = async (content: string) => {
    if (!conversationId) return;
    try {
      await sendMessage.mutateAsync({ conversationId, content });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Falha ao enviar mensagem";
      toast.error(msg);
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

  const handleStatusChange = async (status: "open" | "closed" | "pending" | "archived") => {
    if (!conversationId) return;
    try {
      await updateStatus.mutateAsync({ conversationId, status });
      const labels: Record<string, string> = {
        open: "Conversa reaberta",
        closed: "Conversa fechada",
        pending: "Conversa marcada como pendente",
        archived: "Conversa arquivada",
      };
      toast.success(labels[status]);
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
    <div className="h-full min-h-0 min-w-0 flex flex-col bg-background">
      {/* Compact Header */}
      <div className="px-2 md:px-4 py-2.5 border-b border-border flex flex-shrink-0 items-center justify-between bg-card">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 w-8 p-0 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <ChannelIcon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm truncate">
                {conversation.lead?.name || (conversation as any).contact?.name || ((conversation as any).channel_metadata as any)?.from_name || ((conversation as any).channel_metadata as any)?.from_email || conversation.external_thread_id || "Desconhecido"}
              </h3>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 flex-shrink-0",
                  conversation.status === "open" && "border-green-500/50 text-green-600",
                  conversation.status === "pending" && "border-amber-500/50 text-amber-600",
                  conversation.status === "closed" && "border-muted-foreground/50",
                  conversation.status === "archived" && "border-amber-500/50 text-amber-600"
                )}
              >
                {conversation.status === "open" ? "Aberta" :
                 conversation.status === "pending" ? "Pendente" :
                 conversation.status === "closed" ? "Fechada" : "Arquivada"}
              </Badge>
              {priorityScore > 0 && <PriorityScoreBadge score={priorityScore} />}
              {/* Unknown contact: show create lead button */}
              {!conversation.lead && !conversation.contact_id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 text-[10px] px-2 gap-1"
                  disabled={createLead.isPending}
                  onClick={() => {
                    const meta = (conversation as any).channel_metadata || {};
                    const email = meta?.email || meta?.from_email ||
                                  conversation.external_thread_id || '';
                    createLead.mutate({
                      name: email.split('@')[0] || 'Novo Lead',
                      email: email || undefined,
                      source: conversation.channel,
                    }, {
                      onSuccess: () => toast.success("Lead criado com sucesso"),
                      onError: (err: any) => {
                        if (err?.message === "DUPLICATE_EMAIL") {
                          toast.error("Já existe um lead com este email.");
                        } else {
                          toast.error("Erro ao criar lead");
                        }
                      },
                    });
                  }}
                >
                  <UserPlus className="w-3 h-3" />
                  Criar Lead
                </Button>
              )}
            </div>
            <span className="text-xs text-muted-foreground capitalize">{conversation.channel}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <AssignConversationButton
            conversationId={conversation.id}
            currentAssigneeId={conversation.assigned_to}
            variant="icon"
          />
          {conversation.channel === "whatsapp" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowScheduleDialog(true)}
              title="Agendar interação com este contacto"
            >
              <CalendarClock className="w-4 h-4" />
              <span className="hidden sm:inline">Agendar</span>
            </Button>
          )}
          {conversation.channel === "whatsapp" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowTicketDialog(true)}
              title="Criar ticket de suporte a partir desta conversa"
            >
              <LifeBuoy className="w-4 h-4" />
              <span className="hidden sm:inline">Ticket</span>
            </Button>
          )}
          {conversation.channel === "whatsapp" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowButtonsDialog(true)}
              title="Enviar mensagem com botões interativos"
            >
              <MousePointerClick className="w-4 h-4" />
              <span className="hidden sm:inline">Botões</span>
            </Button>
          )}
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
              <DropdownMenuItem onClick={() => handleStatusChange("pending")}>
                <Clock className="w-4 h-4 mr-2" />
                Marcar como Pendente
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
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <InstagramWindowAlert
          messages={messages || []}
          channel={conversation.channel}
          onExpiredChange={setIgWindowExpired}
        />
        <ScrollArea className="flex-1 min-h-0">
          {messagesLoading ? (
            <div className="flex items-center justify-center p-4 py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !messages?.length ? (
            <div className="flex items-center justify-center p-4 py-8 text-muted-foreground">
              Sem mensagens
            </div>
          ) : (
            <div className="space-y-2 p-4 md:p-6 min-w-0 max-w-3xl mx-auto w-full">
              {messages.map((message, index) => {
                const msgDate = new Date(message.created_at || message.sent_at);
                const prevDate = index > 0 ? new Date(messages[index - 1].created_at || messages[index - 1].sent_at) : null;
                const showDateSeparator = !prevDate || !isSameDay(msgDate, prevDate);

                // Time gap separator (2+ hours between messages on same day)
                const showTimeGap = prevDate && isSameDay(msgDate, prevDate) && differenceInHours(msgDate, prevDate) >= 2;
                const gapHours = prevDate ? differenceInHours(msgDate, prevDate) : 0;
                const gapMinutes = prevDate ? differenceInMinutes(msgDate, prevDate) : 0;
                const gapLabel = gapHours >= 1
                  ? `${gapHours}h depois`
                  : `${gapMinutes}min depois`;

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
                      {showTimeGap && !showDateSeparator && (
                        <div className="flex items-center gap-3 py-2">
                          <div className="flex-1 h-px bg-border/50" />
                          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {gapLabel}
                          </span>
                          <div className="flex-1 h-px bg-border/50" />
                        </div>
                      )}
                      <EmailMessageBubble message={message} channelMetadata={(conversation as any).channel_metadata as Record<string, unknown> | null} />
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
                    {showTimeGap && !showDateSeparator && (
                      <div className="flex items-center gap-3 py-2">
                        <div className="flex-1 h-px bg-border/50" />
                        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {gapLabel}
                        </span>
                        <div className="flex-1 h-px bg-border/50" />
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
                        message_type: (message as { message_type?: string | null }).message_type ?? null,
                        product_id: (message as { product_id?: string | null }).product_id ?? null,
                        media_url: (message as { media_url?: string | null }).media_url ?? null,
                        media_mime_type: (message as { media_mime_type?: string | null }).media_mime_type ?? null,
                        conversation_id: conversationId,
                        metadata: (message as { metadata?: Record<string, unknown> | null }).metadata ?? null,
                      }}
                      senderName={
                        message.direction === "inbound"
                          ? conversation.lead?.name || ((conversation as any).channel_metadata as any)?.from_name || ((conversation as any).channel_metadata as any)?.from_email || "Desconhecido"
                          : undefined
                      }
                      companyName="Você"
                      showTimestamp={true}
                      onUseSuggestedReply={(text) => composerRef.current?.setMessage(text)}
                      onCreateTaskFromAudio={(title, description, priority) => {
                        const params = new URLSearchParams({
                          title,
                          description,
                          ...(priority ? { priority } : {}),
                          ...(conversation.lead?.id ? { lead_id: String(conversation.lead.id) } : {}),
                        });
                        window.open(`/dashboard/tasks/new?${params.toString()}`, "_blank");
                      }}
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
          disabled={igWindowExpired}
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

      {conversation.channel === "whatsapp" && (
        <WhatsAppInteractiveButtonsDialog
          open={showButtonsDialog}
          onOpenChange={setShowButtonsDialog}
          conversationId={conversationId}
        />
      )}

      <ScheduleAppointmentDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        conversationId={conversation.id}
        contactId={(conversation as any).contact_id ?? null}
        contactName={
          (conversation as any).contact?.name ??
          (conversation as any).lead?.name ??
          null
        }
        contactPhone={
          (conversation as any).contact?.phone ??
          (conversation as any).lead?.phone ??
          null
        }
        leadId={conversation.lead_id ?? null}
      />

      <CreateTicketFromConversationDialog
        open={showTicketDialog}
        onOpenChange={setShowTicketDialog}
        conversationId={conversation.id}
        contactId={(conversation as any).contact_id ?? null}
        leadId={conversation.lead_id ?? null}
        contactName={
          (conversation as any).contact?.name ??
          (conversation as any).lead?.name ??
          null
        }
        contactPhone={
          (conversation as any).contact?.phone ??
          (conversation as any).lead?.phone ??
          null
        }
      />
    </div>
  );
}
