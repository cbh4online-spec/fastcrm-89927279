import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as any;

// =========================================================================
// SETTINGS — continua em b2b_checkout_settings (apenas configuração visual)
// =========================================================================
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

// =========================================================================
// KITS — fonte canónica: product_kits + product_kit_items
// Filtramos por visibility_b2b=true e status='active' para o checkout B2B.
// =========================================================================
export interface B2BKitItem {
  id?: string;
  product_id: string;
  quantity: number;
}

export interface B2BKit {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  discount_pct: number;
  status: "draft" | "active" | "paused" | "archived" | "pending_approval";
  visibility_b2b: boolean;
  category: string | null;
  metadata: Record<string, unknown>;
  items: B2BKitItem[];
}

export function useB2BKits(workspaceId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["b2b-kits", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<B2BKit[]> => {
      if (!workspaceId) return [];
      const { data: kits, error } = await sb
        .from("product_kits")
        .select("id, workspace_id, name, description, discount_pct, status, visibility_b2b, category, metadata")
        .eq("workspace_id", workspaceId)
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const ids = (kits ?? []).map((k: any) => k.id);
      let itemsByKit = new Map<string, B2BKitItem[]>();
      if (ids.length > 0) {
        const { data: items } = await sb
          .from("product_kit_items")
          .select("id, kit_id, product_id, quantity")
          .in("kit_id", ids);
        for (const it of (items ?? []) as any[]) {
          const arr = itemsByKit.get(it.kit_id) ?? [];
          arr.push({ id: it.id, product_id: it.product_id, quantity: Number(it.quantity) || 1 });
          itemsByKit.set(it.kit_id, arr);
        }
      }

      return (kits ?? []).map((k: any) => ({
        ...k,
        discount_pct: Number(k.discount_pct) || 0,
        items: itemsByKit.get(k.id) ?? [],
      })) as B2BKit[];
    },
  });

  // upsert: cria/actualiza kit + sincroniza itens
  const upsert = useMutation({
    mutationFn: async (kit: Partial<B2BKit> & { items: B2BKitItem[] }) => {
      if (!workspaceId) throw new Error("workspace_id em falta");
      const itemsClean = (kit.items ?? []).filter((i) => i.product_id);
      if (itemsClean.length < 2) throw new Error("Um kit precisa de pelo menos 2 produtos.");

      const payload: any = {
        workspace_id: workspaceId,
        name: kit.name?.trim() || "Kit sem nome",
        description: kit.description ?? null,
        discount_pct: Math.max(0, Math.min(100, Number(kit.discount_pct) || 0)),
        status: kit.status ?? "active",
        visibility_b2b: kit.visibility_b2b ?? true,
        category: kit.category ?? null,
        composition_type: "fixed_kit",
        pricing_mode: "discount_on_sum",
        requires_approval: false,
        source: "manual",
        kit_type: "kit",
      };
      if (kit.id) payload.id = kit.id;

      const { data: saved, error } = await sb
        .from("product_kits")
        .upsert(payload)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      const kitId = saved?.id ?? kit.id;
      if (!kitId) throw new Error("Falhou a obter id do kit");

      // Sincronizar itens (estratégia simples: apagar todos e reinserir)
      await sb.from("product_kit_items").delete().eq("kit_id", kitId);
      const rows = itemsClean.map((it, idx) => ({
        kit_id: kitId,
        product_id: it.product_id,
        quantity: Math.max(1, Number(it.quantity) || 1),
        sort_order: idx,
        is_required: true,
      }));
      if (rows.length > 0) {
        const { error: itemsErr } = await sb.from("product_kit_items").insert(rows);
        if (itemsErr) throw itemsErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["b2b-kits", workspaceId] });
      toast.success("Kit guardado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro a guardar kit"),
  });

  const setVisibility = useMutation({
    mutationFn: async ({ id, visibility_b2b }: { id: string; visibility_b2b: boolean }) => {
      const { error } = await sb
        .from("product_kits")
        .update({ visibility_b2b })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["b2b-kits", workspaceId] }),
    onError: (e: any) => toast.error(e?.message ?? "Erro a actualizar"),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: B2BKit["status"] }) => {
      const { error } = await sb.from("product_kits").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["b2b-kits", workspaceId] }),
    onError: (e: any) => toast.error(e?.message ?? "Erro a actualizar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // soft via status archived (alinhado com o módulo Produtos)
      const { error } = await sb
        .from("product_kits")
        .update({ status: "archived" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["b2b-kits", workspaceId] });
      toast.success("Kit arquivado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro a remover"),
  });

  return { ...query, upsert, setVisibility, setStatus, remove };
}

// =========================================================================
// CROSS-SELLS — fonte canónica: product_cross_sells (1 linha por par)
// =========================================================================
export interface B2BCrossSell {
  id: string;
  workspace_id: string;
  source_product_id: string;
  target_product_id: string;
  weight: number;
  reason: string | null;
  is_active: boolean;
}

export function useB2BCrossSells(workspaceId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["b2b-cross-sells", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<B2BCrossSell[]> => {
      if (!workspaceId) return [];
      const { data, error } = await sb
        .from("product_cross_sells")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("source_product_id", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as B2BCrossSell[];
    },
  });

  const upsertMany = useMutation({
    mutationFn: async (
      rows: { source_product_id: string; target_product_id: string; weight?: number; reason?: string | null }[],
    ) => {
      if (!workspaceId) throw new Error("workspace_id em falta");
      const payload = rows
        .filter((r) => r.source_product_id && r.target_product_id && r.source_product_id !== r.target_product_id)
        .map((r) => ({
          workspace_id: workspaceId,
          source_product_id: r.source_product_id,
          target_product_id: r.target_product_id,
          weight: Math.max(1, Math.min(10, Number(r.weight) || 5)),
          reason: r.reason ?? null,
          is_active: true,
        }));
      if (payload.length === 0) return;
      const { error } = await sb
        .from("product_cross_sells")
        .upsert(payload, { onConflict: "workspace_id,source_product_id,target_product_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["b2b-cross-sells", workspaceId] });
      toast.success("Relacionados guardados");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro a guardar relacionados"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await sb.from("product_cross_sells").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["b2b-cross-sells", workspaceId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("product_cross_sells").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["b2b-cross-sells", workspaceId] });
      toast.success("Removido");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro a remover"),
  });

  return { ...query, upsertMany, toggle, remove };
}
