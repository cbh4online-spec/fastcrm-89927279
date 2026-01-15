import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInHours } from "date-fns";
import { toast } from "sonner";
import { Conversation } from "./useConversations";
import { Message } from "./useMessages";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback } from "react";

export type FollowupStatus = "pending" | "snoozed" | "sent" | "dismissed" | "approved";

export type FollowupTriggerType = "no_reply" | "proposal_viewed" | "hot_stalled" | "general";

export interface ConversationFollowup {
  id: string;
  workspace_id: string;
  conversation_id: string;
  lead_id: string | null;
  status: FollowupStatus;
  hours_since_last_reply: number;
  suggested_at: string;
  snooze_until: string | null;
  prepared_message: string | null;
  template_id: string | null;
  approved_at: string | null;
  approved_by: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowupSuggestion {
  conversationId: string;
  leadId: string | null;
  leadName: string | null;
  hoursSinceReply: number;
  urgencyLevel: "suggest" | "prepare" | "urgent";
  triggerType: FollowupTriggerType;
  message: string;
  context?: {
    proposalTitle?: string;
    proposalValue?: number;
    proposalViewCount?: number;
    temperatureScore?: number;
  };
  existingFollowup?: ConversationFollowup;
}

export interface FollowupDraft {
  draftMessage: string;
  subject: string | null;
  tone: "formal" | "friendly" | "empathetic" | "professional";
  reasoning: string;
  triggerType: FollowupTriggerType;
}

export interface ProposalContext {
  id: string;
  title: string;
  price: number | null;
  views_count: number;
  status: string;
  created_at: string;
}

// Check if a conversation needs follow-up with enhanced detection
export function analyzeFollowupNeed(
  conversation: Conversation,
  messages: Message[],
  proposalContext?: ProposalContext,
  temperatureScore?: number
): FollowupSuggestion | null {
  if (conversation.status !== "open") return null;

  // Get last outbound message (our reply)
  const lastOutbound = [...messages]
    .reverse()
    .find((m) => m.direction === "outbound");

  // Get last inbound message (their message)
  const lastInbound = [...messages]
    .reverse()
    .find((m) => m.direction === "inbound");

  if (!lastOutbound) return null;

  const lastOutboundTime = new Date(lastOutbound.sent_at).getTime();
  const lastInboundTime = lastInbound ? new Date(lastInbound.sent_at).getTime() : 0;

  // We sent the last message and they haven't replied
  if (lastOutboundTime > lastInboundTime) {
    const hoursSinceReply = differenceInHours(new Date(), new Date(lastOutbound.sent_at));

    // TRIGGER 1: Proposal viewed but no reply
    if (proposalContext && proposalContext.views_count > 0 && hoursSinceReply >= 12) {
      return {
        conversationId: conversation.id,
        leadId: conversation.lead_id,
        leadName: conversation.lead?.name || null,
        hoursSinceReply,
        urgencyLevel: hoursSinceReply >= 48 ? "urgent" : hoursSinceReply >= 24 ? "prepare" : "suggest",
        triggerType: "proposal_viewed",
        message: `Proposta "${proposalContext.title}" visualizada ${proposalContext.views_count}x sem resposta`,
        context: {
          proposalTitle: proposalContext.title,
          proposalValue: proposalContext.price || undefined,
          proposalViewCount: proposalContext.views_count,
          temperatureScore,
        },
      };
    }

    // TRIGGER 2: Hot conversation stalled (was hot, now cooling)
    if (temperatureScore && temperatureScore >= 60 && hoursSinceReply >= 24) {
      return {
        conversationId: conversation.id,
        leadId: conversation.lead_id,
        leadName: conversation.lead?.name || null,
        hoursSinceReply,
        urgencyLevel: hoursSinceReply >= 72 ? "urgent" : hoursSinceReply >= 48 ? "prepare" : "suggest",
        triggerType: "hot_stalled",
        message: `Conversa quente (score ${temperatureScore}) parou há ${hoursSinceReply}h`,
        context: { temperatureScore },
      };
    }

    // TRIGGER 3: Standard no reply timeout
    if (hoursSinceReply >= 24) {
      return {
        conversationId: conversation.id,
        leadId: conversation.lead_id,
        leadName: conversation.lead?.name || null,
        hoursSinceReply,
        urgencyLevel: hoursSinceReply >= 72 ? "urgent" : hoursSinceReply >= 48 ? "prepare" : "suggest",
        triggerType: "no_reply",
        message:
          hoursSinceReply >= 72
            ? "Urgente! Sem resposta há mais de 72h"
            : hoursSinceReply >= 48
            ? "Automação preparou mensagem - requer aprovação"
            : "Sem resposta há mais de 24h - sugerir follow-up",
        context: { temperatureScore },
      };
    }
  }

  return null;
}

// Hook to generate AI follow-up draft
export function useGenerateFollowupDraft() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateDraft = useCallback(
    async (
      messages: Message[],
      context: {
        triggerType: FollowupTriggerType;
        hoursSinceLastMessage: number;
        proposalTitle?: string;
        proposalValue?: number;
        proposalViewCount?: number;
        temperatureScore?: number;
        leadName?: string;
        leadEmail?: string;
        channel: string;
      }
    ): Promise<FollowupDraft | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const formattedMessages = messages.map((m) => ({
          direction: m.direction,
          content: m.content,
        }));

        const { data, error: fnError } = await supabase.functions.invoke("ai-followup-draft", {
          body: { messages: formattedMessages, context },
        });

        if (fnError) {
          throw new Error(fnError.message);
        }

        if (data?.error) {
          if (data.error.includes("Rate limit")) {
            toast.error("Limite de pedidos AI atingido. Tente novamente mais tarde.");
          } else if (data.error.includes("credits")) {
            toast.error("Créditos AI esgotados. Adicione créditos para continuar.");
          } else {
            toast.error(data.error);
          }
          setError(data.error);
          return null;
        }

        return data as FollowupDraft;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao gerar rascunho";
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { generateDraft, isLoading, error };
}

// Get all followups for workspace
export function useFollowups(conversationId?: string) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["followups", currentWorkspace?.id, conversationId],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("conversation_followups")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (conversationId) {
        query = query.eq("conversation_id", conversationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ConversationFollowup[];
    },
    enabled: !!currentWorkspace,
  });
}

// Get pending followups for workspace
export function usePendingFollowups() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["pending_followups", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await workspaceClient
        .from("conversation_followups")
        .select(`
          *,
          conversation:conversations(
            id, channel, lead_id, status,
            lead:leads(id, name, email, phone)
          )
        `)
        .eq("workspace_id", currentWorkspace.id)
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (ConversationFollowup & {
        conversation: {
          id: string;
          channel: string;
          lead_id: string | null;
          status: string;
          lead: { id: string; name: string; email: string | null; phone: string | null } | null;
        };
      })[];
    },
    enabled: !!currentWorkspace,
  });
}

// Create a followup suggestion
export function useCreateFollowup() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({
      conversationId,
      leadId,
      hoursSinceReply,
      preparedMessage,
      templateId,
    }: {
      conversationId: string;
      leadId?: string | null;
      hoursSinceReply: number;
      preparedMessage?: string;
      templateId?: string;
    }) => {
      if (!currentWorkspace) throw new Error("No workspace");

      const { data, error } = await workspaceClient
        .from("conversation_followups")
        .insert({
          workspace_id: currentWorkspace.id,
          conversation_id: conversationId,
          lead_id: leadId || null,
          hours_since_last_reply: hoursSinceReply,
          prepared_message: preparedMessage || null,
          template_id: templateId || null,
          status: preparedMessage ? "approved" : "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data as ConversationFollowup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followups"] });
      queryClient.invalidateQueries({ queryKey: ["pending_followups"] });
    },
  });
}

// Snooze a followup
export function useSnoozeFollowup() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({
      followupId,
      snoozeUntil,
    }: {
      followupId: string;
      snoozeUntil: Date;
    }) => {
      const { data, error } = await workspaceClient
        .from("conversation_followups")
        .update({
          status: "snoozed",
          snooze_until: snoozeUntil.toISOString(),
        })
        .eq("id", followupId)
        .select()
        .single();

      if (error) throw error;
      return data as ConversationFollowup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followups"] });
      queryClient.invalidateQueries({ queryKey: ["pending_followups"] });
      toast.success("Follow-up adiado");
    },
    onError: (error) => {
      toast.error(`Erro ao adiar: ${error.message}`);
    },
  });
}

// Approve a followup message
export function useApproveFollowup() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      followupId,
      message,
    }: {
      followupId: string;
      message: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await workspaceClient
        .from("conversation_followups")
        .update({
          status: "approved",
          prepared_message: message,
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq("id", followupId)
        .select()
        .single();

      if (error) throw error;
      return data as ConversationFollowup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followups"] });
      queryClient.invalidateQueries({ queryKey: ["pending_followups"] });
      toast.success("Mensagem aprovada");
    },
    onError: (error) => {
      toast.error(`Erro ao aprovar: ${error.message}`);
    },
  });
}

// Dismiss a followup
export function useDismissFollowup() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (followupId: string) => {
      const { data, error } = await workspaceClient
        .from("conversation_followups")
        .update({ status: "dismissed" })
        .eq("id", followupId)
        .select()
        .single();

      if (error) throw error;
      return data as ConversationFollowup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followups"] });
      queryClient.invalidateQueries({ queryKey: ["pending_followups"] });
      toast.success("Sugestão descartada");
    },
  });
}

// Mark followup as sent
export function useMarkFollowupSent() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (followupId: string) => {
      const { data, error } = await workspaceClient
        .from("conversation_followups")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", followupId)
        .select()
        .single();

      if (error) throw error;
      return data as ConversationFollowup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followups"] });
      queryClient.invalidateQueries({ queryKey: ["pending_followups"] });
    },
  });
}
