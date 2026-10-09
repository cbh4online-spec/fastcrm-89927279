import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";

export interface ProspectingSearch {
  id: string;
  workspace_id: string;
  user_id: string;
  search_type: "web_search" | "google_local";
  query: string;
  location: string | null;
  category: string | null;
  results_count: number;
  imported_count: number;
  result_identifiers: string[]; // URLs or place_ids
  created_at: string;
}

export function useProspectingSearchHistory(searchType: "web_search" | "google_local") {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: searches = [], isLoading } = useQuery({
    queryKey: ["prospecting-search-history", currentWorkspace?.id, searchType],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("prospecting_search_history")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("search_type", searchType)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as ProspectingSearch[];
    },
    enabled: !!currentWorkspace?.id,
  });

  // All result identifiers from previous searches (for dedup)
  const allPreviousIdentifiers = new Set(
    searches.flatMap((s) => s.result_identifiers || [])
  );

  const saveSearch = useMutation({
    mutationFn: async (params: {
      query: string;
      location?: string;
      category?: string;
      results_count: number;
      imported_count?: number;
      result_identifiers: string[];
    }) => {
      if (!currentWorkspace?.id || !user?.id) return;
      const { data, error } = await supabase
        .from("prospecting_search_history")
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          search_type: searchType,
          query: params.query,
          location: params.location || null,
          category: params.category || null,
          results_count: params.results_count,
          imported_count: params.imported_count || 0,
          result_identifiers: params.result_identifiers,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["prospecting-search-history", currentWorkspace?.id, searchType],
      });
    },
  });

  return {
    searches,
    isLoading,
    allPreviousIdentifiers,
    saveSearch,
  };
}
