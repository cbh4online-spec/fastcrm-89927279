import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import type { Json } from "@/integrations/supabase/types";

export type SubscriptionEventType =
  | "created"
  | "payment_succeeded"
  | "payment_failed"
  | "paused"
  | "resumed"
  | "canceled"
  | "renewed"
  | "plan_changed"
  | "manual_adjustment";

export interface CreateSubscriptionEventInput {
  subscription_id: string;
  event_type: SubscriptionEventType;
  amount?: number;
  currency?: string;
  occurred_at?: string;
  raw_payload?: Json;
  notes?: string;
}

export function useCreateSubscriptionEvent() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: CreateSubscriptionEventInput) => {
      if (!workspaceClient || !currentWorkspace) {
        throw new Error("Workspace not available");
      }

      const insertData = {
        subscription_id: input.subscription_id,
        event_type: input.event_type as "canceled" | "created" | "manual_adjustment" | "paused" | "payment_failed" | "payment_succeeded" | "plan_changed" | "renewed" | "resumed",
        amount: input.amount ?? null,
        currency: input.currency ?? "EUR",
        occurred_at: input.occurred_at || new Date().toISOString(),
        raw_payload: input.raw_payload ?? null,
        notes: input.notes ?? null,
        workspace_id: currentWorkspace.id,
      };

      const { data, error } = await workspaceClient
        .from("subscription_events")
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["subscription-events", data.subscription_id],
      });
      console.info('[B2B-FINANCE] SUBSCRIPTION_EVENT_LOGGED', data.event_type, data.subscription_id);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'B2B.SUBSCRIPTION_EVENT_LOGGED',
          entity_kind: 'subscription_event',
          entity_id: data.id,
          source_module: 'b2b-finance',
          payload: { event_type: data.event_type, subscription_id: data.subscription_id },
        });
      }
    },
    onError: (error) => {
      console.error("[B2B-FINANCE] SUBSCRIPTION_EVENT_FAILED", error.message);
      toast.error("Erro ao registar evento");
    },
  });
}

// Helper to log subscription events after mutations
export function useLogSubscriptionEvent() {
  const createEvent = useCreateSubscriptionEvent();

  return {
    logEvent: (
      subscriptionId: string,
      eventType: SubscriptionEventType,
      options?: {
        amount?: number;
        notes?: string;
        payload?: Json;
      }
    ) => {
      createEvent.mutate({
        subscription_id: subscriptionId,
        event_type: eventType,
        amount: options?.amount,
        notes: options?.notes,
        raw_payload: options?.payload,
      });
    },
    isPending: createEvent.isPending,
  };
}
