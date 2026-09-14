import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface InstagramEnrichmentResult {
  username: string;
  fullName: string | null;
  followers: number | null;
  following: number | null;
  posts: number | null;
  bio: string | null;
  externalUrl: string | null;
  category: string | null;
  isVerified: boolean;
  isBusiness: boolean;
  profilePicUrl: string | null;
}

export interface InstagramProfileAnalysis {
  is_individual: boolean;
  category_guess: string;
  specialty_guess: string;
  city_guess: string;
  works_at: string | null;
  contact_signals: string[];
  confidence: number;
  reasons: string[];
  red_flags: string[];
  lead_score: number;
  lead_score_breakdown: {
    activity: number;
    clarity: number;
    location: number;
    contact: number;
    communication: number;
  };
  posting_frequency: string;
  avg_engagement: number;
  last_post_days_ago: number;
}

interface EnrichInput {
  leadId: string;
  username: string;
}

interface AnalyzeInput {
  username: string;
  full_name?: string | null;
  biography?: string | null;
  external_url?: string | null;
  followers_count?: number | null;
  following_count?: number | null;
  media_count?: number | null;
  is_business?: boolean | null;
  is_verified?: boolean | null;
  category?: string | null;
}

/** Recolha de dados públicos de Instagram e leitura por IA para uma lead. */
export function useLeadInstagramEnrichment() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const enrich = useMutation<InstagramEnrichmentResult, Error, EnrichInput>({
    mutationFn: async ({ leadId, username }) => {
      if (!currentWorkspace?.id) throw new Error("Nenhum workspace selecionado");

      const { data, error } = await supabase.functions.invoke("enrich-instagram-profile", {
        body: { leadId, username, workspaceId: currentWorkspace.id },
      });

      if (error) throw new Error(error.message || "Não foi possível recolher os dados");
      if (!data?.success) throw new Error(data?.error || "Não foi possível recolher os dados");

      return data.data as InstagramEnrichmentResult;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lead", variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads", currentWorkspace?.id] });
      toast.success("Dados de Instagram atualizados");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const analyze = useMutation<InstagramProfileAnalysis, Error, AnalyzeInput>({
    mutationFn: async (input) => {
      if (!currentWorkspace?.id) throw new Error("Nenhum workspace selecionado");

      const { data, error } = await supabase.functions.invoke("instagram-ai-analyze", {
        body: {
          action: "analyze_profile",
          data: {
            username: input.username,
            full_name: input.full_name ?? undefined,
            biography: input.biography ?? undefined,
            external_url: input.external_url ?? undefined,
            followers_count: input.followers_count ?? undefined,
            following_count: input.following_count ?? undefined,
            media_count: input.media_count ?? undefined,
            is_business: input.is_business ?? undefined,
            is_verified: input.is_verified ?? undefined,
            category: input.category ?? undefined,
          },
          workspace_id: currentWorkspace.id,
        },
      });

      if (error) throw new Error(error.message || "Não foi possível analisar o perfil");
      if (!data?.success) throw new Error(data?.error || "Não foi possível analisar o perfil");

      return data.data as InstagramProfileAnalysis;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    enrich: enrich.mutateAsync,
    isEnriching: enrich.isPending,
    analyze: analyze.mutateAsync,
    isAnalyzing: analyze.isPending,
    analysis: analyze.data ?? null,
  };
}
