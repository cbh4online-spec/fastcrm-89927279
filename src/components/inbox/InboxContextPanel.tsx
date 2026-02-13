import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, User, Zap, X, ExternalLink, Mail, Phone, Tag, Target, Calendar, UserPlus, MessageSquare, Loader2, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConversation, useAssignConversation } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useLead } from "@/hooks/useLeads";
import { useContact } from "@/hooks/useContacts";
import { useCompany } from "@/hooks/useCompanies";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useAgentMembers } from "@/hooks/useWorkspaceMembers";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { ConversationIntelligencePanel } from "./ConversationIntelligencePanel";
import { UnifiedActivityLog } from "@/components/crm/UnifiedActivityLog";
import { ScheduleFollowupDialog } from "./ScheduleFollowupDialog";
import { CreateOpportunityFromInboxDialog } from "./CreateOpportunityFromInboxDialog";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface InboxContextPanelProps {
  conversationId: string | null;
  onClose: () => void;
  onInsertReply?: (text: string) => void;
}

export function InboxContextPanel({ conversationId, onClose, onInsertReply }: InboxContextPanelProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { data: conversation } = useConversation(conversationId || undefined);
  const { data: messages } = useMessages(conversationId || undefined);
  const { data: lead } = useLead(conversation?.lead_id || undefined);
  const { data: contact } = useContact(conversation?.contact_id || undefined);
  const { data: company } = useCompany(conversation?.company_id || undefined);
  const { data: opportunities } = useOpportunities();
  const { data: agents } = useAgentMembers();
  const assignConversation = useAssignConversation();

  const [showFollowup, setShowFollowup] = useState(false);
  const [showCreateOpp, setShowCreateOpp] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const leadOpportunities = opportunities?.filter(o => o.lead_id === lead?.id) || [];
  const totalValue = leadOpportunities.reduce((acc, o) => acc + (o.value || 0), 0);
  const displayName = lead?.name || contact?.name || "Desconhecido";
  const displayEmail = lead?.email || contact?.email;
  const displayPhone = lead?.phone || contact?.phone;
  const displayTags = lead?.tags || contact?.tags || [];
  const avatarUrl = (lead as any)?.avatar_url || (contact as any)?.avatar_url;

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  const handleAssign = (userId: string | null) => {
    if (!conversationId) return;
    assignConversation.mutate(
      { conversationId, assignTo: userId },
      {
        onSuccess: () => toast.success(userId ? "Utilizador atribuído" : "Atribuição removida"),
        onError: () => toast.error("Erro ao atribuir"),
      }
    );
  };

  const handleSaveNote = async () => {
    if (!conversationId || !noteText.trim() || !currentWorkspace) return;
    setSavingNote(true);
    try {
      const { error } = await workspaceClient
        .from("entity_notes")
        .insert({
          entity_type: "conversation",
          entity_id: conversationId,
          content: noteText.trim(),
          created_by: user?.id || null,
          workspace_id: currentWorkspace.id,
          note_type: "text",
        });
      if (error) throw error;
      toast.success("Nota adicionada");
      setNoteText("");
      setShowNote(false);
    } catch {
      toast.error("Erro ao guardar nota");
    } finally {
      setSavingNote(false);
    }
  };

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Selecione uma conversa</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-[10px] font-medium bg-primary/10 text-primary">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate">{displayName}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ai" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full grid grid-cols-3 h-9 mx-3 mt-2" style={{ width: "calc(100% - 1.5rem)" }}>
          <TabsTrigger value="ai" className="text-xs gap-1">
            <Sparkles className="w-3 h-3" />
            AI
          </TabsTrigger>
          <TabsTrigger value="lead" className="text-xs gap-1">
            <User className="w-3 h-3" />
            Lead
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs gap-1">
            <Zap className="w-3 h-3" />
            Ações
          </TabsTrigger>
        </TabsList>

        {/* AI Insights Tab */}
        <TabsContent value="ai" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3">
              {messages && messages.length > 0 ? (
                <ConversationIntelligencePanel
                  messages={messages}
                  leadData={lead ? {
                    name: lead.name,
                    email: lead.email || undefined,
                    phone: lead.phone || undefined,
                    status: lead.status,
                  } : undefined}
                  channel={conversation?.channel}
                  lastMessageAt={conversation?.last_message_at || undefined}
                  onInsertReply={onInsertReply}
                  onCreateOpportunity={() => setShowCreateOpp(true)}
                  onScheduleFollowup={() => setShowFollowup(true)}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Sem mensagens para analisar
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Lead Data Tab */}
        <TabsContent value="lead" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                {displayEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{displayEmail}</span>
                  </div>
                )}
                {displayPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{displayPhone}</span>
                  </div>
                )}
                {company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{company.name}</span>
                  </div>
                )}
              </div>

              {/* Value Summary */}
              {totalValue > 0 && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-lg font-semibold text-primary">
                    {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(totalValue)}
                  </p>
                  <p className="text-xs text-muted-foreground">Valor total · {leadOpportunities.length} oportunidade(s)</p>
                </div>
              )}

              {/* Tags */}
              {displayTags.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Tags
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {displayTags.map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Contact */}
              {conversation?.last_message_at && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  Último contacto: {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true, locale: pt })}
                </div>
              )}

              {/* Profile Link */}
              {(lead || contact) && (
                <Link to={lead ? `/dashboard/leads/${lead.id}` : `/dashboard/contacts/${contact?.id}`}>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                    <ExternalLink className="w-3 h-3 mr-1.5" />
                    Ver Perfil Completo
                  </Button>
                </Link>
              )}

              {/* Activity Log */}
              {lead && (
                <div className="pt-2">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Histórico</h4>
                  <UnifiedActivityLog entityType="lead" entityId={lead.id} compact limit={5} />
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-9 text-xs"
                onClick={() => setShowCreateOpp(true)}
                disabled={!lead}
              >
                <Target className="w-4 h-4 mr-2" />
                Criar Oportunidade
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-9 text-xs"
                onClick={() => setShowFollowup(true)}
                disabled={!lead || !conversationId}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Agendar Follow-up
              </Button>

              {/* Assign User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start h-9 text-xs"
                    disabled={!conversationId}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {conversation?.assigned_to
                      ? `Atribuído: ${agents?.find(a => a.user_id === conversation.assigned_to)?.profile?.full_name || "..."}`
                      : "Atribuir Utilizador"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => handleAssign(null)}>
                    <span className="text-muted-foreground">Sem atribuição</span>
                  </DropdownMenuItem>
                  {agents?.map((agent) => (
                    <DropdownMenuItem key={agent.user_id} onClick={() => handleAssign(agent.user_id)}>
                      {agent.profile?.full_name || agent.profile?.email || agent.user_id.slice(0, 8)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Add Note */}
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-9 text-xs"
                onClick={() => setShowNote(!showNote)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Adicionar Nota
              </Button>
              {showNote && (
                <div className="space-y-2 pt-1">
                  <Textarea
                    placeholder="Escrever nota..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="min-h-[60px] text-xs"
                  />
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={handleSaveNote}
                    disabled={!noteText.trim() || savingNote}
                  >
                    {savingNote ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                    Guardar Nota
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showFollowup && conversationId && lead && (
        <ScheduleFollowupDialog
          open={showFollowup}
          onOpenChange={setShowFollowup}
          conversationId={conversationId}
          leadId={lead.id}
          leadName={lead.name}
        />
      )}
      {showCreateOpp && lead && conversationId && (
        <CreateOpportunityFromInboxDialog
          open={showCreateOpp}
          onOpenChange={setShowCreateOpp}
          conversationId={conversationId}
          leadId={lead.id}
          leadName={lead.name}
        />
      )}
    </div>
  );
}
