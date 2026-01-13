import { useState } from "react";
import { ConversationList } from "./ConversationList";
import { ConversationDetail } from "./ConversationDetail";

export function InboxView() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-lg border border-border overflow-hidden">
      {/* Conversation List */}
      <div className="w-80 flex-shrink-0">
        <ConversationList
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
        />
      </div>

      {/* Conversation Detail */}
      <ConversationDetail conversationId={selectedConversationId} />
    </div>
  );
}
