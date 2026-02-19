import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface ConversationSignals {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  lead_id: string | null;
  temperature: "cold" | "evaluating" | "ready_to_buy" | "stalling" | "lost" | null;
  close_probability: number | null;
  trust_score: number | null;
  churn_risk: number | null;
  main_objection: "price" | "timing" | "authority" | "competitor" | "uncertainty" | "no_need" | "confusion" | "none" | null;
  next_action: string | null;
  recommended_reply: string | null;
  buying_intent_score: number | null;
  urgency_score: number | null;
  signals_data: {
    key_signals?: string[];
    objection_handling?: string;
    positive_indicators?: string[];
    risk_indicators?: string[];
  } | null;
  last_updated: string;
  created_at: string;
}

export function useConversationSignals(contactId?: string, leadId?: string) {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  const queryKey = ["conversation-signals", contactId || leadId];

  const { data: signals, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!contactId && !leadId) return null;

      let query = supabase
        .from("conversation_signals")
        .select("*");

      if (contactId) {
        query = query.eq("contact_id", contactId);
      } else {
        query = query.eq("lead_id", leadId!);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as ConversationSignals | null;
    },
    enabled: Boolean(contactId || leadId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const recompute = async () => {
    if (!currentWorkspace?.id) {
      toast.error("Workspace não encontrado");
      return;
    }
    if (!contactId && !leadId) return;

    try {
      const body: Record<string, string> = { workspace_id: currentWorkspace.id };
      if (contactId) body.contact_id = contactId;
      if (leadId) body.lead_id = leadId;

      const { data, error } = await supabase.functions.invoke("compute-conversation-signals", {
        body,
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Limite de pedidos AI atingido. Tente novamente mais tarde.");
        } else if (data.error.includes("credits")) {
          toast.error("Créditos AI esgotados. Adicione créditos para continuar.");
        } else {
          toast.error(data.error);
        }
        return;
      }

      await queryClient.invalidateQueries({ queryKey });
      toast.success("Sinais atualizados com sucesso");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao calcular sinais";
      toast.error(message);
    }
  };

  return {
    signals,
    isLoading,
    recompute,
    lastUpdated: signals?.last_updated ? new Date(signals.last_updated) : null,
  };
}
