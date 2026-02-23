import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientAuth } from "./useClientAuth";
import { toast } from "sonner";

export interface SuggestedItem {
  product_id: string;
  product_name: string;
  suggested_qty: number;
  unit_price_net: number;
  reason: string;
}

export interface ReplenishmentSuggestion {
  id: string;
  workspace_id: string;
  company_id: string;
  suggested_items: SuggestedItem[];
  reason: string | null;
  confidence_score: number | null;
  status: string;
  sent_at: string | null;
  converted_order_id: string | null;
  created_at: string;
}

export function useReplenishmentSuggestions() {
  const { clientUser } = useClientAuth();
  const queryClient = useQueryClient();
  const companyId = clientUser?.company_id;

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["client-replenishment-suggestions", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("client_replenishment_suggestions")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        suggested_items: (typeof d.suggested_items === 'string' ? JSON.parse(d.suggested_items) : d.suggested_items) || [],
      })) as ReplenishmentSuggestion[];
    },
    enabled: !!companyId,
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client_replenishment_suggestions")
        .update({ status: "dismissed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-replenishment-suggestions"] });
    },
  });

  const markConverted = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client_replenishment_suggestions")
        .update({ status: "converted" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-replenishment-suggestions"] });
    },
  });

  const activeSuggestions = suggestions.filter((s) => s.status === "new" || s.status === "sent");
  const historySuggestions = suggestions.filter((s) => s.status === "dismissed" || s.status === "converted");

  return {
    suggestions,
    activeSuggestions,
    historySuggestions,
    isLoading,
    dismiss: dismiss.mutateAsync,
    markConverted: markConverted.mutateAsync,
  };
}
