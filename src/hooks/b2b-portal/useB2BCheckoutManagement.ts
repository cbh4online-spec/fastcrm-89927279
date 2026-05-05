import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as any;

export interface B2BCheckoutSettings {
  id?: string;
  workspace_id: string;
  show_related: boolean;
  show_kit: boolean;
  show_promotions: boolean;
  show_best_sellers: boolean;
  free_shipping_threshold: number;
  related_mode: "category" | "manual" | "manual_first";
  kit_mode: "manual" | "auto" | "both";
  auto_kit_discount_pct: number;
}

export interface B2BCheckoutKit {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  product_ids: string[];
  discount_pct: number;
  is_active: boolean;
  display_order: number;
  trigger_product_ids: string[];
}

export interface B2BRelatedRule {
  id: string;
  workspace_id: string;
  source_product_id: string;
  related_product_ids: string[];
  is_active: boolean;
  display_order: number;
}

const DEFAULT_SETTINGS = (workspaceId: string): B2BCheckoutSettings => ({
  workspace_id: workspaceId,
  show_related: true,
  show_kit: true,
  show_promotions: true,
  show_best_sellers: true,
  free_shipping_threshold: 150,
  related_mode: "manual_first",
  kit_mode: "manual",
  auto_kit_discount_pct: 5,
});

// SETTINGS ------------------------------------------------------------------
export function useB2BCheckoutSettings(workspaceId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["b2b-checkout-settings", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<B2BCheckoutSettings> => {
      if (!workspaceId) return DEFAULT_SETTINGS("");
      const { data, error } = await sb
        .from("b2b_checkout_settings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data ?? DEFAULT_SETTINGS(workspaceId);
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<B2BCheckoutSettings>) => {
      if (!workspaceId) throw new Error("workspace_id em falta");
      const current = query.data ?? DEFAULT_SETTINGS(workspaceId);
      const merged = { ...current, ...patch, workspace_id: workspaceId };
      const { error } = await sb
        .from("b2b_checkout_settings")
        .upsert(merged, { onConflict: "workspace_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["b2b-checkout-settings", workspaceId] });
      toast.success("Definições guardadas");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro a guardar"),
  });

  return { ...query, save };
}

// KITS ----------------------------------------------------------------------
export function useB2BCheckoutKits(workspaceId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["b2b-checkout-kits", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<B2BCheckoutKit[]> => {
      if (!workspaceId) return [];
      const { data, error } = await sb
        .from("b2b_checkout_kits")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as B2BCheckoutKit[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (kit: Partial<B2BCheckoutKit>) => {
      if (!workspaceId) throw new Error("workspace_id em falta");
      const payload: any = { ...kit, workspace_id: workspaceId };
      const { error } = await sb.from("b2b_checkout_kits").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["b2b-checkout-kits", workspaceId] });
      toast.success("Kit guardado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro a guardar kit"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from("b2b_checkout_kits")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["b2b-checkout-kits", workspaceId] });
      toast.success("Kit removido");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro a remover"),
  });

  return { ...query, upsert, remove };
}

// RELATED RULES -------------------------------------------------------------
export function useB2BRelatedRules(workspaceId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["b2b-related-rules", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<B2BRelatedRule[]> => {
      if (!workspaceId) return [];
      const { data, error } = await sb
        .from("b2b_checkout_related_rules")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as B2BRelatedRule[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (rule: Partial<B2BRelatedRule>) => {
      if (!workspaceId) throw new Error("workspace_id em falta");
      const payload: any = { ...rule, workspace_id: workspaceId };
      const { error } = await sb
        .from("b2b_checkout_related_rules")
        .upsert(payload, { onConflict: "workspace_id,source_product_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["b2b-related-rules", workspaceId] });
      toast.success("Regra guardada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro a guardar regra"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from("b2b_checkout_related_rules")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["b2b-related-rules", workspaceId] });
      toast.success("Regra removida");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro a remover"),
  });

  return { ...query, upsert, remove };
}
