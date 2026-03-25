import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SENIORITY_ORDER: Record<string, number> = {
  "C-Level": 0, "VP": 1, "Director": 2, "Manager": 3, "Senior": 4, "Other": 5,
};

export interface AccountBriefContact {
  id: string;
  account_id: string;
  workspace_id: string;
  contact_name: string | null;
  role_title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  photo_url: string | null;
  seniority_level: string | null;
  department: string | null;
  source_url: string | null;
  created_at: string;
}

export function useAccountBriefContacts(accountId: string | undefined) {
  return useQuery({
    queryKey: ["account-brief-contacts", accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const { data, error } = await supabase
        .from("account_brief_public_contacts")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data || []) as AccountBriefContact[]).sort((a, b) => {
        const sa = SENIORITY_ORDER[a.seniority_level || "Other"] ?? 5;
        const sb = SENIORITY_ORDER[b.seniority_level || "Other"] ?? 5;
        return sa - sb;
      });
    },
    enabled: !!accountId,
  });
}
