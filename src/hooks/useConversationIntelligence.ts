import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Message } from "@/hooks/useMessages";

export interface BuyingIntent {
  level: "high" | "medium" | "low" | "none";
  signals: string[];
  confidence: number;
}

export interface Objections {
  detected: boolean;
  list: string[];
  suggestedResponses: string[];
}

export interface Urgency {
  level: "high" | "medium" | "low";
  indicators: string[];
}

export interface DropOffRisk {
  level: "high" | "medium" | "low";
  factors: string[];
  daysInactive?: number;
}

export interface SuggestedNextStep {
  action: string;
  reason: string;
  microcopy: string;
}

export interface ConversationIntelligence {
  buyingIntent: BuyingIntent;
  objections: Objections;
  urgency: Urgency;
  dropOffRisk: DropOffRisk;
  suggestedNextStep: SuggestedNextStep;
  tags: string[];
  alerts: string[];
}

export interface LeadData {
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  source?: string;
  tags?: string[];
}

export interface OpportunityData {
  title?: string;
  value?: number;
  stage?: string;
  status?: string;
}

export function useConversationIntelligence() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intelligence, setIntelligence] = useState<ConversationIntelligence | null>(null);

  const analyzeConversation = useCallback(
    async (
      messages: Message[],
      leadData?: LeadData,
      opportunityData?: OpportunityData,
      channel?: string,
      lastMessageAt?: string
    ): Promise<ConversationIntelligence | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const formattedMessages = messages.map(m => ({
          direction: m.direction,
          content: m.content,
        }));

        const { data, error: fnError } = await supabase.functions.invoke(
          "conversation-intelligence",
          {
            body: {
              messages: formattedMessages,
              leadData,
              opportunityData,
              channel,
              lastMessageAt,
            },
          }
        );

        if (fnError) {
          throw new Error(fnError.message);
        }

        if (data?.error) {
          if (data.error.includes("Rate limit")) {
            toast.error("Limite de pedidos AI atingido. Tente novamente mais tarde.");
          } else if (data.error.includes("credits") || data.error.includes("Payment")) {
            toast.error("Créditos AI esgotados. Adicione créditos para continuar.");
          } else {
            toast.error(data.error);
          }
          setError(data.error);
          return null;
        }

        setIntelligence(data);
        return data as ConversationIntelligence;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao analisar conversa";
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearIntelligence = useCallback(() => {
    setIntelligence(null);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    intelligence,
    analyzeConversation,
    clearIntelligence,
  };
}
