import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface EnrichmentField {
  value: string;
  confidence: "high" | "medium" | "low";
  source: string;
}

export interface ContactEnrichmentResult {
  fullName?: EnrichmentField;
  company?: EnrichmentField;
  jobTitle?: EnrichmentField;
  preferredChannel?: EnrichmentField;
  country?: EnrichmentField;
  language?: EnrichmentField;
  companyWebsite?: string;
}

export interface ContactInsights {
  summary: string[];
  engagementLevel: "cold" | "warm" | "hot";
  bestChannel: string | null;
  suggestedActions: Array<{
    type: "send_message" | "create_opportunity" | "schedule_followup" | "add_tags";
    label: string;
    priority: "high" | "medium" | "low";
    reason: string;
  }>;
  riskFlags: Array<{
    type: "no_reply" | "missing_channel" | "duplicate" | "stale" | "incomplete";
    message: string;
    severity: "warning" | "error";
  }>;
  buyingIntent: "none" | "low" | "medium" | "high";
  personalizedMessage?: string;
}

export function useContactEnrichment() {
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: { name?: string; email?: string; phone?: string }): Promise<ContactEnrichmentResult | null> => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      const { data, error } = await supabase.functions.invoke("contact-enrich", {
        body: { ...input, workspaceId: currentWorkspace.id },
      });

      if (error) {
        console.error("Enrichment error:", error);
        throw new Error(error.message || "Erro ao enriquecer dados");
      }

      if (!data.success) {
        throw new Error(data.error || "Erro ao enriquecer dados");
      }

      return data.data;
    },
    onError: (error) => {
      console.error("Enrichment failed:", error);
      toast.error(error.message || "Não foi possível enriquecer os dados");
    },
  });
}

export function useContactInsights(contactId: string | undefined) {
  return useQuery({
    queryKey: ["contact-insights", contactId],
    queryFn: async (): Promise<ContactInsights | null> => {
      if (!contactId) return null;

      const { data, error } = await supabase.functions.invoke("contact-insights", {
        body: { contactId },
      });

      if (error) {
        console.error("Insights error:", error);
        throw new Error(error.message || "Erro ao obter insights");
      }

      if (!data.success) {
        throw new Error(data.error || "Erro ao obter insights");
      }

      return data.data;
    },
    enabled: !!contactId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

export function useRefreshContactInsights() {
  return useMutation({
    mutationFn: async (contactId: string): Promise<ContactInsights | null> => {
      const { data, error } = await supabase.functions.invoke("contact-insights", {
        body: { contactId },
      });

      if (error) {
        console.error("Insights error:", error);
        throw new Error(error.message || "Erro ao obter insights");
      }

      if (!data.success) {
        throw new Error(data.error || "Erro ao obter insights");
      }

      return data.data;
    },
    onError: (error) => {
      console.error("Insights failed:", error);
    },
  });
}

export function useGenerateContactMessage() {
  return useMutation({
    mutationFn: async ({ 
      contactId, 
      contactName, 
      context 
    }: { 
      contactId: string; 
      contactName: string;
      context?: string;
    }): Promise<string> => {
      const { data, error } = await supabase.functions.invoke("contact-insights", {
        body: { contactId, generateMessage: true, contactName, context },
      });

      if (error) {
        console.error("Message generation error:", error);
        throw new Error(error.message || "Erro ao gerar mensagem");
      }

      if (!data.success) {
        throw new Error(data.error || "Erro ao gerar mensagem");
      }

      return data.data?.personalizedMessage || "Olá! Como posso ajudá-lo hoje?";
    },
    onError: (error) => {
      console.error("Message generation failed:", error);
      toast.error("Não foi possível gerar a mensagem");
    },
  });
}
