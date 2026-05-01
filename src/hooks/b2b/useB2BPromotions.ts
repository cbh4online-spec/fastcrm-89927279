import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const sb = supabase as any;

// ===== Quantity Breaks =====
export function useQuantityBreaks() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wid = currentWorkspace?.id;

  const list = useQuery({
    queryKey: ["partner-quantity-breaks", wid],
    enabled: !!wid,
    queryFn: async () => {
      const { data, error } = await sb
        .from("partner_quantity_breaks")
        .select("*, products(name, sku), partner_tiers(name)")
        .eq("workspace_id", wid)
        .order("min_qty", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: any) => {
      const row = { ...payload, workspace_id: wid };
      const { data, error } = payload.id
        ? await sb.from("partner_quantity_breaks").update(row).eq("id", payload.id).select().single()
        : await sb.from("partner_quantity_breaks").insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-quantity-breaks", wid] });
      toast.success("Quantity break gravado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("partner_quantity_breaks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-quantity-breaks", wid] });
      toast.success("Removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { list, upsert, remove };
}

// ===== Bundles =====
export function useBundles() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wid = currentWorkspace?.id;

  const list = useQuery({
    queryKey: ["partner-bundles", wid],
    enabled: !!wid,
    queryFn: async () => {
      const { data, error } = await sb
        .from("partner_bundles")
        .select("*, partner_bundle_items(id, product_id, required_qty, products(name, sku))")
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: any) => {
      const { items, id, ...header } = payload;
      const row = { ...header, workspace_id: wid };
      let bundleId = id;
      if (id) {
        const { error } = await sb.from("partner_bundles").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from("partner_bundles").insert(row).select().single();
        if (error) throw error;
        bundleId = data.id;
      }
      if (Array.isArray(items)) {
        await sb.from("partner_bundle_items").delete().eq("bundle_id", bundleId);
        if (items.length) {
          const rows = items.map((i: any) => ({
            bundle_id: bundleId,
            product_id: i.product_id,
            required_qty: i.required_qty || 1,
          }));
          const { error } = await sb.from("partner_bundle_items").insert(rows);
          if (error) throw error;
        }
      }
      return bundleId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-bundles", wid] });
      toast.success("Bundle gravado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("partner_bundles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-bundles", wid] });
      toast.success("Removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { list, upsert, remove };
}

// ===== Coupons =====
export function useCoupons() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wid = currentWorkspace?.id;

  const list = useQuery({
    queryKey: ["partner-coupons", wid],
    enabled: !!wid,
    queryFn: async () => {
      const { data, error } = await sb
        .from("partner_coupons")
        .select("*")
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: any) => {
      const row = { ...payload, workspace_id: wid, code: (payload.code || "").trim().toUpperCase() };
      const { data, error } = payload.id
        ? await sb.from("partner_coupons").update(row).eq("id", payload.id).select().single()
        : await sb.from("partner_coupons").insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-coupons", wid] });
      toast.success("Cupão gravado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("partner_coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-coupons", wid] });
      toast.success("Removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { list, upsert, remove };
}

// ===== Shipping rules =====
export function useShippingRules() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wid = currentWorkspace?.id;

  const item = useQuery({
    queryKey: ["partner-shipping-rules", wid],
    enabled: !!wid,
    queryFn: async () => {
      const { data, error } = await sb
        .from("partner_shipping_rules")
        .select("*")
        .eq("workspace_id", wid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (payload: any) => {
      const row = { ...payload, workspace_id: wid };
      const { data, error } = await sb
        .from("partner_shipping_rules")
        .upsert(row, { onConflict: "workspace_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-shipping-rules", wid] });
      toast.success("Regras de envio guardadas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { item, save };
}

// ===== Recovery config =====
export function useRecoveryConfig() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wid = currentWorkspace?.id;

  const item = useQuery({
    queryKey: ["partner-recovery-config", wid],
    enabled: !!wid,
    queryFn: async () => {
      const { data, error } = await sb
        .from("partner_recovery_config")
        .select("*")
        .eq("workspace_id", wid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (payload: any) => {
      const row = { ...payload, workspace_id: wid };
      const { data, error } = await sb
        .from("partner_recovery_config")
        .upsert(row, { onConflict: "workspace_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-recovery-config", wid] });
      toast.success("Configuração guardada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { item, save };
}

// ===== Funnel + Abandoned carts =====
export function usePartnerFunnel(days = 30) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["partner-funnel", wid, days],
    enabled: !!wid,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      const { data, error } = await sb
        .from("partner_funnel_events")
        .select("event_type, created_at")
        .eq("workspace_id", wid)
        .gte("created_at", since)
        .limit(5000);
      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        counts[r.event_type] = (counts[r.event_type] || 0) + 1;
      });
      return counts;
    },
  });
}

export function useAbandonedPartnerCarts() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["partner-abandoned-carts", wid],
    enabled: !!wid,
    queryFn: async () => {
      const { data, error } = await sb
        .from("partner_carts")
        .select("*, partner_accounts(legal_name, trade_name, account_code)")
        .eq("workspace_id", wid)
        .neq("recovery_stage", "none")
        .order("last_activity_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });
}
