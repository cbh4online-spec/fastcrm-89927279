import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface Shareholder {
  name: string;
  quota_percent: number | null;
  quota_value: string | null;
  type: "individual" | "corporate";
}

export interface Manager {
  name: string;
  role: string;
  start_date: string | null;
}

export interface AnnualRevenue {
  year: number;
  revenue: number | null;
  revenue_formatted: string | null;
  currency: string;
}

export interface CorporateData {
  id: string;
  account_id: string;
  nif: string | null;
  shareholders: Shareholder[];
  managers: Manager[];
  annual_revenue: AnnualRevenue[];
  capital_social: string | null;
  legal_nature: string | null;
  founding_date: string | null;
  company_status: string | null;
  source_url: string | null;
  extracted_at: string | null;
}

export function useAccountBriefCorporateData(accountId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const query = useQuery({
    queryKey: ["account-brief-corporate-data", accountId],
    queryFn: async () => {
      if (!accountId) return null;
      const { data, error } = await supabase
        .from("account_brief_corporate_data" as any)
        .select("*")
        .eq("account_id", accountId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        shareholders: (data as any).shareholders || [],
        managers: (data as any).managers || [],
        annual_revenue: (data as any).annual_revenue || [],
      } as CorporateData;
    },
    enabled: !!accountId,
  });

  const lookupCorporate = useMutation({
    mutationFn: async ({ nif }: { nif?: string } = {}) => {
      if (!accountId || !workspaceId) throw new Error("Dados insuficientes");
      const { data, error } = await supabase.functions.invoke("account-brief-corporate-lookup", {
        body: { accountId, workspaceId, nif },
      });
      if (error) throw error;
      if (data?.error && !data?.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Dados corporativos extraídos com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["account-brief-corporate-data", accountId] });
      queryClient.invalidateQueries({ queryKey: ["account-brief-account", accountId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao pesquisar dados corporativos");
    },
  });

  return {
    corporateData: query.data,
    isLoading: query.isLoading,
    lookupCorporate,
  };
}
