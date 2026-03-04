import { useState, useMemo, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConversations, useDeleteConversations, ConversationChannel, ConversationStatus, Conversation } from "@/hooks/useConversations";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  MessageSquare,
  Mail,
  Phone,
  Instagram,
  Facebook,
  Globe,
  Trash2,
  CheckSquare,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

const channelIcons: Record<ConversationChannel, React.ElementType> = {
  whatsapp: Phone,
  email: Mail,
  sms: MessageSquare,
  webchat: Globe,
  instagram: Instagram,
  facebook: Facebook,
  messenger: Facebook,
  live_chat: MessageSquare,
  web_widget: Globe,
  phone: Phone,
  ghl: Zap,
  other: MessageSquare,
};

const channelColors: Record<ConversationChannel, string> = {
  whatsapp: "text-green-500",
  email: "text-blue-500",
  sms: "text-purple-500",
  webchat: "text-cyan-500",
  instagram: "text-pink-500",
  facebook: "text-indigo-500",
  messenger: "text-blue-600",
  live_chat: "text-teal-500",
  web_widget: "text-cyan-500",
  phone: "text-green-600",
  ghl: "text-orange-500",
  other: "text-muted-foreground",
};

const channelFilterOptions: { id: ConversationChannel | "all"; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "email", label: "Email" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
  { id: "ghl", label: "GHL" },
  { id: "webchat", label: "Webchat" },
  { id: "sms", label: "SMS" },
];

type SimplifiedTab = "requires_response" | "follow_up" | "active" | "resolved";

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  defaultChannel?: ConversationChannel | null;
}

export function ConversationList({
  selectedId,
  onSelect,
  defaultChannel,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<SimplifiedTab>("requires_response");
  const [channelFilter, setChannelFilter] = useState<ConversationChannel | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    if (!currentWorkspace?.id) return;
    const channel = supabase
      .channel(`messages-realtime-${currentWorkspace.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `workspace_id=eq.${currentWorkspace.id}`,
      }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        const newMsg = payload.new as any;
        if (newMsg?.direction === 'inbound') {
          toast.success("Nova mensagem recebida", {
            description: newMsg.content?.substring(0, 80) || "Nova mensagem",
            duration: 4000,
          });

          // Emit MESSAGE.RECEIVED kernel event
          if (currentWorkspace?.id) {
            import('@/lib/kernelEmitter').then(({ emitKernelEvent }) => {
              import('@/lib/requestId').then(({ generateRequestId }) => {
                emitKernelEvent({
                  workspace_id: currentWorkspace.id,
                  type: 'MESSAGE.RECEIVED',
                  entity_kind: 'message',
                  entity_id: newMsg.id,
                  payload: {
                    conversation_id: newMsg.conversation_id,
                    direction: 'inbound',
                    channel: newMsg.channel,
                  },
                  source_module: 'comm-inbox',
                  correlation_id: generateRequestId(),
                  idempotency_key: `msg-received-${newMsg.id}`,
                });
              });
            });
          }
        }
      })
      .subscribe((status) => {
        console.log(`[Inbox Realtime] messages subscription: ${status}`);
      });
    return () => { supabase.removeChannel(channel); };
  }, [currentWorkspace?.id, queryClient]);

  // Determine status filter from tab
  const getStatusFromTab = (tab: SimplifiedTab): ConversationStatus | undefined => {
    if (tab === "resolved") return "closed";
    return "open";
  };

  const { data: conversations, isLoading } = useConversations({
    status: getStatusFromTab(activeTab),
    channel: defaultChannel || undefined,
  });
  const deleteConversations = useDeleteConversations();

  // Filter by tab + search (before channel filter, for channel counts)
  const tabFilteredConversations = useMemo(() => {
    if (!conversations) return [];

    let filtered = conversations.filter((conv) => {
      const simplifiedStatus = (conv as any).conversation_status_simplified;
      switch (activeTab) {
        case "requires_response":
          // Show ALL open conversations (already filtered by status=open in query)
          // REQUIRES_RESPONSE vs FOLLOW_UP is visual only (badge), not a hard filter
          return true;
        case "follow_up":
          if (simplifiedStatus === "FOLLOW_UP") return true;
          return false;
        case "active":
          if (simplifiedStatus === "ACTIVE_OPPORTUNITY") return true;
          if (conv.opportunities && conv.opportunities.length > 0) return true;
          return false;
        case "resolved":
          return true;
      }
      return true;
    });

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.contact?.name?.toLowerCase().includes(searchLower) ||
        conv.lead?.name?.toLowerCase().includes(searchLower) ||
        conv.lead?.email?.toLowerCase().includes(searchLower) ||
        conv.last_message_preview?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [conversations, search, activeTab]);

  // Apply channel filter + sort
  const processedConversations = useMemo(() => {
    let filtered = tabFilteredConversations;

    if (channelFilter !== "all") {
      filtered = filtered.filter(conv => conv.channel === channelFilter);
    }

    // Sort by last_message_at DESC (most recent first)
    filtered.sort((a, b) => {
      const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return dateB - dateA;
    });

    return filtered;
  }, [tabFilteredConversations, channelFilter]);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    try {
      await deleteConversations.mutateAsync(Array.from(selectedIds));
      toast.success(`${selectedIds.size} conversa(s) eliminada(s)`);
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      setSelectionMode(false);
      onSelect("");
    } catch (error) {
      toast.error("Erro ao eliminar conversas");
    }
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-card overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-border space-y-2.5">
          {/* Simplified Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SimplifiedTab)}>
            <TabsList className="w-full grid grid-cols-4 h-8">
              <TabsTrigger value="requires_response" className="text-[11px] px-1">Abertas</TabsTrigger>
              <TabsTrigger value="follow_up" className="text-[11px] px-1">Follow-up</TabsTrigger>
              <TabsTrigger value="active" className="text-[11px] px-1">Ativas</TabsTrigger>
              <TabsTrigger value="resolved" className="text-[11px] px-1">Resolvidas</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search + Channel Filter */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </div>

          {/* Channel Filter Pills with counts */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {channelFilterOptions.map((opt) => {
              const count = opt.id === "all"
                ? tabFilteredConversations.length
                : tabFilteredConversations.filter(c => c.channel === opt.id).length;
              if (opt.id !== "all" && count === 0) return null;
              return (
                <button
                  key={opt.id}
                  onClick={() => setChannelFilter(opt.id)}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap border transition-colors",
                    channelFilter === opt.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {opt.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {processedConversations.length} conversa(s)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant={selectionMode ? "secondary" : "ghost"}
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  if (selectionMode) setSelectedIds(new Set());
                }}
              >
                <CheckSquare className="w-3 h-3" />
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !processedConversations?.length ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Sem conversas</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {processedConversations.map((conv) => {
                const ChannelIcon = channelIcons[conv.channel];
                const displayName = conv.contact?.name || conv.lead?.name || conv.external_thread_id || "Desconhecido";
                const avatarUrl = (conv.lead as any)?.avatar_url || (conv.contact as any)?.avatar_url;
                const isSelected = selectedIds.has(conv.id);
                const hasUnread = conv.unread_count > 0;

                return (
                  <div
                    key={conv.id}
                    className={cn(
                      "px-3 py-2.5 hover:bg-accent/50 transition-colors cursor-pointer",
                      selectedId === conv.id && "bg-accent",
                      isSelected && "bg-primary/5"
                    )}
                    onClick={() => !selectionMode && onSelect(conv.id)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Selection Checkbox */}
                      {selectionMode && (
                        <Checkbox
                          checked={isSelected}
                          onClick={(e) => toggleSelect(conv.id, e)}
                        />
                      )}

                      {/* Avatar */}
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback className="text-xs font-medium bg-muted">
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Line 1: Name + Channel Icon + Time */}
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "text-sm truncate",
                            hasUnread ? "font-semibold text-foreground" : "font-normal text-foreground"
                          )}>
                            {displayName}
                          </span>
                          <ChannelIcon className={cn("w-3 h-3 flex-shrink-0", channelColors[conv.channel])} />
                          {conv.last_message_at && (
                            <span className="text-[11px] text-muted-foreground flex-shrink-0 whitespace-nowrap ml-auto">
                              {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false, locale: pt })}
                            </span>
                          )}
                        </div>

                        {/* Line 2: Preview + Unread dot */}
                        <div className="flex items-center gap-1 mt-0.5">
                          <p className={cn(
                            "text-xs truncate flex-1 min-w-0",
                            hasUnread ? "text-foreground/80" : "text-muted-foreground"
                          )}>
                            {(conv as any).last_message_direction === "outbound" && (
                              <span className="text-muted-foreground">Tu: </span>
                            )}
                            {conv.last_message_preview || "Sem mensagens"}
                          </p>
                          {hasUnread && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar conversas?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja eliminar {selectedIds.size} conversa(s)?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
