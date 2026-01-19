import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EnrichmentField {
  value: string;
  confidence: "high" | "medium" | "low";
  source: string;
}

export interface EnrichmentResult {
  // Basic fields
  industry?: EnrichmentField;
  size?: EnrichmentField;
  phone?: EnrichmentField;
  email?: EnrichmentField;
  address?: EnrichmentField;
  description?: EnrichmentField;
  website?: EnrichmentField;
  socialLinks?: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  // Rich context fields for company analysis
  about_us?: EnrichmentField;
  services?: EnrichmentField;
  products?: EnrichmentField;
  clients?: EnrichmentField;
  team_info?: EnrichmentField;
  mission_values?: EnrichmentField;
  differentiators?: EnrichmentField;
  certifications?: EnrichmentField;
  target_market?: EnrichmentField;
  year_founded?: EnrichmentField;
}

export interface EnrichCompanyInput {
  website?: string;
  email?: string;
  companyName?: string;
}

export function useCompanyEnrichment() {
  return useMutation({
    mutationFn: async (input: EnrichCompanyInput): Promise<EnrichmentResult | null> => {
      const { data, error } = await supabase.functions.invoke("company-enrich", {
        body: input,
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

export function useCompanyInsights() {
  return useMutation({
    mutationFn: async (companyId: string) => {
      const { data, error } = await supabase.functions.invoke("company-insights", {
        body: { companyId },
      });

      if (error) {
        console.error("Insights error:", error);
        throw new Error(error.message || "Erro ao gerar insights");
      }

      if (!data.success) {
        throw new Error(data.error || "Erro ao gerar insights");
      }

      return data.data;
    },
    onError: (error) => {
      console.error("Insights failed:", error);
    },
  });
}
