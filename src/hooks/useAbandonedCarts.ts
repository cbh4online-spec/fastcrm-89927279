import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const sb = supabase as any;

export interface AbandonedCart {
  id: string;
  workspace_id: string;
  session_id: string | null;
  contact_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  cart_items: any[];
  cart_value: number;
  currency: string;
  detected_at: string;
  recovery_status: string;
  recovered_at: string | null;
  recovery_channel: string | null;
  recovery_url: string | null;
  touch_1_at: string | null;
  touch_2_at: string | null;
  touch_3_at: string | null;
  expires_at: string;
  created_at: string;
}

interface AbandonedCartFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Reads from both abandoned_carts (legacy) and store_abandoned_carts (current detector),
 * merging results and normalising field names.
 */
export function useAbandonedCarts(filters?: AbandonedCartFilters) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["abandoned-carts", wsId, filters],
    queryFn: async () => {
      if (!wsId) return [];

      // Query both tables in parallel
      const [legacyRes, storeRes] = await Promise.all([
        sb
          .from("abandoned_carts")
          .select("*")
          .eq("workspace_id", wsId)
          .order("detected_at", { ascending: false })
          .limit(200),
        sb
          .from("store_abandoned_carts")
          .select("*")
          .eq("workspace_id", wsId)
          .order("abandoned_at", { ascending: false })
          .limit(200),
      ]);

      const legacy = (legacyRes.data || []) as AbandonedCart[];

      // Normalise store_abandoned_carts to match AbandonedCart shape
      const store = ((storeRes.data || []) as any[]).map((c: any) => ({
        id: c.id,
        workspace_id: c.workspace_id,
        session_id: c.session_id,
        contact_id: c.contact_id,
        customer_email: c.customer_email,
        customer_name: c.customer_name,
        customer_phone: c.customer_phone,
        cart_items: c.items || [],
        cart_value: Number(c.subtotal || 0),
        currency: c.currency || "EUR",
        detected_at: c.abandoned_at || c.created_at,
        recovery_status: c.outreach_status || c.recovery_status || "pending",
        recovered_at: c.recovered_at,
        recovery_channel: c.contact_channel,
        recovery_url: null,
        touch_1_at: c.contacted_at,
        touch_2_at: null,
        touch_3_at: null,
        expires_at: c.expires_at || c.created_at,
        created_at: c.created_at,
      })) as AbandonedCart[];

      // Merge, deduplicate by id, sort by detected_at
      const merged = [...legacy, ...store];
      const seen = new Set<string>();
      const unique = merged.filter((c) => {
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
        status: c.recovery_status,
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
      const pending = all.filter((c) => ["pending", "in_progress", "touch_1_sent", "touch_2_sent", "touch_3_sent"].includes(c.status)).length;
      const recovered = all.filter((c) => c.status === "recovered").length;
      const expired = all.filter((c) => ["expired", "exited"].includes(c.status)).length;
      const totalValue = all.reduce((s, c) => s + c.value, 0);
      const recoveredValue = all
        .filter((c) => c.status === "recovered")
        .reduce((s, c) => s + (c.recoveredValue || c.value), 0);

      return { total, pending, recovered, expired, totalValue, recoveredValue };
    },
    enabled: !!wsId,
  });
}
