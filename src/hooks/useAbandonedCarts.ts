import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  type NormalisedAbandonedCart,
  normaliseStoreCart,
  normaliseLegacyCart,
  isPendingStatus,
  isRecoveredStatus,
  isExpiredStatus,
} from "@/lib/abandonedCartNormalizer";

const sb = supabase as any;

// Re-export for consumers
export type AbandonedCart = NormalisedAbandonedCart;

interface AbandonedCartFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Reads from both abandoned_carts (legacy) and store_abandoned_carts (current detector),
 * merging results and normalising field names via shared normalizer.
 */
export function useAbandonedCarts(filters?: AbandonedCartFilters) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["abandoned-carts", wsId, filters],
    queryFn: async () => {
      if (!wsId) return [];

      const [legacyRes, storeRes] = await Promise.all([
        sb.from("abandoned_carts").select("*").eq("workspace_id", wsId).order("detected_at", { ascending: false }).limit(200),
        sb.from("store_abandoned_carts").select("*").eq("workspace_id", wsId).order("abandoned_at", { ascending: false }).limit(200),
      ]);

      const legacy = (legacyRes.data || []).map(normaliseLegacyCart);
      const store = (storeRes.data || []).map(normaliseStoreCart);

      // Merge, deduplicate by id, sort by detected_at
      const seen = new Set<string>();
      const unique = [...legacy, ...store].filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });

      // Apply filters
      let result = unique;
      if (filters?.status && filters.status !== "all") {
        result = result.filter((c) => c.recovery_status === filters.status);
      }
      if (filters?.dateFrom) {
        result = result.filter((c) => c.detected_at >= filters.dateFrom!);
      }
      if (filters?.dateTo) {
        result = result.filter((c) => c.detected_at <= filters.dateTo!);
      }

      result.sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());
      return result;
    },
    enabled: !!wsId,
  });
}

export function useAbandonedCartStats() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["abandoned-cart-stats", wsId],
    queryFn: async () => {
      if (!wsId) return { total: 0, pending: 0, recovered: 0, expired: 0, totalValue: 0, recoveredValue: 0 };

      const [legacyRes, storeRes] = await Promise.all([
        sb.from("abandoned_carts").select("recovery_status, cart_value").eq("workspace_id", wsId),
        sb.from("store_abandoned_carts").select("recovery_status, outreach_status, subtotal, recovered_value").eq("workspace_id", wsId),
      ]);

      const legacyCarts = (legacyRes.data || []).map((c: any) => ({
        status: c.recovery_status || "pending",
        value: Number(c.cart_value || 0),
        recoveredValue: 0,
      }));

      const storeCarts = (storeRes.data || []).map((c: any) => ({
        status: c.outreach_status || c.recovery_status || "pending",
        value: Number(c.subtotal || 0),
        recoveredValue: Number(c.recovered_value || 0),
      }));

      const all = [...legacyCarts, ...storeCarts];
      const total = all.length;
      const pending = all.filter((c) => isPendingStatus(c.status)).length;
      const recovered = all.filter((c) => isRecoveredStatus(c.status)).length;
      const expired = all.filter((c) => isExpiredStatus(c.status)).length;
      const totalValue = all.reduce((s, c) => s + c.value, 0);
      const recoveredValue = all
        .filter((c) => isRecoveredStatus(c.status))
        .reduce((s, c) => s + (c.recoveredValue || c.value), 0);

      return { total, pending, recovered, expired, totalValue, recoveredValue };
    },
    enabled: !!wsId,
  });
}
