import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface EntityContext {
  entityType: "lead" | "contact" | "company";
  entityId: string;
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  industry?: string;
  // Instagram enrichment data
  instagramFollowers?: number;
  instagramPosts?: number;
  instagramBio?: string;
  instagramCategory?: string;
  instagramIsVerified?: boolean;
  instagramIsBusiness?: boolean;
  // AI analysis data
  inferredProfession?: string;
  inferredSpecialty?: string;
  inferredLocation?: string;
  leadScore?: number;
  // Manual notes/requirements
  notes?: string;
  requirements?: string;
  tags?: string[];
}

export interface ProductSuggestion {
  productId: string;
  matchScore: number;
  reason: string;
  suggestedApproach?: string;
  product: {
    id: string;
    name: string;
    category: string | null;
    product_type: string;
    base_price: number | null;
    short_description: string | null;
  } | null;
}

export interface SuggestionsResult {
  success: boolean;
  suggestions: ProductSuggestion[];
  overallInsight?: string;
  error?: string;
}

export function useEntityProductSuggestions() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (context: EntityContext): Promise<SuggestionsResult> => {
      if (!currentWorkspace?.id) {
        throw new Error("Workspace não encontrado");
      }

      const { data, error } = await supabase.functions.invoke("suggest-products-for-entity", {
        body: {
          context: {
            ...context,
            workspaceId: currentWorkspace.id,
          },
        },
      });

      if (error) {
        console.error("Error getting product suggestions:", error);
        throw new Error(error.message || "Erro ao obter sugestões");
      }

      if (!data.success && data.error) {
        throw new Error(data.error);
      }

      return data as SuggestionsResult;
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Erro ao obter sugestões de produtos";
      if (message.includes("Rate limit")) {
        toast.error("Limite de pedidos excedido. Tente novamente em alguns segundos.");
      } else if (message.includes("Payment required")) {
        toast.error("Créditos insuficientes. Adicione fundos para continuar.");
      } else {
        toast.error(message);
      }
    },
  });
}

// Hook to get suggestions for an entity on mount (cached)
export function useEntityProductSuggestionsQuery(context: EntityContext | null, enabled = true) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["entity-product-suggestions", context?.entityType, context?.entityId],
    queryFn: async (): Promise<SuggestionsResult> => {
      if (!currentWorkspace?.id || !context) {
        throw new Error("Missing context");
      }

      const { data, error } = await supabase.functions.invoke("suggest-products-for-entity", {
        body: {
          context: {
            ...context,
            workspaceId: currentWorkspace.id,
          },
        },
      });

      if (error) throw error;
      return data as SuggestionsResult;
    },
    enabled: enabled && !!currentWorkspace?.id && !!context,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1,
  });
}
