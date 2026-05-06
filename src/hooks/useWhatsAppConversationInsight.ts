import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type InsightIntent =
  | "sales_interest"
  | "product_question"
  | "price_question"
  | "support_request"
  | "complaint"
  | "appointment_request"
  | "follow_up_needed"
  | "payment_question"
  | "delivery_question"
  | "cancellation_risk"
  | "reactivation"
  | "partnership"
  | "spam"
  | "other";

export type InsightSentiment = "positive" | "neutral" | "negative" | "urgent";
export type InsightUrgency = "low" | "medium" | "high" | "critical";
export type InsightStage =
  | "new_lead"
  | "qualification"
  | "proposal"
  | "negotiation"
  | "support"
  | "post_sale"
  | "inactive"
  | "resolved";

export type ObjectionType =
  | "price"
  | "trust"
  | "timing"
  | "need"
  | "comparison"
  | "authority"
  | "complexity"
  | "risk"
  | "other";

export interface ConversationObjection {
  objection_type: ObjectionType;
  description: string;
  suggested_response: string;
}

export interface SuggestedProduct {
  product_id?: string | null;
  product_name: string;
  reason: string;
  confidence: number;
}

export interface SuggestedTask {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
}

export interface SuggestedTicket {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
}

export interface SuggestedDeal {
  title: string;
  stage: string;
  value_estimate?: number | null;
  reason: string;
}

export interface WhatsAppConversationInsight {
  id: string;
  workspace_id: string;
  conversation_id: string;
  contact_id: string | null;
  lead_id: string | null;
  summary: string | null;
  intent: InsightIntent | null;
  sentiment: InsightSentiment | null;
  urgency: InsightUrgency | null;
  conversation_stage: InsightStage | null;
  objections: ConversationObjection[];
  suggested_reply: string | null;
  suggested_next_action: string | null;
  suggested_products: SuggestedProduct[];
  suggested_task: SuggestedTask | null;
  suggested_ticket: SuggestedTicket | null;
  suggested_deal: SuggestedDeal | null;
  suggested_tags: string[];
  confidence: number | null;
  analyzed_message_count: number | null;
  last_message_id: string | null;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type RewriteVariant =
  | "shorter"
  | "professional"
  | "empathetic"
  | "sales"
  | "direct"
  | "with_cta"
  | "without_cta";

export function useWhatsAppConversationInsight(conversationId: string | null | undefined) {
  return useQuery({
    queryKey: ["whatsapp-conversation-insight", conversationId],
    queryFn: async (): Promise<WhatsAppConversationInsight | null> => {
      if (!conversationId) return null;
      const { data, error } = await supabase
        .from("whatsapp_conversation_insights" as any)
        .select("*")
        .eq("conversation_id", conversationId)
        .maybeSingle();
      if (error) {
        console.warn("[useWhatsAppConversationInsight]", error.message);
        return null;
      }
      return (data as unknown) as WhatsAppConversationInsight | null;
    },
    enabled: !!conversationId,
    staleTime: 30_000,
  });
}

export function useAnalyzeWhatsAppConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      conversationId: string;
      force?: boolean;
      triggerType?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-conversation-ai-analyze",
        {
          body: {
            conversationId: vars.conversationId,
            force: vars.force ?? true,
            trigger_type: vars.triggerType ?? "manual",
          },
        },
      );
      if (error) throw error;
      if (!data?.ok) {
        if (data?.code === "rate_limit") {
          throw new Error("Limite de pedidos AI atingido. Tente novamente em instantes.");
        }
        if (data?.code === "no_credits") {
          throw new Error("Créditos AI esgotados. Adicione créditos para continuar.");
        }
        throw new Error(data?.error || "Não foi possível analisar a conversa");
      }
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-conversation-insight", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["conversation-ai-analysis", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["whatsapp-insight-runs", vars.conversationId] });
      toast.success("Análise atualizada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRewriteReply() {
  return useMutation({
    mutationFn: async (vars: { text: string; variant: RewriteVariant; context?: string }) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-rewrite-reply", {
        body: vars,
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha na reescrita");
      return data.text as string;
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useWhatsAppInsightRuns(conversationId: string | null | undefined, limit = 20) {
  return useQuery({
    queryKey: ["whatsapp-insight-runs", conversationId, limit],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("whatsapp_conversation_insight_runs" as any)
        .select("id, trigger_type, input_message_count, success, error, duration_ms, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        console.warn("[useWhatsAppInsightRuns]", error.message);
        return [];
      }
      return (data as any[]) || [];
    },
    enabled: !!conversationId,
  });
}
