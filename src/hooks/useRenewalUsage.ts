import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { RenewalUsageEntry, LogUsageInput } from "@/types/renewal";

export function useRenewalUsage(contractId: string | undefined, itemId?: string) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["renewal-usage", contractId, itemId],
    queryFn: async () => {
      if (!workspaceClient || !contractId) return [];

      let query = workspaceClient
        .from("renewal_usage_ledger")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });

      if (itemId) {
        query = query.eq("renewal_item_id", itemId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as RenewalUsageEntry[];
    },
    enabled: !!workspaceClient && !!contractId,
  });
}

export function useLogRenewalUsage() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: LogUsageInput) => {
      if (!workspaceClient || !currentWorkspace) throw new Error("Workspace not available");

      const { data, error } = await workspaceClient
        .from("renewal_usage_ledger")
        .insert([{
          workspace_id: currentWorkspace.id,
          contract_id: input.contract_id,
          renewal_item_id: input.renewal_item_id,
          usage_type: (input.usage_type || "hours") as any,
          amount: input.amount,
          unit: input.unit || "hours",
          source_type: input.source_type || "manual",
          source_id: input.source_id || null,
          description: input.description || null,
          created_by: user?.id || null,
        }])
        .select()
        .single();

      if (error) throw error;

      // Update hours_remaining in item meta_json if it's an hours_pack
      const { data: item } = await workspaceClient
        .from("renewal_items")
        .select("meta_json, item_type")
        .eq("id", input.renewal_item_id)
        .single();

      if (item && item.item_type === "hours_pack") {
        const meta = (item.meta_json || {}) as Record<string, unknown>;
        const hoursRemaining = ((meta.hours_remaining as number) || 0) - input.amount;
        await workspaceClient
          .from("renewal_items")
          .update({ meta_json: { ...meta, hours_remaining: Math.max(0, hoursRemaining) } } as any)
          .eq("id", input.renewal_item_id);
      }

      // Log event
      await workspaceClient.from("renewal_events").insert([{
        workspace_id: currentWorkspace.id,
        contract_id: input.contract_id,
        event_type: "consumption_logged" as any,
        payload_json: { item_id: input.renewal_item_id, amount: input.amount, unit: input.unit || "hours" },
      }]);

      return data;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["renewal-usage", input.contract_id] });
      queryClient.invalidateQueries({ queryKey: ["renewal-items", input.contract_id] });
      toast.success("Consumo registado");
    },
    onError: () => toast.error("Erro ao registar consumo"),
  });
}

// Get usage stats for an item
export function useRenewalUsageStats(contractId: string | undefined, itemId: string | undefined) {
  const { data: usage = [] } = useRenewalUsage(contractId, itemId);

  const totalConsumed = usage.reduce((sum, u) => sum + Number(u.amount), 0);

  return { totalConsumed, entries: usage };
}
