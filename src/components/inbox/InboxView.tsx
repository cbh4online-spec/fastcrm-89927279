import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ConversationList } from "./ConversationList";
import { ConversationDetail } from "./ConversationDetail";
import { InboxCRMPanel } from "./InboxCRMPanel";
import { InboxMetricsBar } from "./InboxMetricsBar";
import { InboxFollowupPanel } from "./InboxFollowupPanel";
import { SmartAlertsPopover } from "./SmartAlertsPopover";
import { ConversationChannel } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePendingFollowups } from "@/hooks/useFollowups";
import { useSmartAlerts } from "@/hooks/useSmartAlerts";
import { useAlertDetection } from "@/hooks/useAlertDetection";
import { Badge } from "@/components/ui/badge";

export function InboxView() {
  const [searchParams] = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showFollowups, setShowFollowups] = useState(false);
  
  // Get channel filter from URL params
  const channelParam = searchParams.get("channel") as ConversationChannel | null;

  // Run alert detection
  useAlertDetection();

  const { data: pendingFollowups } = usePendingFollowups();
  const { data: smartAlerts } = useSmartAlerts(5);
  const followupCount = pendingFollowups?.length || 0;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col rounded-lg border border-border overflow-hidden">
      {/* Metrics Bar with Follow-up Toggle and Smart Alerts */}
      <div className="flex items-center border-b border-border">
        <div className="flex-1">
          <InboxMetricsBar />
        </div>
        <div className="flex items-center gap-2 px-4">
          {/* Smart Alerts Popover */}
          <SmartAlertsPopover />
          
          {/* Follow-ups Toggle */}
          <Button
            variant={showFollowups ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowFollowups(!showFollowups)}
            className="gap-2"
          >
            <Bell className={cn("w-4 h-4", followupCount > 0 && "text-amber-500")} />
            <span className="hidden sm:inline">Follow-ups</span>
            {followupCount > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                {followupCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List */}
        <div className="w-80 flex-shrink-0 border-r border-border">
          <ConversationList
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
            defaultChannel={channelParam}
          />
        </div>

        {/* Conversation Detail */}
        <div className="flex-1">
          <ConversationDetail conversationId={selectedConversationId} />
        </div>

        {/* CRM Context Panel or Follow-up Panel */}
        <div className="w-80 flex-shrink-0 border-l border-border hidden xl:block">
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
