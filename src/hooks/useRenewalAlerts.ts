import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import type { RenewalItem, RenewalContract } from "@/types/renewal";

export interface RenewalAlert {
  id: string;
  type: "overdue" | "upcoming_7" | "low_pack" | "expiring";
  title: string;
  message: string;
  contractId: string;
  companyName: string;
  itemName?: string;
  daysUntil?: number;
  percentage?: number;
}

export function useRenewalAlerts() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["renewal-alerts", currentWorkspace?.id],
    queryFn: async (): Promise<RenewalAlert[]> => {
      if (!workspaceClient || !currentWorkspace) return [];

      // Get active contracts with items
      const { data: contracts, error } = await workspaceClient
        .from("renewal_contracts")
        .select("id, workspace_id, company_id, status, next_renewal_date, total_mrr, company:companies(id, name)")
        .eq("workspace_id", currentWorkspace.id)
        .in("status", ["active", "paused"] as any);

      if (error) throw error;

      const { data: items, error: itemsError } = await workspaceClient
        .from("renewal_items")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .in("status", ["active", "pending_renewal", "overdue"] as any);

      if (itemsError) throw itemsError;

      const alerts: RenewalAlert[] = [];
      const now = new Date();
      const contractMap = new Map((contracts || []).map(c => [c.id, c]));

      for (const item of (items || [])) {
        const contract = contractMap.get(item.contract_id) as any;
        if (!contract) continue;
        const companyName = contract.company?.name || "—";

        // Overdue items
        if (item.status === "overdue" || (item.next_renewal_date && new Date(item.next_renewal_date) < now)) {
          const daysOverdue = item.next_renewal_date
            ? Math.ceil((now.getTime() - new Date(item.next_renewal_date).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          if (daysOverdue > 0) {
            alerts.push({
              id: `overdue-${item.id}`,
              type: "overdue",
              title: `Em atraso: ${item.name}`,
              message: `${daysOverdue} dias em atraso`,
              contractId: contract.id,
              companyName,
              itemName: item.name,
              daysUntil: -daysOverdue,
            });
          }
        }

        // Upcoming 7 days
        if (item.next_renewal_date) {
          const daysUntil = Math.ceil((new Date(item.next_renewal_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntil >= 0 && daysUntil <= 7) {
            alerts.push({
              id: `upcoming-${item.id}`,
              type: "upcoming_7",
              title: `Renovação próxima: ${item.name}`,
              message: daysUntil === 0 ? "Hoje" : `Em ${daysUntil} dia(s)`,
              contractId: contract.id,
              companyName,
              itemName: item.name,
              daysUntil,
            });
          }
        }

        // Low packs
        if (item.item_type === "hours_pack" && item.meta_json) {
          const meta = item.meta_json as Record<string, any>;
          const included = meta.hours_included || 0;
          const remaining = meta.hours_remaining || 0;
          if (included > 0) {
            const pct = Math.round((remaining / included) * 100);
            if (pct <= 20) {
              alerts.push({
                id: `lowpack-${item.id}`,
                type: "low_pack",
                title: `Pack baixo: ${item.name}`,
                message: `${remaining.toFixed(1)}h de ${included}h (${pct}%)`,
                contractId: contract.id,
                companyName,
                itemName: item.name,
                percentage: pct,
              });
            }
          }

          // Expiring packs (15 days)
          if (meta.expiry_date) {
            const daysToExpiry = Math.ceil((new Date(meta.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysToExpiry > 0 && daysToExpiry <= 15) {
              alerts.push({
                id: `expiring-${item.id}`,
                type: "expiring",
                title: `Pack a expirar: ${item.name}`,
                message: `Expira em ${daysToExpiry} dia(s)`,
                contractId: contract.id,
                companyName,
                itemName: item.name,
                daysUntil: daysToExpiry,
              });
            }
          }
        }
      }

      // Sort: overdue first, then upcoming, then low packs, then expiring
      const priority = { overdue: 0, upcoming_7: 1, low_pack: 2, expiring: 3 };
      alerts.sort((a, b) => priority[a.type] - priority[b.type]);

      return alerts;
    },
    enabled: !!workspaceClient && !!currentWorkspace,
    refetchInterval: 5 * 60 * 1000, // 5 min
  });
}
