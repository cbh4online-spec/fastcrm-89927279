import { useEffect, useRef } from "react";
import { useConversations } from "./useConversations";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { generateRequestId } from "@/lib/requestId";

const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48h
const SLA_BREACH_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24h

export function useStaleConversationDetector() {
  const { currentWorkspace } = useWorkspace();
  const { data: conversations } = useConversations({ status: "open" });
  const hasRun = useRef(false);

  useEffect(() => {
    if (!conversations?.length || !currentWorkspace?.id || hasRun.current) return;
    hasRun.current = true;

    const now = Date.now();

    for (const conv of conversations) {
      if (!conv.last_message_at) continue;
      const lastMsg = (conv as any).last_message_direction;
      if (lastMsg !== "inbound") continue;

      const age = now - new Date(conv.last_message_at).getTime();

      if (age > SLA_BREACH_THRESHOLD_MS) {
        const correlationId = generateRequestId();
        const eventType = age > STALE_THRESHOLD_MS ? "CONVERSATION.STALE" : "CONVERSATION.SLA_BREACHED";

        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: eventType,
          entity_kind: "conversation",
          entity_id: conv.id,
          payload: {
            hours_waiting: Math.round(age / 3600000),
            channel: conv.channel,
            lead_id: conv.lead_id,
          },
          source_module: "comm-inbox",
          correlation_id: correlationId,
          idempotency_key: `${eventType.toLowerCase()}-${conv.id}-${new Date().toISOString().slice(0, 10)}`,
        });
      }
    }
  }, [conversations, currentWorkspace?.id]);
}
