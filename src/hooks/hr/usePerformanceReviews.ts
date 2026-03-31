import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── Review Cycles ──────────────────────────────────────────────────────────

export function useReviewCycles(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["hr-review-cycles", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_review_cycles")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateReviewCycle() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { workspace_id: string; year: number; cycle_type: string; name?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("hr-review-create-cycle", {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["hr-review-cycles"] });
      toast({ title: "Ciclo criado", description: `${data.reviews_created} avaliações criadas automaticamente.` });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ─── Performance Reviews ────────────────────────────────────────────────────

export function usePerformanceReviews(cycleId: string | undefined) {
  return useQuery({
    queryKey: ["hr-performance-reviews", cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_performance_reviews")
        .select(`
          *,
          employee:hr_employees!hr_performance_reviews_employee_id_fkey(id, full_name, job_title, department),
          manager:hr_employees!hr_performance_reviews_manager_id_fkey(id, full_name)
        `)
        .eq("review_cycle_id", cycleId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function usePerformanceReview(reviewId: string | undefined) {
  return useQuery({
    queryKey: ["hr-performance-review", reviewId],
    enabled: !!reviewId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_performance_reviews")
        .select(`
          *,
          employee:hr_employees!hr_performance_reviews_employee_id_fkey(id, full_name, job_title, department),
          manager:hr_employees!hr_performance_reviews_manager_id_fkey(id, full_name)
        `)
        .eq("id", reviewId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useReviewCycleStats(cycleId: string | undefined) {
  return useQuery({
    queryKey: ["hr-review-cycle-stats", cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_performance_reviews")
        .select("status")
        .eq("review_cycle_id", cycleId!);
      if (error) throw error;
      const total = data.length;
      const selfDone = data.filter((r) => r.status !== "pending_self").length;
      const managerDone = data.filter((r) => ["pending_calibration", "completed"].includes(r.status)).length;
      const completed = data.filter((r) => r.status === "completed").length;
      return { total, selfDone, managerDone, completed };
    },
  });
}

// ─── Self & Manager Submissions ─────────────────────────────────────────────

export function useSubmitSelfReview() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      reviewId: string;
      self_rating: number;
      self_achievements: string[];
      self_challenges: string;
      self_comments: string;
    }) => {
      const { error } = await supabase
        .from("hr_performance_reviews")
        .update({
          self_rating: params.self_rating,
          self_achievements: params.self_achievements,
          self_challenges: params.self_challenges,
          self_comments: params.self_comments,
          self_submitted_at: new Date().toISOString(),
          status: "pending_manager",
        })
        .eq("id", params.reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-performance-review"] });
      qc.invalidateQueries({ queryKey: ["hr-performance-reviews"] });
      qc.invalidateQueries({ queryKey: ["hr-review-cycle-stats"] });
      toast({ title: "Auto-avaliação submetida" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useSubmitManagerReview() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      reviewId: string;
      manager_rating: number;
      manager_strengths: string;
      manager_areas_improvement: string;
      manager_comments: string;
      promotion_recommended: boolean;
      salary_adjustment_recommended: boolean;
      salary_adjustment_percentage?: number;
    }) => {
      const { error } = await supabase
        .from("hr_performance_reviews")
        .update({
          manager_rating: params.manager_rating,
          manager_strengths: params.manager_strengths,
          manager_areas_improvement: params.manager_areas_improvement,
          manager_comments: params.manager_comments,
          promotion_recommended: params.promotion_recommended,
          salary_adjustment_recommended: params.salary_adjustment_recommended,
          salary_adjustment_percentage: params.salary_adjustment_percentage,
          manager_submitted_at: new Date().toISOString(),
          status: "pending_calibration",
        })
        .eq("id", params.reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-performance-review"] });
      qc.invalidateQueries({ queryKey: ["hr-performance-reviews"] });
      qc.invalidateQueries({ queryKey: ["hr-review-cycle-stats"] });
      toast({ title: "Avaliação do manager submetida" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ─── AI Suggestion ──────────────────────────────────────────────────────────

export function useSuggestRatingAI() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { data, error } = await supabase.functions.invoke("hr-review-ai-suggest-rating", {
        body: { review_id: reviewId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["hr-performance-review"] });
      if (data?.analysis) {
        toast({ title: "Sugestão IA gerada", description: `Rating sugerido: ${data.analysis.suggested_rating}/5` });
      } else if (data?.fallback) {
        toast({ title: "IA indisponível", description: data.fallback.summary, variant: "destructive" });
      }
    },
    onError: (e: Error) => toast({ title: "Erro IA", description: e.message, variant: "destructive" }),
  });
}

// ─── Competencies ───────────────────────────────────────────────────────────

export function useCompetencies(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["hr-competencies", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_competencies")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCompetency() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { workspace_id: string; name: string; description?: string; category?: string; level?: string }) => {
      const { error } = await supabase.from("hr_competencies").insert(params);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-competencies"] });
      toast({ title: "Competência criada" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteCompetency() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_competencies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-competencies"] });
      toast({ title: "Competência removida" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ─── Competency Ratings ─────────────────────────────────────────────────────

export function useCompetencyRatings(reviewId: string | undefined) {
  return useQuery({
    queryKey: ["hr-competency-ratings", reviewId],
    enabled: !!reviewId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_review_competency_ratings")
        .select("*, hr_competencies(name, category, description)")
        .eq("review_id", reviewId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateCompetencyRating() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; self_rating?: number; manager_rating?: number; final_rating?: number; comments?: string }) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from("hr_review_competency_ratings").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-competency-ratings"] }),
  });
}

// ─── Peer Reviews ───────────────────────────────────────────────────────────

export function usePeerReviews(reviewId: string | undefined) {
  return useQuery({
    queryKey: ["hr-peer-reviews", reviewId],
    enabled: !!reviewId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_peer_reviews")
        .select("*, reviewer:hr_employees!hr_peer_reviews_reviewer_id_fkey(full_name)")
        .eq("review_id", reviewId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useSubmitPeerReview() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      rating: number;
      strengths: string;
      areas_improvement: string;
      comments: string;
    }) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from("hr_peer_reviews")
        .update({ ...updates, status: "submitted", submitted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-peer-reviews"] });
      toast({ title: "Peer review submetido" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ─── Calibration Sessions ───────────────────────────────────────────────────

export function useCalibrationSessions(cycleId: string | undefined) {
  return useQuery({
    queryKey: ["hr-calibration-sessions", cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_calibration_sessions")
        .select("*")
        .eq("review_cycle_id", cycleId!)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCalibrationSession() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      workspace_id: string;
      review_cycle_id: string;
      name: string;
      scheduled_date: string;
    }) => {
      const { error } = await supabase.from("hr_calibration_sessions").insert(params);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-calibration-sessions"] });
      toast({ title: "Sessão de calibração criada" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ─── Review Activities ──────────────────────────────────────────────────────

export function useReviewActivities(reviewId: string | undefined) {
  return useQuery({
    queryKey: ["hr-review-activities", reviewId],
    enabled: !!reviewId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_review_activities")
        .select("*, actor:hr_employees!hr_review_activities_actor_id_fkey(full_name)")
        .eq("review_id", reviewId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Finalize Review ────────────────────────────────────────────────────────

export function useFinalizeReview() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { reviewId: string; final_rating: number; final_comments: string }) => {
      const { error } = await supabase
        .from("hr_performance_reviews")
        .update({
          final_rating: params.final_rating,
          final_comments: params.final_comments,
          status: "completed",
        })
        .eq("id", params.reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-performance-review"] });
      qc.invalidateQueries({ queryKey: ["hr-performance-reviews"] });
      qc.invalidateQueries({ queryKey: ["hr-review-cycle-stats"] });
      toast({ title: "Avaliação finalizada" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}
