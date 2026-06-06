import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
  CheckCircle,
  Clock,
  Archive,
  AlignJustify,
  List,
  ArrowUpRight,
  ArrowDownLeft,
  Pin,
  PinOff,
  Check,
  CheckCheck,
  Eye,
  EyeOff,
  Tag,
  UserPlus,
  AlertTriangle,
  Layers,
  WrapText,
  MoreHorizontal,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { cleanEmailPreview } from "@/lib/cleanEmailPreview";
import { isToday, isYesterday, format as fnsFormat, formatDistanceToNow, differenceInHours } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

import { InboxCategory, ChannelFilter } from "./InboxSidebar";
import { useUpdateConversationStatus } from "@/hooks/useConversations";

/** Relative time: "há 2h", "há 5min", "ontem", "08/04" */
function formatSmartTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffH = differenceInHours(now, d);

  if (diffH < 1) {
    return formatDistanceToNow(d, { locale: pt, addSuffix: true });
  }
  if (isToday(d)) {
    return formatDistanceToNow(d, { locale: pt, addSuffix: true });
  }
  if (isYesterday(d)) return "Ontem";
  return fnsFormat(d, "dd/MM", { locale: pt });
}

function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return `Hoje às ${fnsFormat(d, "HH:mm", { locale: pt })}`;
  if (isYesterday(d)) return `Ontem às ${fnsFormat(d, "HH:mm", { locale: pt })}`;
  return fnsFormat(d, "d 'de' MMMM 'às' HH:mm", { locale: pt });
}

const PINNED_KEY = "inbox-pinned-conversations";

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

const channelBgColors: Record<ConversationChannel, string> = {
  whatsapp: "bg-green-500/10",
  email: "bg-blue-500/10",
  sms: "bg-purple-500/10",
  webchat: "bg-cyan-500/10",
  instagram: "bg-pink-500/10",
  facebook: "bg-indigo-500/10",
  messenger: "bg-blue-600/10",
  live_chat: "bg-teal-500/10",
  web_widget: "bg-cyan-500/10",
  phone: "bg-green-600/10",
  ghl: "bg-orange-500/10",
  other: "bg-muted",
};

const channelLabels: Partial<Record<ConversationChannel | "all", string>> = {
  all: "Todos",
  email: "Email",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  sms: "SMS",
  phone: "Telefone",
  ghl: "GHL",
  webchat: "Webchat",
};

type SimplifiedTab = "requires_response" | "follow_up" | "active" | "resolved";

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  defaultChannel?: ConversationChannel | null;
  categoryFilter?: InboxCategory;
  channelFilter?: ConversationChannel;
  activeView?: string | null;
  density?: "normal" | "compact";
  onToggleDensity?: () => void;
  wrapMode?: "truncate" | "wrap";
  onToggleWrapMode?: () => void;
}

export function ConversationList({
  selectedId,
  onSelect,
  defaultChannel,
  categoryFilter,
  channelFilter: externalChannelFilter,
  activeView,
  density: densityProp,
  onToggleDensity,
  wrapMode: wrapModeProp,
  onToggleWrapMode,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<SimplifiedTab>("requires_response");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [internalChannelFilter, setInternalChannelFilter] = useState<ConversationChannel | "all">("all");
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(PINNED_KEY);
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch { return new Set(); }
  });
  const [internalDensity, setInternalDensity] = useState<"normal" | "compact">(() => {
    return (localStorage.getItem("inbox-density") as "normal" | "compact") || "normal";
  });
  const [internalWrapMode, setInternalWrapMode] = useState<"truncate" | "wrap">(() => {
    return (localStorage.getItem("inbox-wrap-mode") as "truncate" | "wrap") || "truncate";
  });
  const updateStatus = useUpdateConversationStatus();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const density = densityProp ?? internalDensity;
  const wrapMode = wrapModeProp ?? internalWrapMode;

  const toggleDensity = () => {
    const next = density === "normal" ? "compact" : "normal";
    if (onToggleDensity) {
      onToggleDensity();
    } else {
      setInternalDensity(next);
      localStorage.setItem("inbox-density", next);
    }
  };

  const toggleWrapMode = () => {
    const next = wrapMode === "truncate" ? "wrap" : "truncate";
    if (onToggleWrapMode) {
      onToggleWrapMode();
    } else {
      setInternalWrapMode(next);
      localStorage.setItem("inbox-wrap-mode", next);
    }
  };

  const effectiveChannelFilter = externalChannelFilter || (internalChannelFilter !== "all" ? internalChannelFilter as ConversationChannel : undefined);

  const togglePin = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(PINNED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

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
          const preview = cleanEmailPreview(newMsg.content, 80) || "Nova mensagem";
          toast.success("Nova mensagem recebida", {
            description: preview,
            duration: 4000,
          });

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

  // Determine status filter from category/tab
  const getStatusFromCategory = (): ConversationStatus | undefined => {
    if (categoryFilter === "trash" || categoryFilter === "spam" || categoryFilter === "archives") return "archived";
    if (categoryFilter === "closed") return "closed";
    if (categoryFilter === "drafts") return "pending";
    if (categoryFilter === "sent") return undefined;
    if (activeTab === "resolved") return "closed";
    return "open";
  };

  // Map category filter to tab
  useEffect(() => {
    if (!categoryFilter) return;
    const categoryToTab: Partial<Record<InboxCategory, SimplifiedTab>> = {
      all: "requires_response",
      new: "requires_response",
      assigned: "requires_response",
      pending: "requires_response",
      negotiations: "active",
      closed: "resolved",
      archives: "resolved",
      sent: "requires_response",
      drafts: "requires_response",
      scheduled: "requires_response",
      spam: "requires_response",
      trash: "requires_response",
    };
    const mapped = categoryToTab[categoryFilter];
    if (mapped) setActiveTab(mapped);
  }, [categoryFilter]);

  const { data: conversations, isLoading } = useConversations({
    status: getStatusFromCategory(),
    channel: effectiveChannelFilter || defaultChannel || undefined,
    lastMessageDirection: categoryFilter === "sent" ? "outbound" : undefined,
  });
  const deleteConversations = useDeleteConversations();

  // Compute channel counts for pills (before channel filtering)
  const { data: allConversationsForCounts } = useConversations({
    status: getStatusFromCategory(),
    lastMessageDirection: categoryFilter === "sent" ? "outbound" : undefined,
  });

  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    if (!allConversationsForCounts) return counts;
    counts.all = allConversationsForCounts.length;
    for (const conv of allConversationsForCounts) {
      counts[conv.channel] = (counts[conv.channel] || 0) + 1;
    }
    return counts;
  }, [allConversationsForCounts]);

  // Filter by tab + search
  const tabFilteredConversations = useMemo(() => {
    if (!conversations) return [];

    let filtered = conversations.filter((conv) => {
      const simplifiedStatus = (conv as any).conversation_status_simplified;
      switch (activeTab) {
        case "requires_response":
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

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.contact?.name?.toLowerCase().includes(searchLower) ||
        conv.lead?.name?.toLowerCase().includes(searchLower) ||
        conv.lead?.email?.toLowerCase().includes(searchLower) ||
        conv.last_message_preview?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by active view
    if (activeView === "unread") {
      filtered = filtered.filter(conv => conv.unread_count > 0);
    }

    return filtered;
  }, [conversations, search, activeTab, activeView]);

  // Sort conversations
  const processedConversations = useMemo(() => {
    const filtered = [...tabFilteredConversations];
    filtered.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id) ? 1 : 0;
      const bPinned = pinnedIds.has(b.id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return dateB - dateA;
    });
    return filtered;
  }, [tabFilteredConversations, pinnedIds]);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === processedConversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedConversations.map(c => c.id)));
    }
  };

  const handleBulkMarkRead = () => {
    toast.success(`${selectedIds.size} conversa(s) marcada(s) como lida(s)`);
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleBulkArchive = () => {
    const ids = Array.from(selectedIds);
    ids.forEach(id => {
      updateStatus.mutate({ conversationId: id, status: "archived" });
    });
    toast.success(`${selectedIds.size} conversa(s) arquivada(s)`);
    setSelectedIds(new Set());
    setSelectionMode(false);
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

  // Check if a conversation is urgent (no response >48h)
  const isUrgent = (conv: Conversation) => {
    if (!conv.last_message_at) return false;
    const isInbound = (conv as any).last_message_direction === "inbound";
    if (!isInbound) return false;
    return differenceInHours(new Date(), new Date(conv.last_message_at)) > 48;
  };

  // Channel pills to show
  const channelPills = useMemo(() => {
    const pills: { id: ConversationChannel | "all"; label: string; icon: React.ElementType; count: number }[] = [
      { id: "all", label: "Todos", icon: Layers, count: channelCounts.all || 0 },
    ];
    const channelsToShow: (ConversationChannel)[] = ["email", "whatsapp", "instagram", "facebook", "sms"];
    for (const ch of channelsToShow) {
      if ((channelCounts[ch] || 0) > 0) {
        pills.push({
          id: ch,
          label: channelLabels[ch] || ch,
          icon: channelIcons[ch],
          count: channelCounts[ch] || 0,
        });
      }
    }
    return pills;
  }, [channelCounts]);

  const activeChannelPill = externalChannelFilter || internalChannelFilter;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-card overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-border space-y-2">
          {/* Simplified Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SimplifiedTab)}>
            <TabsList className="w-full grid grid-cols-4 h-8">
              <TabsTrigger value="requires_response" className="text-[11px] px-1">Abertas</TabsTrigger>
              <TabsTrigger value="follow_up" className="text-[11px] px-1">Follow-up</TabsTrigger>
              <TabsTrigger value="active" className="text-[11px] px-1">Ativas</TabsTrigger>
              <TabsTrigger value="resolved" className="text-[11px] px-1">Resolvidas</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Channel Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {channelPills.map((pill) => {
              const PillIcon = pill.icon;
              const isActive = activeChannelPill === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => {
                    if (!externalChannelFilter) {
                      setInternalChannelFilter(pill.id as ConversationChannel | "all");
                    }
                  }}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                  )}
                >
                  <PillIcon className={cn("w-3 h-3", isActive ? "" : channelColors[pill.id as ConversationChannel] || "")} />
                  <span>{pill.label}</span>
                  <span className={cn(
                    "ml-0.5 px-1 rounded-full text-[9px]",
                    isActive ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
                  )}>
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
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

          {/* Conversation count + controls */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {processedConversations.length} conversa(s)
            </span>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleWrapMode}>
                    <WrapText className={cn("w-3 h-3", wrapMode === "wrap" && "text-primary")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{wrapMode === "wrap" ? "Truncar preview" : "Expandir preview"}</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleDensity}>
                    {density === "normal" ? <AlignJustify className="w-3 h-3" /> : <List className="w-3 h-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{density === "normal" ? "Compacto" : "Normal"}</p></TooltipContent>
              </Tooltip>
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
            </div>
          </div>
        </div>

        {/* Batch Actions Bar */}
        {selectionMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-primary/5 border-b border-primary/20 animate-in slide-in-from-top-1 duration-200">
            <Checkbox
              checked={selectedIds.size === processedConversations.length}
              onClick={handleSelectAll}
              className="mr-1"
            />
            <span className="text-xs font-medium text-primary">
              {selectedIds.size} selecionada(s)
            </span>
            <div className="ml-auto flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleBulkArchive}>
                    <Archive className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Arquivar tudo</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleBulkMarkRead}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Marcar como lido</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info("Funcionalidade de atribuição em breve")}>
                    <UserPlus className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Atribuir</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info("Funcionalidade de etiquetas em breve")}>
                    <Tag className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Etiquetar</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Eliminar</p></TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

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
              {processedConversations.map((conv, idx) => {
                const ChannelIcon = channelIcons[conv.channel];
                const displayName = conv.contact?.name || conv.lead?.name || conv.resolved_contact?.name || conv.external_thread_id || "Desconhecido";
                const avatarUrl = (conv.lead as any)?.avatar_url || (conv.contact as any)?.avatar_url;
                const isSelected = selectedIds.has(conv.id);
                const hasUnread = conv.unread_count > 0;
                const isPinned = pinnedIds.has(conv.id);
                const isOutbound = (conv as any).last_message_direction === "outbound";
                const emailSubject = conv.channel === "email" ? ((conv as any).channel_metadata?.subject || (conv as any).channel_metadata?.email_subject) : null;
                const urgent = isUrgent(conv);
                const messageCount = (conv as any).message_count || conv.unread_count || 0;

                const prevConv = idx > 0 ? processedConversations[idx - 1] : null;
                const showPinnedDivider = idx === 0 && isPinned;
                const showUnpinnedDivider = prevConv && pinnedIds.has(prevConv.id) && !isPinned;

                return (
                  <div key={conv.id}>
                    {showPinnedDivider && (
                      <div className="px-3 py-1 flex items-center gap-1.5">
                        <Pin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Fixadas</span>
                      </div>
                    )}
                    {showUnpinnedDivider && (
                      <div className="px-3 py-1 border-t border-border">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Recentes</span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "group relative hover:bg-accent/50 transition-colors cursor-pointer",
                        density === "normal" ? "py-3" : "py-1.5",
                        selectedId === conv.id && "bg-accent",
                        isSelected && "bg-primary/5",
                        isPinned && "bg-primary/[0.02]"
                      )}
                      onClick={() => !selectionMode && onSelect(conv.id)}
                    >
                      <div className={cn(
                        "flex items-center gap-2 px-3 max-w-full",
                        density === "normal" ? "gap-2.5" : "gap-2"
                      )}>

                        {/* Unread indicator — left bar */}
                        <div className={cn(
                          "absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full transition-all",
                          hasUnread ? "bg-primary" : "bg-transparent"
                        )} />

                        {/* Selection Checkbox */}
                        {selectionMode && (
                          <Checkbox
                            checked={isSelected}
                            onClick={(e) => toggleSelect(conv.id, e)}
                          />
                        )}

                        {/* Avatar with channel icon overlay */}
                        <div className="relative flex-shrink-0">
                          <Avatar className={density === "compact" ? "h-7 w-7" : "h-10 w-10"}>
                            <AvatarImage src={avatarUrl} />
                            <AvatarFallback className={cn("font-medium bg-muted", density === "compact" ? "text-[10px]" : "text-xs")}>
                              {getInitials(displayName)}
                            </AvatarFallback>
                          </Avatar>
                          {/* Channel icon pill */}
                          <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 border-2 border-card",
                            density === "compact" ? "scale-75 origin-bottom-right" : "",
                            channelBgColors[conv.channel]
                          )}>
                            <ChannelIcon className={cn("w-2.5 h-2.5", channelColors[conv.channel])} />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Line 1: Name + badges + Time */}
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            {conv.resolved_contact && !conv.contact?.name && !conv.lead?.name ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={cn(
                                    "text-sm truncate cursor-help",
                                    hasUnread ? "font-bold text-foreground" : "font-normal text-foreground"
                                  )}>
                                    {displayName}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    Identificado por {conv.resolved_contact.type === "contact" ? "contacto" : conv.resolved_contact.type === "lead" ? "lead" : "empresa"}
                                  </p>
                                  {conv.resolved_contact.matched_phone && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      Match: {conv.resolved_contact.matched_phone} ↔ {conv.external_thread_id}
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className={cn(
                                "text-sm truncate",
                                hasUnread ? "font-bold text-foreground" : "font-normal text-foreground"
                              )}>
                                {displayName}
                              </span>
                            )}
                            {density !== "compact" && conv.resolved_contact && !conv.contact?.name && !conv.lead?.name && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "h-4 px-1 text-[9px] font-medium flex-shrink-0 uppercase tracking-wide",
                                      conv.resolved_contact.ambiguous
                                        ? "border-destructive/50 text-destructive"
                                        : conv.resolved_contact.type === "contact"
                                          ? "border-emerald-500/40 text-emerald-600"
                                          : conv.resolved_contact.type === "lead"
                                            ? "border-amber-500/40 text-amber-600"
                                            : "border-sky-500/40 text-sky-600",
                                    )}
                                  >
                                    {conv.resolved_contact.ambiguous ? "?" : ""}
                                    {conv.resolved_contact.type === "contact" ? "Contacto" : conv.resolved_contact.type === "lead" ? "Lead" : "Empresa"}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {conv.resolved_contact.ambiguous ? (
                                    <p className="text-xs">
                                      {conv.resolved_contact.candidates_count} registos partilham este telefone — ligação automática suspensa.
                                    </p>
                                  ) : (
                                    <p className="text-xs">Identificado por correspondência E.164</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {urgent && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent><p>Sem resposta há mais de 48h</p></TooltipContent>
                              </Tooltip>
                            )}
                            {isPinned && <Pin className="w-3 h-3 text-primary/60 flex-shrink-0" />}
                            {density !== "compact" && messageCount > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="h-4 px-1 text-[9px] font-medium flex-shrink-0">
                                    {messageCount}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent><p>{messageCount} mensagens trocadas</p></TooltipContent>
                              </Tooltip>
                            )}
                            <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                              {/* Hover Quick Actions */}
                              <div className="hidden group-hover:flex items-center gap-0.5 animate-in fade-in-0 duration-150">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toast.success(hasUnread ? "Marcado como lido" : "Marcado como não lido");
                                      }}
                                    >
                                      {hasUnread ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>{hasUnread ? "Marcar como lido" : "Marcar como não lido"}</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateStatus.mutate({ conversationId: conv.id, status: "archived" });
                                        toast.success("Conversa arquivada");
                                      }}
                                    >
                                      <Archive className="w-3.5 h-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Arquivar</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-amber-500 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toast.success("Conversa adiada");
                                      }}
                                    >
                                      <Clock className="w-3.5 h-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Snooze</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                                      onClick={(e) => togglePin(conv.id, e)}
                                    >
                                      {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>{isPinned ? "Desafixar" : "Fixar"}</p></TooltipContent>
                                </Tooltip>
                              </div>
                              {/* Time — hidden on hover */}
                              {conv.last_message_at && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className={cn(
                                      "text-[11px] flex-shrink-0 whitespace-nowrap group-hover:hidden",
                                      hasUnread ? "text-primary font-semibold" : "text-muted-foreground"
                                    )}>
                                      {formatSmartTime(conv.last_message_at)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="text-xs">
                                    {formatRelativeTime(conv.last_message_at)}
                                  </TooltipContent>
                                </Tooltip>
                              )}

                            </div>
                          </div>

                          {/* Email subject line */}
                          {density !== "compact" && emailSubject && (
                            <p className="text-[11px] font-medium text-foreground/70 truncate mt-0.5 flex items-center gap-1">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              {emailSubject}
                            </p>
                          )}

                          {/* Line 2: Direction arrow + Preview + Delivery status */}
                          <div className={cn(
                            "flex items-center gap-1",
                            density === "normal" ? "mt-0.5" : ""
                          )}>
                            {density !== "compact" && (
                              isOutbound ? (
                                <ArrowUpRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <ArrowDownLeft className="w-3 h-3 text-primary/60 flex-shrink-0" />
                              )
                            )}
                            <p className={cn(
                              "flex-1 min-w-0",
                              density === "compact" ? "text-[11px]" : "text-xs",
                              hasUnread ? "text-foreground/80" : "text-muted-foreground",
                              wrapMode === "wrap"
                                ? "whitespace-pre-wrap break-words leading-relaxed"
                                : "truncate"
                            )}>
                              {conv.channel === 'email'
                                ? cleanEmailPreview(conv.last_message_preview)
                                : (conv.last_message_preview || "Sem mensagens")}
                            </p>
                            {isOutbound && (
                              <span className="flex-shrink-0">
                                {(conv as any).last_message_read_at ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                                ) : (conv as any).last_message_delivered_at ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </span>
                            )}
                            {hasUnread && (
                              <Badge variant="default" className="h-4 min-w-4 px-1 text-[9px] font-bold flex-shrink-0 rounded-full">
                                {conv.unread_count}
                              </Badge>
                            )}
                          </div>
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
