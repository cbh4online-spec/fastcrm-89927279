import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ConversationList } from "./ConversationList";
import { ConversationDetail } from "./ConversationDetail";
import { InboxContextPanel } from "./InboxContextPanel";
import { ComposeButton } from "./ComposeButton";
import { AutopilotToggle } from "./AutopilotToggle";
import { ConversationChannel } from "@/hooks/useConversations";
import { useConversations } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { PanelRightClose, PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";

export function InboxView() {
  const [searchParams] = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showContextPanel, setShowContextPanel] = useState(false);

  // Get channel filter from URL params
  const channelParam = searchParams.get("channel") as ConversationChannel | null;

  const { data: conversations } = useConversations();
  const openCount = conversations?.filter(c => c.status === "open").length || 0;

  // ── Analytics: inbox.opened ──
  const { trackInboxOpened } = useCRMAnalytics();
  const inboxTracked = useRef(false);

  useEffect(() => {
    if (!conversations || inboxTracked.current) return;
    inboxTracked.current = true;

    const open = conversations.filter(c => c.status === "open");
    trackInboxOpened({
      total_conversations: conversations.length,
      requires_response_count: open.filter(c => c.unread_count > 0).length,
      follow_up_count: 0,
      active_opportunity_count: conversations.filter(c => (c as any).opportunity).length,
      sla_risk_count: open.filter(c => (c as any).conversation_priority_score > 70).length,
    });
  }, [conversations, trackInboxOpened]);

  return (
    <TooltipProvider>
      <div className="h-[calc(100vh-8rem)] flex flex-col rounded-lg border border-border overflow-hidden bg-background">
        {/* Minimal Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
          <div className="flex items-center gap-3">
            <ComposeButton />
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{openCount}</span> abertas
            </span>
          </div>

          <div className="flex items-center gap-2">
            <AutopilotToggle variant="badge" />
            <Button
              variant={showContextPanel ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowContextPanel(!showContextPanel)}
              className="h-8 w-8 p-0"
            >
              {showContextPanel ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRight className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT — Conversation List (25%) */}
          <div className="w-80 flex-shrink-0 border-r border-border">
            <ConversationList
              selectedId={selectedConversationId}
              onSelect={setSelectedConversationId}
              defaultChannel={channelParam || undefined}
            />
          </div>

          {/* CENTER — Conversation Detail (flex) */}
          <div className="flex-1 min-w-0">
            <ConversationDetail conversationId={selectedConversationId} />
          </div>

          {/* RIGHT — Context Panel (25%, collapsible) */}
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
    </TooltipProvider>
  );
}
