import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SocialMediaAnalysis {
  digitalMaturity: "low" | "medium" | "high";
  digitalMaturityReason: string;
  linkedinData?: {
    followers: number | null;
    employeeCount: number | null;
    recentActivity: string[];
    keyPeople: Array<{ name: string; role: string; profileUrl?: string }>;
    industries: string[];
    specialties: string[];
    description: string | null;
  };
  instagramData?: {
    followers: number | null;
    postsCount: number | null;
    contentType: string;
    recentActivity: string[];
  };
  facebookData?: {
    followers: number | null;
    rating: number | null;
    reviewsCount: number | null;
    recentActivity: string[];
  };
  salesInsights: {
    preferredChannel: "linkedin" | "email" | "phone" | "instagram";
    approachStrategy: string;
    keyDecisionMakers: Array<{ name: string; role: string; linkedinUrl?: string }>;
    engagementOpportunities: string[];
    bestTimeToContact?: string;
  };
  warnings: string[];
}

interface AnalyzeSocialMediaInput {
  companyId: string;
  companyName: string;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
}

export function useSocialMediaAnalysis() {
  return useMutation({
    mutationFn: async (input: AnalyzeSocialMediaInput): Promise<SocialMediaAnalysis> => {
      const { data, error } = await supabase.functions.invoke("social-media-analysis", {
        body: input,
      });

      if (error) {
        console.error("Social media analysis error:", error);
        throw new Error(error.message || "Erro ao analisar redes sociais");
      }

      if (!data.success) {
        throw new Error(data.error || "Erro ao analisar redes sociais");
      }

      return data.data;
    },
    onError: (error) => {
      console.error("Social media analysis failed:", error);
      toast.error(error.message || "Não foi possível analisar as redes sociais");
    },
    onSuccess: () => {
      toast.success("Análise de redes sociais concluída");
    }
  });
}
