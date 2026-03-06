import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ConversationList } from "./ConversationList";
import { ConversationDetail } from "./ConversationDetail";
import { InboxContextPanel } from "./InboxContextPanel";
import { InboxSidebar, InboxCategory, ChannelFilter } from "./InboxSidebar";
import { ComposeButton } from "./ComposeButton";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { ConversationChannel } from "@/hooks/useConversations";
import { useConversations, useUpdateConversationStatus } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { PanelRightClose, PanelRight, PanelLeftClose, PanelLeft, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { useGHLConversationSync } from "@/hooks/useGHLConversationSync";
import { useWorkspaceGHLConfig } from "@/hooks/useWorkspaceGHLConfig";
import { useSyncEmail, useActiveEmailConnection } from "@/hooks/useEmailConnection";
import { useStaleConversationDetector } from "@/hooks/useStaleConversationDetector";
import { useInboxHotkeys } from "@/hooks/useInboxHotkeys";
import { InboxMetricsBar } from "./InboxMetricsBar";
import { toast } from "sonner";

export function InboxView() {
  const [searchParams] = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<InboxCategory>("all");
  const [selectedChannel, setSelectedChannel] = useState<ChannelFilter>("all");
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Get channel filter from URL params
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

  // Build ordered conversation IDs for J/K navigation
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

  // Auto-sync on mount (once)
  const hasSyncedRef = useRef(false);
  useEffect(() => {
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    if (isGHLConfigured) syncConversations(true, 2);
    if (emailConnection?.id) syncEmail.mutate(emailConnection.id);
  }, [isGHLConfigured, emailConnection?.id]);

  // ── Analytics ──
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

  // ── Keyboard shortcuts ──
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
    onReply: () => {
      // Focus will be handled by ConversationDetail's composer ref
    },
  });

  return (
    <TooltipProvider>
      <div className="h-[calc(100vh-8rem)] flex flex-col rounded-lg border border-border overflow-hidden bg-background">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="h-8 w-8 p-0"
                >
                  {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Barra lateral [{"]"}</p></TooltipContent>
            </Tooltip>
            <ComposeButton />
          </div>

          <InboxMetricsBar />

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowShortcuts(true)}
                  className="h-8 w-8 p-0"
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
                  className="h-8 w-8 p-0"
                >
                  {showContextPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Painel CRM (P)</p></TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* 4-Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT — Sidebar (240px, collapsible) */}
          {showSidebar && (
            <div className="w-60 flex-shrink-0 border-r border-border hidden lg:block">
              <InboxSidebar
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                selectedChannel={selectedChannel}
                onChannelChange={setSelectedChannel}
              />
            </div>
          )}

          {/* CENTER-LEFT — Conversation List (320px) */}
          <div className={cn("flex-shrink-0 border-r border-border", showSidebar ? "w-80" : "w-96")}>
            <ConversationList
              selectedId={selectedConversationId}
              onSelect={setSelectedConversationId}
              defaultChannel={channelParam || undefined}
              categoryFilter={selectedCategory}
              channelFilter={selectedChannel !== "all" ? selectedChannel as ConversationChannel : undefined}
            />
          </div>

          {/* CENTER — Conversation Detail (flex) */}
          <div className="flex-1 min-w-0">
            <ConversationDetail conversationId={selectedConversationId} />
          </div>

          {/* RIGHT — Context Panel (320px, collapsible) */}
          {showContextPanel && (
            <div className="w-80 flex-shrink-0 border-l border-border hidden xl:block">
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
