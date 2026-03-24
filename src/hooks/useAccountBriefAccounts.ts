import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AccountBriefAccount {
  id: string;
  workspace_id: string;
  company_id: string | null;
  name: string;
  domain: string;
  normalized_domain: string;
  probable_sector: string | null;
  probable_geography: string | null;
  executive_summary: string | null;
  description_short: string | null;
  tagline: string | null;
  total_score: number;
  score_label: string;
  favorite: boolean;
  commercial_status: string;
  last_analysis_at: string | null;
  last_analysis_run_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface AccountFilters {
  search?: string;
  status?: string;
  favorite?: boolean;
  minScore?: number;
}

export function useAccountBriefAccounts(filters?: AccountFilters) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const accountsQuery = useQuery({
    queryKey: ["account-brief-accounts", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("account_brief_accounts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false });

      if (filters?.status) query = query.eq("commercial_status", filters.status);
      if (filters?.favorite) query = query.eq("favorite", true);
      if (filters?.minScore) query = query.gte("total_score", filters.minScore);
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,domain.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AccountBriefAccount[];
    },
    enabled: !!workspaceId,
  });

  const createAccount = useMutation({
    mutationFn: async ({ name, domain, notes }: { name: string; domain: string; notes?: string }) => {
      if (!workspaceId || !user) throw new Error("Workspace não encontrado");
      const normalized = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
      const { data, error } = await supabase
        .from("account_brief_accounts")
        .insert({
          workspace_id: workspaceId,
          name: name || normalized,
          domain,
          normalized_domain: normalized,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Conta adicionada!");
      queryClient.invalidateQueries({ queryKey: ["account-brief-accounts"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao criar conta"),
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AccountBriefAccount> & { id: string }) => {
      const { error } = await supabase
        .from("account_brief_accounts")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-brief-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-brief-account"] });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("account_brief_accounts")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conta removida");
      queryClient.invalidateQueries({ queryKey: ["account-brief-accounts"] });
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, favorite }: { id: string; favorite: boolean }) => {
      const { error } = await supabase
        .from("account_brief_accounts")
        .update({ favorite })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-brief-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-brief-account"] });
    },
  });

  return {
    accounts: accountsQuery.data || [],
    isLoading: accountsQuery.isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    toggleFavorite,
  };
}
