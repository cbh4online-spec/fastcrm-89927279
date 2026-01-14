import { useState, useEffect, useRef } from "react";
import { useConversation, useMarkConversationRead, useUpdateConversationStatus, useAssignConversation } from "@/hooks/useConversations";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { useAgentMembers } from "@/hooks/useWorkspaceMembers";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  MoreVertical,
  User,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { InboxCopilot } from "@/components/copilot/InboxCopilot";
import { TemplateSelector } from "@/components/templates/TemplateSelector";
import { ContextualTemplatePanel } from "@/components/templates/ContextualTemplatePanel";
import { VariableContext } from "@/lib/templateVariables";
import { Template } from "@/hooks/useTemplates";

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
      toast.error("Failed to send message");
    }
  };

  const handleAssign = async (userId: string) => {
    if (!conversationId) return;
    try {
      await assignConversation.mutateAsync({
        conversationId,
        assignTo: userId || null,
      });
      toast.success("Conversation assigned");
    } catch (error) {
      toast.error("Failed to assign conversation");
    }
  };

  const handleStatusChange = async (status: "open" | "closed" | "archived") => {
    if (!conversationId) return;
    try {
      await updateStatus.mutateAsync({ conversationId, status });
      toast.success(`Conversation ${status}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">No conversation selected</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Select a conversation from the list to view messages
          </p>
        </div>
      </div>
    );
  }

  if (convLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Conversation not found</p>
      </div>
    );
  }

  const ChannelIcon = channelIcons[conversation.channel];

  const handleInsertReply = (text: string) => {
    setNewMessage(text);
  };

  return (
    <div className="flex-1 flex bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <ChannelIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">
                {conversation.lead?.name || conversation.external_thread_id || "Unknown"}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="capitalize">{conversation.channel}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    conversation.status === "open" && "border-green-500 text-green-500",
                    conversation.status === "closed" && "border-muted-foreground",
                    conversation.status === "archived" && "border-amber-500 text-amber-500"
                  )}
                >
                  {conversation.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Assign */}
            <Select
              value={conversation.assigned_to || "unassigned"}
              onValueChange={handleAssign}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Assign to..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {agents?.map((agent) => (
                  <SelectItem key={agent.user_id} value={agent.user_id}>
                    {agent.profile?.full_name || agent.profile?.email || "Agent"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleStatusChange("open")}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Open
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("closed")}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Close Conversation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("archived")}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !messages?.length ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              No messages yet
            </div>
          ) : (
            <div className="space-y-4">
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
                      "max-w-[70%] rounded-lg px-4 py-2",
                      message.direction === "outbound"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={cn(
                        "text-xs mt-1",
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
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2">
            <TemplateSelector
              entityType="lead"
              entityId={conversation?.lead?.id || conversationId || ''}
              entityData={templateContext}
              channel={conversation?.channel}
              goal="follow_up"
              onApply={handleTemplateApply}
              trigger={
                <Button variant="outline" size="icon">
                  <FileText className="w-4 h-4" />
                </Button>
              }
            />
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || sendMessage.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Copilot Sidebar */}
      <div className="w-80 border-l border-border p-4 overflow-y-auto hidden lg:block space-y-4">
        {/* Contextual Templates */}
        <ContextualTemplatePanel
          entityType="lead"
          entityId={conversation?.lead?.id || conversationId || ''}
          entityData={templateContext}
          channel={conversation?.channel}
          goal="follow_up"
          onApply={handleTemplateApply}
          maxVisible={2}
        />
        
        <InboxCopilot 
          messages={messages || []} 
          onInsertReply={handleInsertReply}
        />
      </div>
    </div>
  );
}
