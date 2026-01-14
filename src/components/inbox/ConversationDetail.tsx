import { useState, useEffect, useRef } from "react";
import { useConversation, useMarkConversationRead, useUpdateConversationStatus, useAssignConversation } from "@/hooks/useConversations";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { useAgentMembers } from "@/hooks/useWorkspaceMembers";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Send,
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
  FileText,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { TemplateSelector } from "@/components/templates/TemplateSelector";
import { VariableContext } from "@/lib/templateVariables";
import { Template } from "@/hooks/useTemplates";
import { InboxAIAssistant } from "./InboxAIAssistant";
import { ConversationClassification } from "./ConversationClassification";
import { InboxTemplateAIDraft } from "./InboxTemplateAIDraft";
import { InboxActionsMenu } from "./InboxActionsMenu";
import { Separator } from "@/components/ui/separator";

const channelIcons = {
  whatsapp: Phone,
  email: Mail,
  sms: MessageSquare,
  webchat: Globe,
  instagram: Instagram,
  facebook: Facebook,
};

interface ConversationDetailProps {
  conversationId: string | null;
}

export function ConversationDetail({ conversationId }: ConversationDetailProps) {
  const { user } = useAuth();
  const { data: conversation, isLoading: convLoading } = useConversation(conversationId || undefined);
  const { data: messages, isLoading: messagesLoading } = useMessages(conversationId || undefined);
  const { data: agents } = useAgentMembers();
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();
  const updateStatus = useUpdateConversationStatus();
  const assignConversation = useAssignConversation();

  const [newMessage, setNewMessage] = useState("");
  const [showAIAssistant, setShowAIAssistant] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleTemplateApply = (renderedContent: string, _renderedSubject?: string, _template?: Template) => {
    setNewMessage(renderedContent);
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

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId) return;

    try {
      await sendMessage.mutateAsync({
        conversationId,
        content: newMessage.trim(),
      });
      setNewMessage("");
    } catch (error) {
      toast.error("Falha ao enviar mensagem");
    }
  };

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

  const handleInsertReply = (text: string) => {
    setNewMessage(text);
  };

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">Nenhuma conversa selecionada</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione uma conversa da lista para ver as mensagens
          </p>
        </div>
      </div>
    );
  }

  if (convLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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

  const ChannelIcon = channelIcons[conversation.channel];

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
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Messages Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Messages */}
        <div className="flex-1 flex flex-col">
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
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-border bg-card space-y-2">
            {/* Reply Options Info */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Opções de resposta:</span>
              <Badge variant="outline" className="text-[10px] py-0">Texto livre</Badge>
              <Badge variant="outline" className="text-[10px] py-0">Template</Badge>
              <Badge variant="outline" className="text-[10px] py-0">AI + Template</Badge>
            </div>
            <div className="flex items-center gap-2">
              <TemplateSelector
                entityType="lead"
                entityId={conversation?.lead?.id || conversationId || ''}
                entityData={templateContext}
                channel={conversation?.channel}
                goal="follow_up"
                onApply={handleTemplateApply}
                trigger={
                  <Button variant="outline" size="icon" className="h-9 w-9" title="Usar template">
                    <FileText className="w-4 h-4" />
                  </Button>
                }
              />
              <Input
                placeholder="Escreva uma mensagem ou use templates/AI..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 h-9"
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || sendMessage.isPending}
                className="h-9"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* AI Assistant Panel */}
        {showAIAssistant && messages && messages.length > 0 && (
          <div className="w-80 border-l border-border bg-muted/20 hidden lg:block overflow-y-auto">
            <div className="p-3 space-y-4">
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

              {/* Reply Suggestions */}
              <InboxAIAssistant
                messages={messages}
                leadName={conversation.lead?.name}
                onInsertReply={handleInsertReply}
              />

              <Separator className="my-4" />

              {/* Template-based AI Draft */}
              <InboxTemplateAIDraft
                entityData={templateContext}
                conversationContext={{
                  messages: messages.map(m => ({
                    direction: m.direction,
                    content: m.content,
                  })),
                  leadName: conversation.lead?.name,
                  channel: conversation.channel,
                }}
                onApply={handleInsertReply}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
