import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LandingHero {
  badge?: string;
  title?: string;
  highlight?: string;
  subtitle?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  microCopy?: string;
}

export interface LandingModule {
  icon?: string;
  title: string;
  desc: string;
}

export interface LandingBenefit {
  value: string;
  label: string;
}

export interface LandingJourneyStep {
  step: string;
  title: string;
  desc: string;
}

export interface LandingFaq {
  q: string;
  a: string;
}

export interface LandingCtas {
  scheduleHref?: string;
  signupHref?: string;
  appHref?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface LandingSeo {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonical?: string;
}

export interface LandingImages {
  ogImage?: string;
  heroImage?: string;
  logoUrl?: string;
}

export interface LeadChefLandingContent {
  workspace_id: string;
  is_canonical: boolean;
  hero: LandingHero;
  modules: LandingModule[];
  benefits: LandingBenefit[];
  journey: LandingJourneyStep[];
  faqs: LandingFaq[];
  ctas: LandingCtas;
  seo: LandingSeo;
  images: LandingImages;
  updated_at?: string;
}

const TABLE = "leadchef_landing_content" as const;

/** Fetch by workspace, or canonical (for public landing) when no workspace given. */
export function useLeadChefLandingContent(workspaceId?: string | null) {
  return useQuery({
    queryKey: ["leadchef-landing-content", workspaceId ?? "canonical"],
    queryFn: async (): Promise<LeadChefLandingContent | null> => {
      const q = supabase.from(TABLE as any).select("*").limit(1);
      const { data, error } = workspaceId
        ? await q.eq("workspace_id", workspaceId).maybeSingle()
        : await q.eq("is_canonical", true).maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return (data as unknown as LeadChefLandingContent) ?? null;
    },
    staleTime: 60_000,
  });
}

export function useUpsertLeadChefLandingContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<LeadChefLandingContent> & { workspace_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...input, updated_by: user?.id ?? null };
      const { data, error } = await supabase
        .from(TABLE as any)
        .upsert(payload as any, { onConflict: "workspace_id" })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LeadChefLandingContent;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["leadchef-landing-content"] });
      if (data?.is_canonical) {
        qc.invalidateQueries({ queryKey: ["leadchef-landing-content", "canonical"] });
      }
    },
  });
}
