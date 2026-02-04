import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ConversationList } from "./ConversationList";
import { ConversationDetail } from "./ConversationDetail";
import { InboxCRMPanel } from "./InboxCRMPanel";
import { InboxMetricsBar } from "./InboxMetricsBar";
import { InboxFollowupPanel } from "./InboxFollowupPanel";
import { InboxSidebar, InboxCategory, ChannelFilter } from "./InboxSidebar";
import { ComposeButton } from "./ComposeButton";
import { ConversationChannel } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { Bell, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePendingFollowups } from "@/hooks/useFollowups";
import { useSmartAlerts } from "@/hooks/useSmartAlerts";
import { useAlertDetection } from "@/hooks/useAlertDetection";
import { Badge } from "@/components/ui/badge";

export function InboxView() {
  const [searchParams] = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showFollowups, setShowFollowups] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<InboxCategory>("all");
  const [selectedChannel, setSelectedChannel] = useState<ChannelFilter>("all");
  
  // Get channel filter from URL params
  const channelParam = searchParams.get("channel") as ConversationChannel | null;

  // Run alert detection
  useAlertDetection();

  const { data: pendingFollowups } = usePendingFollowups();
  const { data: smartAlerts } = useSmartAlerts(5);
  const followupCount = pendingFollowups?.length || 0;

  // Convert category to status/filter props for ConversationList
  const getStatusFromCategory = (cat: InboxCategory) => {
    switch (cat) {
      case "closed": return "closed";
      case "archives": return "archived";
      default: return "open";
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col rounded-lg border border-border overflow-hidden bg-background">
      {/* Header Bar - Simplified */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        {/* Left: Compose + Toggle */}
        <div className="flex items-center gap-2">
          <ComposeButton />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
            className="h-8 w-8 p-0"
          >
            {showSidebar ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {/* Center: Metrics */}
        <InboxMetricsBar />
        
        {/* Right: Follow-ups Toggle */}
        <Button
          variant={showFollowups ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setShowFollowups(!showFollowups)}
          className="gap-1.5 h-8"
        >
          <Bell className={cn("w-4 h-4", followupCount > 0 && "text-amber-500")} />
          <span className="hidden sm:inline text-xs">Follow-ups</span>
          {followupCount > 0 && (
            <Badge className="bg-green-500 text-white text-xs px-1.5 py-0 h-5">
              {followupCount}
            </Badge>
          )}
        </Button>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar */}
        {showSidebar && (
          <div className="w-52 flex-shrink-0 border-r border-border bg-card hidden lg:block">
            <InboxSidebar
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedChannel={selectedChannel}
              onChannelChange={setSelectedChannel}
            />
          </div>
        )}

        {/* Conversation List */}
        <div className="w-72 flex-shrink-0 border-r border-border">
          <ConversationList
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
            defaultChannel={channelParam || (selectedChannel !== "all" ? selectedChannel : null)}
            defaultStatus={getStatusFromCategory(selectedCategory)}
            selectedCategory={selectedCategory}
            externalChannelFilter={selectedChannel}
          />
        </div>

        {/* Conversation Detail */}
        <div className="flex-1 min-w-0">
          <ConversationDetail conversationId={selectedConversationId} />
        </div>

        {/* CRM Context Panel or Follow-up Panel */}
        <div className="w-72 flex-shrink-0 border-l border-border hidden xl:block">
          {showFollowups ? (
            <InboxFollowupPanel onSelectConversation={setSelectedConversationId} />
          ) : (
            <InboxCRMPanel conversationId={selectedConversationId} />
          )}
        </div>
      </div>
    </div>
  );
}
