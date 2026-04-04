import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface AISuggestedZone {
  name: string;
  countries: string[];
  flat_price: number | null;
  weight_rules: Array<{ min_weight: number; max_weight: number; price: number }>;
}

export interface AISuggestedMethod {
  name: string;
  description: string;
  base_price: number;
  free_shipping_threshold: number | null;
  estimated_delivery: string;
  zones: AISuggestedZone[];
}

export interface AIPriceSuggestion {
  base_price: number;
  free_shipping_threshold: number | null;
  zones: AISuggestedZone[];
  reasoning: string;
}

export interface AIZoneOptimization {
  suggestions: Array<{
    type: "add_zone" | "modify_zone" | "merge_zones" | "split_zone";
    zone_name: string;
    description: string;
    countries: string[];
    suggested_price: number | null;
    weight_rules: Array<{ min_weight: number; max_weight: number; price: number }>;
    reason: string;
  }>;
  overall_analysis: string;
}

export function useAIShipping() {
  const { currentWorkspace } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const invoke = async (action: string, context: Record<string, unknown>) => {
    if (!currentWorkspace?.id) {
      toast.error("Workspace não encontrado");
      return null;
    }

    setIsLoading(true);
    setLoadingAction(action);

    try {
      const { data, error } = await supabase.functions.invoke("ai-shipping-suggest", {
        body: { action, workspace_id: currentWorkspace.id, context },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data?.data;
    } catch (err: any) {
      const msg = err?.message || "Erro ao obter sugestões da IA";
      toast.error(msg);
      return null;
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const suggestMethods = async (context: {
    country?: string;
    product_types?: string;
    avg_weight?: string;
    target_markets?: string;
    existing_methods?: number;
  }): Promise<AISuggestedMethod[] | null> => {
    return invoke("suggest_methods", context);
  };

  const suggestPrices = async (context: {
    method_name?: string;
    country?: string;
    product_types?: string;
    avg_weight?: string;
    target_markets?: string;
    current_price?: number;
  }): Promise<AIPriceSuggestion | null> => {
    return invoke("suggest_prices", context);
  };

  const optimizeZones = async (context: {
    method_name?: string;
    country?: string;
    product_types?: string;
    current_zones?: unknown[];
  }): Promise<AIZoneOptimization | null> => {
    return invoke("optimize_zones", context);
  };

  return { suggestMethods, suggestPrices, optimizeZones, isLoading, loadingAction };
}
