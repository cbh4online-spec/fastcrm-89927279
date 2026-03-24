import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAccountBriefErrorCatalog() {
  const catalogQuery = useQuery({
    queryKey: ["account-brief-error-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_brief_error_catalog")
        .select("*")
        .order("error_code");
      if (error) throw error;
      return data || [];
    },
  });

  const getError = (code: string) => {
    return catalogQuery.data?.find((e) => e.error_code === code) || null;
  };

  return {
    catalog: catalogQuery.data || [],
    isLoading: catalogQuery.isLoading,
    getError,
  };
}
