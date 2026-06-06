import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ConversationList } from "./ConversationList";
import { ConversationDetail } from "./ConversationDetail";
import { InboxContextPanel } from "./InboxContextPanel";
import { InboxSidebar, InboxCategory, ChannelFilter } from "./InboxSidebar";
import { ComposeButton } from "./ComposeButton";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { SalesInboxColumns } from "./SalesInboxColumns";
import { ConversationChannel } from "@/hooks/useConversations";
import { useConversations, useUpdateConversationStatus } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { PanelRightClose, PanelRight, PanelLeftClose, PanelLeft, Keyboard, LayoutGrid, List, Phone, AlignJustify } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { useGHLConversationSync } from "@/hooks/useGHLConversationSync";
import { useWorkspaceGHLConfig } from "@/hooks/useWorkspaceGHLConfig";
import { useWhatsAppZapiConnection } from "@/hooks/useWhatsAppZapiConnection";
import { useSyncEmail, useActiveEmailConnection } from "@/hooks/useEmailConnection";
import { useStaleConversationDetector } from "@/hooks/useStaleConversationDetector";
import { useInboxHotkeys } from "@/hooks/useInboxHotkeys";
import { InboxMetricsBar } from "./InboxMetricsBar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

type ViewMode = "list" | "columns";

export function InboxView() {
  const isMobile = useIsMobile();
  const { data: whatsappConnection } = useWhatsAppZapiConnection();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [showSidebar, setShowSidebar] = useState(() => {
    const stored = localStorage.getItem("inbox-folders-sidebar");
    return stored === null ? false : stored === "1";
  });
  const [selectedCategory, setSelectedCategory] = useState<InboxCategory>("all");
  const [selectedChannel, setSelectedChannel] = useState<ChannelFilter>("all");
  const [activeView, setActiveView] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem("inbox-view-mode") as ViewMode) || "list";
  });
  const [density, setDensity] = useState<"normal" | "compact">(() => {
    return (localStorage.getItem("inbox-density") as "normal" | "compact") || "normal";
  });
  const [wrapMode, setWrapMode] = useState<"truncate" | "wrap">(() => {
    return (localStorage.getItem("inbox-wrap-mode") as "truncate" | "wrap") || "truncate";
  });
  const [columnsSearch, setColumnsSearch] = useState("");

  const channelParam = searchParams.get("channel") as ConversationChannel | null;
  const templateParam = searchParams.get("template");

  useEffect(() => {
    if (channelParam) setSelectedChannel(channelParam as ChannelFilter);
  }, [channelParam]);

  useEffect(() => {
    if (templateParam) {
      toast.info("Template selecionado", {
        description: "Use o botão de composição para criar uma nova mensagem com este template.",
        duration: 5000,
      });
    }
  }, [templateParam]);

  const { data: conversations } = useConversations();
  const updateStatus = useUpdateConversationStatus();

  const conversationIds = useMemo(
    () => conversations?.map((c) => c.id) || [],
    [conversations]
  );

  // Sync hooks
  const { syncConversations, isSyncing: isGHLSyncing } = useGHLConversationSync();
  const { isConfigured: isGHLConfigured } = useWorkspaceGHLConfig();
  const { data: emailConnection } = useActiveEmailConnection();
  const syncEmail = useSyncEmail();

  useStaleConversationDetector();

  const hasSyncedRef = useRef(false);
  useEffect(() => {
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    if (isGHLConfigured) syncConversations(true, 2);
    if (emailConnection?.id) syncEmail.mutate(emailConnection.id);
  }, [isGHLConfigured, emailConnection?.id]);

  const { trackInboxOpened } = useCRMAnalytics();
  const inboxTracked = useRef(false);
  useEffect(() => {
    if (!conversations || inboxTracked.current) return;
    inboxTracked.current = true;
    const open = conversations.filter((c) => c.status === "open");
    trackInboxOpened({
      total_conversations: conversations.length,
      requires_response_count: open.filter((c) => c.unread_count > 0).length,
      follow_up_count: 0,
      active_opportunity_count: conversations.filter((c) => (c as any).opportunity).length,
      sla_risk_count: open.filter((c) => (c as any).conversation_priority_score > 70).length,
    });
  }, [conversations, trackInboxOpened]);

  const navigateConversation = useCallback(
    (dir: 1 | -1) => {
      if (conversationIds.length === 0) return;
      const idx = selectedConversationId ? conversationIds.indexOf(selectedConversationId) : -1;
      const next = idx + dir;
      if (next >= 0 && next < conversationIds.length) {
        setSelectedConversationId(conversationIds[next]);
      }
    },
    [conversationIds, selectedConversationId]
  );

  const handleResolve = useCallback(() => {
    if (!selectedConversationId) return;
    updateStatus.mutate(
      { conversationId: selectedConversationId, status: "closed" },
      { onSuccess: () => toast.success("Conversa resolvida") }
    );
  }, [selectedConversationId, updateStatus]);

  const handleArchive = useCallback(() => {
    if (!selectedConversationId) return;
    updateStatus.mutate(
      { conversationId: selectedConversationId, status: "archived" },
      { onSuccess: () => toast.success("Conversa arquivada") }
    );
  }, [selectedConversationId, updateStatus]);

  useInboxHotkeys({
    onNextConversation: () => navigateConversation(1),
    onPrevConversation: () => navigateConversation(-1),
    onResolve: handleResolve,
    onArchive: handleArchive,
    onToggleCRMPanel: () => setShowContextPanel((p) => !p),
    onToggleSidebar: () => setShowSidebar((p) => !p),
    onShowShortcuts: () => setShowShortcuts(true),
    onReply: () => {},
  });

  const toggleViewMode = () => {
    const next = viewMode === "list" ? "columns" : "list";
    setViewMode(next);
    localStorage.setItem("inbox-view-mode", next);
  };

  // Density toggle
  const toggleDensity = () => {
    const next = density === "normal" ? "compact" : "normal";
    setDensity(next);
    localStorage.setItem("inbox-density", next);
  };

  // Wrap mode toggle
  const toggleWrapMode = () => {
    const next = wrapMode === "truncate" ? "wrap" : "truncate";
    setWrapMode(next);
    localStorage.setItem("inbox-wrap-mode", next);
  };

  // In columns mode, if a conversation is selected, show the detail
  const showDetail = viewMode === "list" || selectedConversationId;

  // On mobile, force list view mode
  const effectiveViewMode = isMobile ? "list" : viewMode;
  // On mobile, show detail when a conversation is selected (master-detail)
  const mobileShowDetail = isMobile && !!selectedConversationId;

  const handleMobileBack = useCallback(() => {
    setSelectedConversationId(null);
  }, []);

  return (
    <TooltipProvider>
      <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-8rem)] flex flex-col rounded-lg border border-border overflow-hidden bg-background">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-2 md:px-4 py-2 min-h-[44px]">
          <div className="flex items-center gap-1 md:gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSidebar((p) => {
                      const next = !p;
                      localStorage.setItem("inbox-folders-sidebar", next ? "1" : "0");
                      return next;
                    });
                  }}
                  className="h-8 w-8 p-0 hidden md:inline-flex"
                >
                  {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Barra lateral</p></TooltipContent>
            </Tooltip>
            <ComposeButton />
            {/* WhatsApp connection indicator */}
            {whatsappConnection && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                    whatsappConnection.status === "connected"
                      ? "bg-green-500/10 text-green-600"
                      : whatsappConnection.status === "reconnecting"
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-destructive/10 text-destructive"
                  )}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      whatsappConnection.status === "connected"
                        ? "bg-green-500"
                        : whatsappConnection.status === "reconnecting"
                          ? "bg-amber-500 animate-pulse"
                          : "bg-destructive"
                    )} />
                    <Phone className="w-3 h-3" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    WhatsApp: {whatsappConnection.status === "connected"
                      ? "Conectado"
                      : whatsappConnection.status === "reconnecting"
                        ? "A reconectar..."
                        : "Desconectado"}
                    {whatsappConnection.phone_number && ` (${whatsappConnection.phone_number})`}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Center: Search (columns mode) or Metrics */}
          {effectiveViewMode === "columns" ? (
            <div className="flex-1 max-w-md mx-2 md:mx-4 hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar conversas..."
                  value={columnsSearch}
                  onChange={(e) => setColumnsSearch(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
            </div>
          ) : (
            <InboxMetricsBar onFilterUnread={() => setActiveView(activeView === "unread" ? null : "unread")} isUnreadActive={activeView === "unread"} />
          )}

          <div className="flex items-center gap-1">
            {/* Density toggle - hidden on mobile */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleDensity}
                  className="h-8 w-8 p-0 hidden md:inline-flex"
                >
                  {density === "compact" ? <AlignJustify className="w-4 h-4" /> : <List className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{density === "compact" ? "Modo normal" : "Modo compacto"}</p></TooltipContent>
            </Tooltip>
            {/* View mode toggle - hidden on mobile */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleViewMode}
                  className="h-8 w-8 p-0 hidden md:inline-flex"
                >
                  {viewMode === "columns" ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{viewMode === "columns" ? "Vista lista" : "Vista colunas"}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowShortcuts(true)}
                  className="h-8 w-8 p-0 hidden md:inline-flex"
                >
                  <Keyboard className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Atalhos de teclado (?)</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showContextPanel ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowContextPanel(!showContextPanel)}
                  className="h-8 w-8 p-0 hidden md:inline-flex"
                >
                  {showContextPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Painel CRM (P)</p></TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* LEFT — Sidebar (hidden on mobile) */}
          {showSidebar && (
            <div className="w-48 min-h-0 flex-shrink-0 border-r border-border hidden lg:block overflow-hidden">
              <InboxSidebar
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                selectedChannel={selectedChannel}
                onChannelChange={(ch) => {
                  setSelectedChannel(ch);
                  if (ch === "all") {
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.delete("channel");
                      return next;
                    });
                  } else {
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("channel", ch);
                      return next;
                    });
                  }
                }}
                activeView={activeView}
                onViewChange={setActiveView}
              />
            </div>
          )}

          {effectiveViewMode === "columns" ? (
            <>
              {/* Multi-column view */}
              <div className={cn(
                "flex-1 min-h-0 min-w-0",
                selectedConversationId && "hidden xl:flex xl:flex-1"
              )}>
                <SalesInboxColumns
                  conversations={conversations || []}
                  selectedId={selectedConversationId}
                  onSelect={setSelectedConversationId}
                  search={columnsSearch}
                />
              </div>

              {/* Conversation Detail (overlay on smaller screens, side panel on xl) */}
              {selectedConversationId && (
                <div className={cn(
                  "flex-1 min-h-0 min-w-0 xl:max-w-[50%] border-l border-border"
                )}>
                  <ConversationDetail conversationId={selectedConversationId} onBack={isMobile ? handleMobileBack : undefined} />
                </div>
              )}
            </>
          ) : (
            <>
              {/* Classic list view - master-detail on mobile */}
              <div className={cn(
                "min-h-0 border-r border-border",
                isMobile
                  ? "w-full flex-shrink-0"
                  : selectedConversationId
                    ? "w-[240px] md:w-[260px] lg:w-[280px] xl:w-[300px] flex-shrink-0"
                    : "flex-1 min-w-0",
                mobileShowDetail && "hidden"
              )}>

                <ConversationList
                  selectedId={selectedConversationId}
                  onSelect={setSelectedConversationId}
                  defaultChannel={channelParam || undefined}
                  categoryFilter={selectedCategory}
                  channelFilter={selectedChannel !== "all" ? selectedChannel as ConversationChannel : undefined}
                  activeView={activeView}
                  density={density}
                  onToggleDensity={toggleDensity}
                  wrapMode={wrapMode}
                  onToggleWrapMode={toggleWrapMode}
                />
              </div>
              <div className={cn(
                "flex-1 min-h-0 min-w-0 h-full overflow-hidden",
                isMobile && !mobileShowDetail && "hidden"
              )}>
                <ConversationDetail conversationId={selectedConversationId} onBack={isMobile ? handleMobileBack : undefined} />
              </div>
            </>
          )}

          {/* RIGHT — Context Panel (hidden on mobile) */}
          {showContextPanel && (
            <div className="w-80 min-h-0 flex-shrink-0 border-l border-border hidden xl:block overflow-hidden">
              <InboxContextPanel
                conversationId={selectedConversationId}
                onClose={() => setShowContextPanel(false)}
              />
            </div>
          )}
        </div>
      </div>

      <KeyboardShortcutsModal open={showShortcuts} onOpenChange={setShowShortcuts} />
    </TooltipProvider>
  );
}
