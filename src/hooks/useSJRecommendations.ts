// Hook for Student Journey Course Recommendations

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { 
  SJCourseRecommendation, 
  RecommendationStatus,
  DismissReason,
} from "@/types/sjRecommendation";

export function useSJRecommendations(profileId?: string) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  // Fetch recommendations for a profile
  const recommendationsQuery = useQuery({
    queryKey: ["sj-recommendations", currentWorkspace?.id, profileId],
    queryFn: async (): Promise<SJCourseRecommendation[]> => {
      if (!currentWorkspace?.id || !profileId) return [];

      const { data, error } = await supabase
        .from("sj_course_recommendations")
        .select(`
          *,
          course:sj_courses(*),
          profile:sj_profiles(id, full_name, email)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .eq("profile_id", profileId)
        .in("status", ["new", "shown", "contacted"])
        .order("match_score", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SJCourseRecommendation[];
    },
    enabled: !!currentWorkspace?.id && !!profileId,
  });

  // Generate recommendations via edge function
  const generateRecommendations = useMutation({
    mutationFn: async (targetProfileId: string) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado");

      const { data, error } = await supabase.functions.invoke("sj-course-recommendations", {
        body: {
          workspaceId: currentWorkspace.id,
          action: "generate",
          profileId: targetProfileId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sj-recommendations"] });
      if (data?.recommendations?.length > 0) {
        toast.success(`${data.recommendations.length} recomendações geradas`);
      } else {
        toast.info("Nenhuma recomendação encontrada para este perfil");
      }
    },
    onError: (error) => {
      console.error("Error generating recommendations:", error);
      toast.error("Erro ao gerar recomendações");
    },
  });

  // Update recommendation status
  const updateStatus = useMutation({
    mutationFn: async ({ 
      recommendationId, 
      status,
      dismissReason,
    }: { 
      recommendationId: string; 
      status: RecommendationStatus;
      dismissReason?: DismissReason;
    }) => {
      const updates: Record<string, unknown> = { status };
      
      if (status === "dismissed") {
        updates.dismissed_at = new Date().toISOString();
        if (dismissReason) updates.dismissed_reason = dismissReason;
      } else if (status === "contacted") {
        updates.contacted_at = new Date().toISOString();
      } else if (status === "converted") {
        updates.converted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("sj_course_recommendations")
        .update(updates)
        .eq("id", recommendationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-recommendations"] });
    },
    onError: (error) => {
      console.error("Error updating recommendation:", error);
      toast.error("Erro ao atualizar recomendação");
    },
  });

  // Mark as shown
  const markAsShown = useMutation({
    mutationFn: async (recommendationId: string) => {
      const { error } = await supabase
        .from("sj_course_recommendations")
        .update({ status: "shown" })
        .eq("id", recommendationId)
        .eq("status", "new");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-recommendations"] });
    },
  });

  // Get explanation for a recommendation
  const getExplanation = useMutation({
    mutationFn: async ({ targetProfileId, courseId }: { targetProfileId: string; courseId: string }) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado");

      const { data, error } = await supabase.functions.invoke("sj-course-recommendations", {
        body: {
          workspaceId: currentWorkspace.id,
          action: "explain",
          profileId: targetProfileId,
          courseId,
        },
      });

      if (error) throw error;
      return data;
    },
  });

  // Generate invitation message
  const generateMessage = useMutation({
    mutationFn: async ({ targetProfileId, courseId }: { targetProfileId: string; courseId: string }) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado");

      const { data, error } = await supabase.functions.invoke("sj-course-recommendations", {
        body: {
          workspaceId: currentWorkspace.id,
          action: "generate_message",
          profileId: targetProfileId,
          courseId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Mensagem gerada com sucesso");
    },
    onError: (error) => {
      console.error("Error generating message:", error);
      toast.error("Erro ao gerar mensagem");
    },
  });

  return {
    recommendations: recommendationsQuery.data || [],
    isLoading: recommendationsQuery.isLoading,
    generateRecommendations,
    updateStatus,
    markAsShown,
    getExplanation,
    generateMessage,
  };
}

// Hook for dashboard opportunities
export function useSJOpportunities(minScore: number = 60) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["sj-opportunities", currentWorkspace?.id, minScore],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("sj_course_recommendations")
        .select(`
          *,
          course:sj_courses(id, name, level, urgency_score, tags),
          profile:sj_profiles(id, full_name, email, student_score, activation_potential, lifecycle_stage)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .in("status", ["new", "shown"])
        .gte("match_score", minScore)
        .order("match_score", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });
}

// Hook for batch generation
export function useSJBatchRecommendations() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileIds: string[]) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado");

      const { data, error } = await supabase.functions.invoke("sj-course-recommendations", {
        body: {
          workspaceId: currentWorkspace.id,
          action: "batch_generate",
          profileIds,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sj-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["sj-opportunities"] });
      toast.success(`Recomendações geradas para ${data?.processed || 0} perfis`);
    },
    onError: (error) => {
      console.error("Error batch generating:", error);
      toast.error("Erro ao gerar recomendações em lote");
    },
  });
}
