import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientAuth } from "./useClientAuth";

export interface ClientContract {
  id: string;
  title: string;
  contract_type: string;
  status: string;
  start_date: string;
  end_date: string | null;
  renewal_date: string | null;
  auto_renew: boolean;
  value: number | null;
  currency: string;
  terms: Record<string, unknown>;
  description: string | null;
  document_url: string | null;
  created_at: string;
}

export function useClientContracts() {
  const workspaceId = localStorage.getItem("client_workspace_id") || undefined;
  const { clientUser } = useClientAuth({ workspaceId });

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["client-contracts", clientUser?.company_id],
    queryFn: async () => {
      if (!clientUser?.company_id || !clientUser?.workspace_id) return [];

      const { data, error } = await supabase
        .from("client_contracts")
        .select("*")
        .eq("company_id", clientUser.company_id)
        .eq("workspace_id", clientUser.workspace_id)
        .order("end_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data ?? []) as ClientContract[];
    },
    enabled: !!clientUser?.company_id,
  });

  const activeContracts = contracts.filter((c) => c.status === "active" || c.status === "expiring");
  
  const expiringContracts = contracts.filter((c) => {
    if (!c.end_date) return false;
    const daysUntilEnd = Math.ceil(
      (new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilEnd > 0 && daysUntilEnd <= 30;
  });

  return {
    contracts,
    activeContracts,
    expiringContracts,
    isLoading,
  };
}
