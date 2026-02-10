import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RelationSuggestion {
  targetId: string;
  targetName: string;
  type: "compatible" | "related" | "bundle";
  reason: string;
  label: string;
}

interface PostCreationSuggestionsResult {
  suggestions: RelationSuggestion[];
  added: number;
  isLoading: boolean;
  error: string | null;
}

export function usePostCreationSuggestions(
  productId: string | null,
  workspaceId: string | null
): PostCreationSuggestionsResult {
  const [suggestions, setSuggestions] = useState<RelationSuggestion[]>([]);
  const [added, setAdded] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId || !workspaceId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    setAdded(0);

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "ai-product-assistant",
          {
            body: {
              mode: "suggest-relations",
              productId,
              workspaceId,
            },
          }
        );

        if (cancelled) return;
        if (fnError) throw fnError;
        if (!data?.success) throw new Error(data?.error || "Falha ao sugerir relações");

        setSuggestions(data.data.relations || []);
        setAdded(data.data.added || 0);
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || "Erro ao sugerir relações");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, workspaceId]);

  return { suggestions, added, isLoading, error };
}
