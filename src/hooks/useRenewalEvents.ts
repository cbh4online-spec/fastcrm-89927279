import { useQuery } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import type { RenewalEvent } from "@/types/renewal";

export function useRenewalEvents(contractId: string | undefined, limit = 50) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["renewal-events", contractId],
    queryFn: async () => {
      if (!workspaceClient || !contractId) return [];

      const { data, error } = await workspaceClient
        .from("renewal_events")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as unknown as RenewalEvent[];
    },
    enabled: !!workspaceClient && !!contractId,
  });
}
