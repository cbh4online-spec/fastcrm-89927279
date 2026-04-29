import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import i18n from "i18next";

export interface ModuleOnboardingSlide {
  id: string;
  module_slug: string;
  slide_order: number;
  lang: string;
  heading: string;
  body: string | null;
  bullets: string[];
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  min_duration_seconds: number;
  is_active: boolean;
}

export function useModuleOnboarding(moduleSlug: string) {
  const { user } = useAuth();
  const { currentWorkspace, isSuperAdmin } = useWorkspace();
  const queryClient = useQueryClient();
  const lang = (i18n.language || "pt").split("-")[0];

  const slidesQuery = useQuery({
    queryKey: ["module-onboarding-slides", moduleSlug, lang],
    queryFn: async () => {
      // Try current language, fallback to PT
      const { data: primary } = await supabase
        .from("module_onboarding_presentations")
        .select("*")
        .eq("module_slug", moduleSlug)
        .eq("lang", lang)
        .eq("is_active", true)
        .order("slide_order", { ascending: true });

      if (primary && primary.length > 0) return primary as unknown as ModuleOnboardingSlide[];

      const { data: fallback } = await supabase
        .from("module_onboarding_presentations")
        .select("*")
        .eq("module_slug", moduleSlug)
        .eq("lang", "pt")
        .eq("is_active", true)
        .order("slide_order", { ascending: true });

      return (fallback ?? []) as unknown as ModuleOnboardingSlide[];
    },
    enabled: !!moduleSlug,
    staleTime: 5 * 60 * 1000,
  });

  const completionQuery = useQuery({
    queryKey: ["module-onboarding-completion", moduleSlug, user?.id, currentWorkspace?.id],
    queryFn: async () => {
      if (!user?.id || !currentWorkspace?.id) return null;
      const { data } = await supabase
        .from("module_onboarding_completions")
        .select("*")
        .eq("user_id", user.id)
        .eq("workspace_id", currentWorkspace.id)
        .eq("module_slug", moduleSlug)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && !!currentWorkspace?.id && !!moduleSlug,
    staleTime: 60 * 1000,
  });

  const completeMutation = useMutation({
    mutationFn: async (payload: { slidesViewed: number; totalSlides: number; durationSeconds: number; skipped?: boolean }) => {
      if (!user?.id || !currentWorkspace?.id) throw new Error("Sessão inválida");
      const { error } = await supabase.from("module_onboarding_completions").insert({
        workspace_id: currentWorkspace.id,
        user_id: user.id,
        module_slug: moduleSlug,
        slides_viewed: payload.slidesViewed,
        total_slides: payload.totalSlides,
        duration_seconds: payload.durationSeconds,
        skipped: payload.skipped ?? false,
      });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-onboarding-completion", moduleSlug] });
    },
  });

  const slides = slidesQuery.data ?? [];
  const hasPresentation = slides.length > 0;
  const isCompleted = !!completionQuery.data;
  const isLoading = slidesQuery.isLoading || completionQuery.isLoading;

  // Block access only if there's a presentation AND user hasn't completed it AND not super admin
  const requiresOnboarding = hasPresentation && !isCompleted && !isSuperAdmin;

  return {
    slides,
    hasPresentation,
    isCompleted,
    isLoading,
    requiresOnboarding,
    completeMutation,
    isSuperAdmin,
  };
}
