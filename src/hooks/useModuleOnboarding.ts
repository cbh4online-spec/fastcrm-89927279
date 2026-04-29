import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import i18n from "i18next";

export type PresentationTier = "welcome" | "intermediate" | "advanced";

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
  presentation_id?: string | null;
}

export interface ModulePresentation {
  id: string;
  module_slug: string;
  tier: PresentationTier;
  lang: string;
  title: string;
  description: string | null;
  unlock_after_days: number;
  min_score_percent: number;
  xp_reward: number;
  allow_live_mode: boolean;
  is_active: boolean;
}

export interface QuizQuestion {
  id: string;
  presentation_id: string;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation: string | null;
  order_index: number;
}

async function fetchPresentation(moduleSlug: string, tier: PresentationTier, lang: string) {
  const { data: primary } = await supabase
    .from("module_presentations" as any)
    .select("*")
    .eq("module_slug", moduleSlug)
    .eq("tier", tier)
    .eq("lang", lang)
    .eq("is_active", true)
    .maybeSingle();
  if (primary) return primary as unknown as ModulePresentation;


  const { data: fallback } = await supabase
    .from("module_presentations" as any)
    .select("*")
    .eq("module_slug", moduleSlug)
    .eq("tier", tier)
    .eq("lang", "pt")
    .eq("is_active", true)
    .maybeSingle();
  return (fallback ?? null) as ModulePresentation | null;
}

export function useModuleOnboarding(moduleSlug: string, tier: PresentationTier = "welcome") {
  const { user } = useAuth();
  const { currentWorkspace, isSuperAdmin } = useWorkspace();
  const queryClient = useQueryClient();
  const lang = (i18n.language || "pt").split("-")[0];

  const presentationQuery = useQuery({
    queryKey: ["module-presentation", moduleSlug, tier, lang],
    queryFn: () => fetchPresentation(moduleSlug, tier, lang),
    enabled: !!moduleSlug,
    staleTime: 5 * 60 * 1000,
  });

  const presentation = presentationQuery.data;

  const slidesQuery = useQuery({
    queryKey: ["module-onboarding-slides", moduleSlug, lang, presentation?.id ?? null],
    queryFn: async () => {
      // Prefer slides linked to the new presentation; fall back to legacy module_slug+lang
      if (presentation?.id) {
        const { data } = await supabase
          .from("module_onboarding_presentations")
          .select("*")
          .eq("presentation_id", presentation.id)
          .eq("is_active", true)
          .order("slide_order", { ascending: true });
        if (data && data.length) return data as unknown as ModuleOnboardingSlide[];
      }

      const { data: primary } = await supabase
        .from("module_onboarding_presentations")
        .select("*")
        .eq("module_slug", moduleSlug)
        .eq("lang", lang)
        .is("presentation_id", null)
        .eq("is_active", true)
        .order("slide_order", { ascending: true });
      if (primary && primary.length > 0) return primary as unknown as ModuleOnboardingSlide[];

      const { data: fb } = await supabase
        .from("module_onboarding_presentations")
        .select("*")
        .eq("module_slug", moduleSlug)
        .eq("lang", "pt")
        .is("presentation_id", null)
        .eq("is_active", true)
        .order("slide_order", { ascending: true });
      return (fb ?? []) as unknown as ModuleOnboardingSlide[];
    },
    enabled: !!moduleSlug && !presentationQuery.isLoading,
    staleTime: 5 * 60 * 1000,
  });

  const quizQuery = useQuery({
    queryKey: ["module-quiz", presentation?.id ?? null],
    queryFn: async () => {
      if (!presentation?.id) return [] as QuizQuestion[];
      const { data } = await supabase
        .from("module_quizzes" as any)
        .select("*")
        .eq("presentation_id", presentation.id)
        .eq("is_active", true)
        .order("order_index", { ascending: true });
      return ((data as any[]) ?? []).map((q) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : [],
      })) as QuizQuestion[];
    },
    enabled: !!presentation?.id,
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

  const lastQuizAttemptQuery = useQuery({
    queryKey: ["module-quiz-attempt", presentation?.id, user?.id, currentWorkspace?.id],
    queryFn: async () => {
      if (!presentation?.id || !user?.id || !currentWorkspace?.id) return null;
      const { data } = await supabase
        .from("module_quiz_attempts" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("workspace_id", currentWorkspace.id)
        .eq("presentation_id", presentation.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
    enabled: !!presentation?.id && !!user?.id && !!currentWorkspace?.id,
    staleTime: 30 * 1000,
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

      // Award XP for completing module presentation
      if (presentation?.xp_reward) {
        await supabase.rpc("award_xp" as any, {
          _user_id: user.id,
          _workspace_id: currentWorkspace.id,
          _event_type: "module_completed",
          _xp_amount: presentation.xp_reward,
          _reference_id: presentation.id,
          _reference_type: "presentation",
          _metadata: { module_slug: moduleSlug, tier },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-onboarding-completion", moduleSlug] });
      queryClient.invalidateQueries({ queryKey: ["user-progression"] });
    },
  });

  const submitQuizMutation = useMutation({
    mutationFn: async (answers: number[]) => {
      if (!presentation?.id || !currentWorkspace?.id) throw new Error("Apresentação ou workspace inválido");
      const { data, error } = await supabase.rpc("submit_quiz_attempt" as any, {
        _presentation_id: presentation.id,
        _workspace_id: currentWorkspace.id,
        _answers: answers as any,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-quiz-attempt"] });
      queryClient.invalidateQueries({ queryKey: ["user-progression"] });
    },
  });

  const slides = slidesQuery.data ?? [];
  const quiz = quizQuery.data ?? [];
  const hasPresentation = slides.length > 0;
  const hasQuiz = quiz.length > 0;
  const lastAttempt = lastQuizAttemptQuery.data;
  const quizPassed = !!lastAttempt?.passed;
  const isCompleted = !!completionQuery.data && (!hasQuiz || quizPassed);
  const isLoading =
    presentationQuery.isLoading ||
    slidesQuery.isLoading ||
    completionQuery.isLoading ||
    quizQuery.isLoading;

  const requiresOnboarding = hasPresentation && !isCompleted && !isSuperAdmin;

  return {
    presentation,
    slides,
    quiz,
    hasPresentation,
    hasQuiz,
    isCompleted,
    quizPassed,
    lastAttempt,
    isLoading,
    requiresOnboarding,
    completeMutation,
    submitQuizMutation,
    isSuperAdmin,
  };
}
