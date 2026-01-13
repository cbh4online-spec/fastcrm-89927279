import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AllWorkspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export function useAllWorkspaces() {
  const { data: workspaces, isLoading, error } = useQuery({
    queryKey: ["all-workspaces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name, slug, created_at")
        .order("name");

      if (error) throw error;
      return data as AllWorkspace[];
    },
  });

  return {
    workspaces: workspaces ?? [],
    isLoading,
    error,
  };
}
