import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ConversationAIAnalysis {
  summary: string;
  intent: "price_request" | "meeting_request" | "support" | "complaint" | "buying_signal" | "objection" | "unknown";
  sentiment: "positive" | "neutral" | "negative";
  urgency: "low" | "medium" | "high";
  lead_temperature: "cold" | "warm" | "hot" | "proposal_ready";
  recommended_action: string;
  suggested_reply: string;
  should_create_opportunity: boolean;
  main_objection: string;
  suggested_followup: string;
}

interface AnalysisRow {
  ai_analysis_json: ConversationAIAnalysis | null;
  ai_analysis_at: string | null;
  ai_analysis_message_count: number | null;
}

export function useConversationAIAnalysis(conversationId: string | null | undefined) {
  return useQuery({
    queryKey: ["conversation-ai-analysis", conversationId],
    queryFn: async (): Promise<AnalysisRow | null> => {
      if (!conversationId) return null;
      const { data, error } = await supabase
        .from("conversations" as any)
        .select("ai_analysis_json, ai_analysis_at, ai_analysis_message_count")
        .eq("id", conversationId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as AnalysisRow | null;
    },
    enabled: !!conversationId,
    refetchInterval: 30000,
  });
}

export function useAnalyzeConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { conversationId: string; force?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-conversation-ai-analyze", {
        body: { conversationId: vars.conversationId, force: vars.force ?? true },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha na análise IA");
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["conversation-ai-analysis", vars.conversationId] });
      toast.success("Análise atualizada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
