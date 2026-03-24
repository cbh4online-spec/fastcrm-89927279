import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface DuplicateCandidate {
  id: string;
  account_id_a: string;
  account_id_b: string;
  duplicate_reason: string;
  confidence_score: number;
  status: string;
  created_at: string;
}

export function useAccountBriefDedupe() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["account-brief-duplicates", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("account_brief_duplicate_candidates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "pending")
        .order("confidence_score", { ascending: false });
      if (error) throw error;
      return (data || []) as DuplicateCandidate[];
    },
    enabled: !!workspaceId,
  });

  const checkDuplicate = async (normalizedDomain: string) => {
    if (!workspaceId) return null;
    const { data } = await supabase
      .from("account_brief_accounts")
      .select("id, name, domain, normalized_domain")
      .eq("workspace_id", workspaceId)
      .eq("normalized_domain", normalizedDomain)
      .maybeSingle();
    return data;
  };

  const resolveDuplicate = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "merged" | "kept_separate" | "alias" }) => {
      const { error } = await supabase
        .from("account_brief_duplicate_candidates")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-brief-duplicates"] }),
  });

  const createAlias = useMutation({
    mutationFn: async ({ accountId, domain, aliasType = "redirect" }: {
      accountId: string; domain: string; aliasType?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const normalized = domain.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/+$/, "").toLowerCase();
      const { error } = await supabase
        .from("account_brief_domain_aliases")
        .insert({ workspace_id: workspaceId, account_id: accountId, domain, normalized_domain: normalized, alias_type: aliasType });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-brief-duplicates"] }),
  });

  return { candidates, isLoading, checkDuplicate, resolveDuplicate, createAlias, pendingCount: candidates.length };
}
