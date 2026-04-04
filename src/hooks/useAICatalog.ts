import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AICatalogSuggestion {
  layout?: { groups: { category: string; productIds: string[] }[]; style_tokens?: Record<string, unknown> };
  descriptions?: { productId: string; description: string }[];
}

export function useAICatalog() {
  const [loading, setLoading] = useState(false);

  const suggest = async (action: "generate_layout" | "generate_descriptions", context: Record<string, unknown>): Promise<AICatalogSuggestion | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-catalog-suggest", {
        body: { action, context },
      });
      if (error) throw error;
      return data as AICatalogSuggestion;
    } catch (e: any) {
      toast.error(e.message || "Erro na sugestão IA");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { suggest, loading };
}
