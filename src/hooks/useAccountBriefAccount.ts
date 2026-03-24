import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAccountBriefAccount(accountId: string | undefined) {
  return useQuery({
    queryKey: ["account-brief-account", accountId],
    queryFn: async () => {
      if (!accountId) return null;
      const { data, error } = await supabase
        .from("account_brief_accounts")
        .select("*")
        .eq("id", accountId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}
