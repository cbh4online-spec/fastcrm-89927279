import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useFastMatchProfile } from "./useFastMatchProfile";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { toast } from "sonner";

export function useConnectionReviews(connectionId: string | undefined) {
  const { data: profile } = useFastMatchProfile();

  return useQuery({
    queryKey: ["fastmatch-review", connectionId, profile?.id],
    queryFn: async () => {
      if (!connectionId || !profile) return null;

      const { data, error } = await supabase
        .from("fastmatch_reputation_reviews")
        .select("*")
        .eq("connection_id", connectionId)
        .eq("reviewer_profile_id", profile.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!connectionId && !!profile,
  });
}

export function useSubmitReview() {
  const { currentWorkspace } = useWorkspace();
  const { data: profile } = useFastMatchProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      connectionId,
      reviewedProfileId,
      rating,
      comment,
    }: {
      connectionId: string;
      reviewedProfileId: string;
      rating: number;
      comment?: string;
    }) => {
      if (!profile || !currentWorkspace) throw new Error("Not authenticated");

      // Insert review
      const { data, error } = await supabase
        .from("fastmatch_reputation_reviews")
        .insert({
          workspace_id: currentWorkspace.id,
          connection_id: connectionId,
          reviewer_profile_id: profile.id,
          reviewed_profile_id: reviewedProfileId,
          rating,
          comment: comment || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Recalculate reputation for reviewed profile
      const { data: allReviews } = await supabase
        .from("fastmatch_reputation_reviews")
        .select("rating")
        .eq("reviewed_profile_id", reviewedProfileId);

      let avg = 0;
      if (allReviews && allReviews.length > 0) {
        avg =
          allReviews.reduce((sum, r) => sum + (r as any).rating, 0) /
          allReviews.length;

        await supabase
          .from("fastmatch_profiles")
          .update({
            reputation_score: Math.round(avg * 10) / 10,
            reputation_count: allReviews.length,
          })
          .eq("id", reviewedProfileId);

        console.log(`[FASTMATCH] Reputation recalculated for ${reviewedProfileId}: score=${Math.round(avg * 10) / 10}`);
      }

      return { data, connectionId, reviewedProfileId, rating };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["fastmatch-review"] });
      queryClient.invalidateQueries({ queryKey: ["fastmatch-connections"] });

      emitKernelEvent({
        workspace_id: currentWorkspace!.id,
        type: 'FASTMATCH.REVIEW_SUBMITTED',
        entity_kind: 'fastmatch_review',
        entity_id: result.data.id,
        source_module: 'crm-fastmatch',
        payload: {
          connection_id: result.connectionId,
          rating: result.rating,
          reviewed_profile_id: result.reviewedProfileId,
        },
      });

      toast.success("Avaliação enviada com sucesso!");
    },
    onError: (err: any) => {
      console.warn('[FASTMATCH] REVIEW_FAILED', err?.message);
      toast.error("Erro ao enviar avaliação.");
    },
  });
}
