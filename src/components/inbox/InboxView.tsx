import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ConversationList } from "./ConversationList";
import { ConversationDetail } from "./ConversationDetail";
import { InboxCRMPanel } from "./InboxCRMPanel";
import { InboxMetricsBar } from "./InboxMetricsBar";
import { ConversationChannel } from "@/hooks/useConversations";

export function InboxView() {
  const [searchParams] = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  
  // Get channel filter from URL params
  const channelParam = searchParams.get("channel") as ConversationChannel | null;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col rounded-lg border border-border overflow-hidden">
      {/* Metrics Bar */}
      <InboxMetricsBar />
      
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

        {/* CRM Context Panel */}
        <div className="w-80 flex-shrink-0 border-l border-border hidden xl:block">
          <InboxCRMPanel conversationId={selectedConversationId} />
        </div>
      </div>
    </div>
  );
}
