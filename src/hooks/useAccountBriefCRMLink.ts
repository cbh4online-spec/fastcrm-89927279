import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useAccountBriefCRMLink(accountId?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  // Search companies for linking
  const searchCompanies = useQuery({
    queryKey: ["crm-companies-search", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, website, industry")
        .eq("workspace_id", workspaceId)
        .order("name")
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  // Search leads for linking
  const searchLeads = useQuery({
    queryKey: ["crm-leads-search", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, email, company, status")
        .eq("workspace_id", workspaceId)
        .order("name")
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const linkCompany = useMutation({
    mutationFn: async ({ companyId, createNew }: { companyId?: string; createNew?: boolean }) => {
      if (!workspaceId || !accountId) throw new Error("Dados insuficientes");
      const { data, error } = await supabase.functions.invoke("account-brief-link-company", {
        body: { accountId, workspaceId, companyId, createNew },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.created ? "Empresa criada e associada!" : "Empresa associada!");
      queryClient.invalidateQueries({ queryKey: ["account-brief-account"] });
      queryClient.invalidateQueries({ queryKey: ["account-brief-accounts"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao associar empresa"),
  });

  const linkLead = useMutation({
    mutationFn: async ({ leadId }: { leadId: string }) => {
      if (!workspaceId || !accountId) throw new Error("Dados insuficientes");
      const { error } = await (supabase as any)
        .from("account_brief_accounts")
        .update({ lead_id: leadId })
        .eq("id", accountId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead associada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["account-brief-account"] });
      queryClient.invalidateQueries({ queryKey: ["account-brief-accounts"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao associar lead"),
  });

  const unlinkLead = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !accountId) throw new Error("Dados insuficientes");
      const { error } = await (supabase as any)
        .from("account_brief_accounts")
        .update({ lead_id: null })
        .eq("id", accountId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead desvinculada!");
      queryClient.invalidateQueries({ queryKey: ["account-brief-account"] });
      queryClient.invalidateQueries({ queryKey: ["account-brief-accounts"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao desvincular lead"),
  });

  // Get diffs for this account
  const diffsQuery = useQuery({
    queryKey: ["account-brief-diffs", accountId],
    queryFn: async () => {
      if (!accountId || !workspaceId) return [];
      const { data, error } = await supabase
        .from("account_brief_diff_events")
        .select("*")
        .eq("account_id", accountId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!accountId && !!workspaceId,
  });

  return {
    companies: searchCompanies.data || [],
    leads: searchLeads.data || [],
    linkCompany,
    linkLead,
    unlinkLead,
    diffs: diffsQuery.data || [],
  };
}
