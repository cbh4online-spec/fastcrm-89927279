import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type RecommendationContext =
  | "contact_view" | "company_view" | "lead_view"
  | "proposal" | "order" | "opportunity"
  | "b2b_catalog" | "security_renewal"
  | "procurement" | "dashboard";

export type RecommendationFeedback =
  | "relevant" | "not_relevant" | "already_has"
  | "too_expensive" | "wrong_timing"
  | "added_to_proposal" | "added_to_order" | "converted";

export interface Recommendation {
  id: string;
  score: number;
  strategy: string;
  confidence: string;
  reason: string;
  reason_tags: string[];
  status: string;
  product: {
    id: string;
    name: string;
    sku: string | null;
    base_price: number | null;
    short_description: string | null;
    category: string | null;
    product_images: { url: string }[];
  } | null;
}

interface UseRecsOptions {
  contactId?: string;
  companyId?: string;
  leadId?: string;
  context: RecommendationContext;
  limit?: number;
  enabled?: boolean;
}

export function useProductRecommendations({
  contactId, companyId, leadId, context, limit = 8, enabled = true,
}: UseRecsOptions) {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const workspaceId = currentWorkspace?.id;
  const entityKey = contactId ?? companyId ?? leadId;
  const qKey = ["product-recommendations", workspaceId, entityKey, context];

  const query = useQuery({
    queryKey: qKey,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "suggest-products-for-entity",
        {
          body: {
            workspace_id: workspaceId,
            contact_id: contactId,
            company_id: companyId,
            lead_id: leadId,
            context,
            limit,
          },
        }
      );

      if (error) throw error;
      return data as {
        success: boolean;
        source: string;
        entity_name?: string;
        recommendations: Recommendation[];
      };
    },
    enabled: enabled && !!workspaceId && !!entityKey,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const giveFeedback = useMutation({
    mutationFn: async ({
      recommendationId,
      feedback,
      notes,
    }: {
      recommendationId: string;
      feedback: RecommendationFeedback;
      notes?: string;
    }) => {
      const { error } = await supabase.functions.invoke(
        "recommendation-feedback",
        {
          body: {
            recommendation_id: recommendationId,
            feedback,
            workspace_id: workspaceId,
            context_module: context,
            notes,
          },
        }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qKey }),
    onError: () => toast.error("Erro ao registar feedback"),
  });

  const refresh = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "suggest-products-for-entity",
        {
          body: {
            workspace_id: workspaceId,
            contact_id: contactId,
            company_id: companyId,
            lead_id: leadId,
            context,
            limit,
            refresh: true,
          },
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(qKey, data);
      toast.success("Recomendações atualizadas");
    },
    onError: () => toast.error("Erro ao atualizar recomendações"),
  });

  return { ...query, giveFeedback, refresh };
}
