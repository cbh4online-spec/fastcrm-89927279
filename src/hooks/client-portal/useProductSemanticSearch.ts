import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SemanticProduct {
  id: string;
  name: string;
  sku: string | null;
  short_description: string | null;
  commercial_description: string | null;
  base_price: number;
  category: string | null;
  images: string[] | null;
  primary_image_index: number | null;
  similarity: number;
}

interface UseProductSemanticSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SemanticProduct[];
  loading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
}

export function useProductSemanticSearch(workspaceId: string | undefined): UseProductSemanticSearchReturn {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SemanticProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !workspaceId) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("product-semantic-search", {
        body: {
          query: searchQuery,
          workspaceId,
          limit: 10,
          threshold: 0.4,
        },
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setResults(data.products || []);
      } else {
        setError(data?.error || "Erro na pesquisa");
        setResults([]);
      }
    } catch (err) {
      console.error("Semantic search error:", err);
      setError(err instanceof Error ? err.message : "Erro na pesquisa");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const clearResults = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    search,
    clearResults,
  };
}
