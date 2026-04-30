import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type CompositionType =
  | "fixed_kit"
  | "configurable_kit"
  | "dynamic_bundle"
  | "assembled_product"
  | "campaign_bundle"
  | "replenishment_pack"
  | "ai_suggested_pack";

export type PricingMode =
  | "sum_components"
  | "fixed_price"
  | "discount_on_sum"
  | "min_margin"
  | "per_channel"
  | "per_segment"
  | "per_tier";

export type KitStatus = "draft" | "pending_approval" | "active" | "paused" | "archived";
export type MarginGuardLevel = "safe" | "attention" | "danger" | "not_recommended";

export interface CompositeProduct {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  image_url: string | null;
  category: string | null;
  composition_type: CompositionType;
  pricing_mode: PricingMode;
  fixed_price: number | null;
  discount_pct: number | null;
  min_margin_pct: number | null;
  status: KitStatus;
  validation_status: string | null;
  visibility_b2b: boolean | null;
  sales_channels: string[] | null;
  requires_approval: boolean | null;
  margin_guard_level: MarginGuardLevel | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
}

export interface CompositeComponent {
  id: string;
  kit_id: string;
  product_id: string | null;
  product_name_suggested: string | null;
  quantity: number;
  is_required: boolean | null;
  group_id: string | null;
  allows_substitution: boolean | null;
  sort_order: number | null;
  unit_cost_snapshot: number | null;
  unit_price_snapshot: number | null;
  notes: string | null;
  product?: { id: string; name: string; sku: string | null; base_price: number; direct_cost?: number | null; avg_cost?: number | null; images: any };
}

export interface CompositeGroup {
  id: string;
  kit_id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_required: boolean;
  min_choices: number;
  max_choices: number;
  sort_order: number;
}

export interface CompositeSubstitute {
  id: string;
  kit_id: string;
  workspace_id: string;
  original_product_id: string;
  substitute_product_id: string;
  priority: number;
  reason: string | null;
  estimated_margin_pct: number | null;
  is_active: boolean;
  original_product?: { id: string; name: string };
  substitute_product?: { id: string; name: string; base_price: number };
}

export interface AISuggestion {
  id: string;
  workspace_id: string;
  suggestion_type: string;
  kit_id: string | null;
  client_id: string | null;
  title: string;
  rationale: string | null;
  payload: any;
  estimated_margin_pct: number | null;
  estimated_revenue: number | null;
  confidence: number | null;
  status: string;
  created_at: string;
}

export interface KitStockInfo {
  kit_id: string;
  available_units: number;
  limiting_component: { product_id: string; product_name: string; available: number; needed_per_kit: number } | null;
  missing_components: Array<{ product_id: string; product_name: string; needed_per_kit: number; available: number; shortage: number }>;
}

// ============ Composite products list ============
export function useCompositeProducts() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["composite-products", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_kits")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CompositeProduct[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCompositeProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["composite-product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_kits")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as CompositeProduct | null;
    },
    enabled: !!id,
  });
}

export function useCreateCompositeProduct() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Partial<CompositeProduct> & { name: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("product_kits")
        .insert({
          workspace_id: currentWorkspace!.id,
          created_by: u.user?.id ?? null,
          name: input.name,
          description: input.description ?? null,
          sku: input.sku ?? null,
          image_url: input.image_url ?? null,
          category: input.category ?? null,
          composition_type: input.composition_type ?? "fixed_kit",
          pricing_mode: input.pricing_mode ?? "sum_components",
          fixed_price: input.fixed_price ?? null,
          discount_pct: input.discount_pct ?? 0,
          min_margin_pct: input.min_margin_pct ?? 0,
          status: input.status ?? "draft",
          visibility_b2b: input.visibility_b2b ?? false,
          sales_channels: input.sales_channels ?? ["internal"],
          requires_approval: input.requires_approval ?? true,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as CompositeProduct;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["composite-products"] });
      toast.success("Produto composto criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCompositeProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CompositeProduct> & { id: string }) => {
      const { error } = await supabase.from("product_kits").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["composite-products"] });
      qc.invalidateQueries({ queryKey: ["composite-product", vars.id] });
      toast.success("Atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCompositeProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_kits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["composite-products"] });
      toast.success("Removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useApproveCompositeProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("product_kits")
        .update({
          status: "active",
          validation_status: "approved",
          approved_by: u.user?.id ?? null,
          approved_at: new Date().toISOString(),
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["composite-products"] });
      qc.invalidateQueries({ queryKey: ["composite-product", id] });
      toast.success("Kit aprovado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ============ Components ============
export function useCompositeComponents(kitId: string | undefined) {
  return useQuery({
    queryKey: ["composite-components", kitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_kit_items")
        .select("*, product:products(id, name, sku, base_price, direct_cost, avg_cost, images)")
        .eq("kit_id", kitId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as CompositeComponent[];
    },
    enabled: !!kitId,
  });
}

export function useAddComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kit_id: string; product_id: string; quantity: number; is_required?: boolean; allows_substitution?: boolean; group_id?: string | null; sort_order?: number; notes?: string }) => {
      // Snapshot price/cost
      const { data: prod } = await supabase
        .from("products")
        .select("base_price, direct_cost, avg_cost")
        .eq("id", input.product_id)
        .maybeSingle();
      const { error } = await supabase.from("product_kit_items").insert({
        ...input,
        unit_price_snapshot: prod?.base_price ?? null,
        unit_cost_snapshot: prod?.direct_cost ?? prod?.avg_cost ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["composite-components", vars.kit_id] });
      qc.invalidateQueries({ queryKey: ["composite-stock", vars.kit_id] });
      toast.success("Componente adicionado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, kit_id, ...updates }: Partial<CompositeComponent> & { id: string; kit_id: string }) => {
      const { error } = await supabase.from("product_kit_items").update(updates as any).eq("id", id);
      if (error) throw error;
      return kit_id;
    },
    onSuccess: (kit_id) => {
      qc.invalidateQueries({ queryKey: ["composite-components", kit_id] });
      qc.invalidateQueries({ queryKey: ["composite-stock", kit_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, kit_id }: { id: string; kit_id: string }) => {
      const { error } = await supabase.from("product_kit_items").delete().eq("id", id);
      if (error) throw error;
      return kit_id;
    },
    onSuccess: (kit_id) => {
      qc.invalidateQueries({ queryKey: ["composite-components", kit_id] });
      qc.invalidateQueries({ queryKey: ["composite-stock", kit_id] });
      toast.success("Componente removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ============ Groups ============
export function useCompositeGroups(kitId: string | undefined) {
  return useQuery({
    queryKey: ["composite-groups", kitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("composite_product_groups")
        .select("*")
        .eq("kit_id", kitId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as CompositeGroup[];
    },
    enabled: !!kitId,
  });
}

export function useUpsertGroup() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Partial<CompositeGroup> & { kit_id: string; name: string }) => {
      const payload: any = { workspace_id: currentWorkspace!.id, ...input };
      if (input.id) {
        const { error } = await supabase.from("composite_product_groups").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("composite_product_groups").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["composite-groups", vars.kit_id] });
      toast.success("Grupo guardado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, kit_id }: { id: string; kit_id: string }) => {
      const { error } = await supabase.from("composite_product_groups").delete().eq("id", id);
      if (error) throw error;
      return kit_id;
    },
    onSuccess: (kit_id) => {
      qc.invalidateQueries({ queryKey: ["composite-groups", kit_id] });
      toast.success("Grupo removido");
    },
  });
}

// ============ Substitutes ============
export function useCompositeSubstitutes(kitId: string | undefined) {
  return useQuery({
    queryKey: ["composite-substitutes", kitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("composite_product_substitutes")
        .select("*, original_product:products!composite_product_substitutes_original_product_id_fkey(id, name), substitute_product:products!composite_product_substitutes_substitute_product_id_fkey(id, name, base_price)")
        .eq("kit_id", kitId!)
        .order("priority", { ascending: true });
      if (error) throw error;
      return (data || []) as CompositeSubstitute[];
    },
    enabled: !!kitId,
  });
}

export function useAddSubstitute() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { kit_id: string; original_product_id: string; substitute_product_id: string; priority?: number; reason?: string }) => {
      const { error } = await supabase.from("composite_product_substitutes").insert({
        workspace_id: currentWorkspace!.id,
        ...input,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["composite-substitutes", vars.kit_id] });
      toast.success("Substituto adicionado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveSubstitute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, kit_id }: { id: string; kit_id: string }) => {
      const { error } = await supabase.from("composite_product_substitutes").delete().eq("id", id);
      if (error) throw error;
      return kit_id;
    },
    onSuccess: (kit_id) => {
      qc.invalidateQueries({ queryKey: ["composite-substitutes", kit_id] });
      toast.success("Substituto removido");
    },
  });
}

// ============ Stock virtual ============
export function useKitStock(kitId: string | undefined) {
  return useQuery({
    queryKey: ["composite-stock", kitId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_composite_kit_stock", { _kit_id: kitId! });
      if (error) throw error;
      return data as unknown as KitStockInfo;
    },
    enabled: !!kitId,
    staleTime: 30_000,
  });
}

// ============ Simulations ============
export function useCompositeSimulations(kitId: string | undefined) {
  return useQuery({
    queryKey: ["composite-simulations", kitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("composite_product_simulations")
        .select("*")
        .eq("kit_id", kitId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!kitId,
  });
}

export function useCreateSimulation() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { kit_id: string; expected_quantity: number; total_cost: number; total_revenue: number; margin_pct: number; missing_components?: any; required_stock?: any; margin_risk?: string; recommendation?: string; inputs?: any }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("composite_product_simulations")
        .insert({
          workspace_id: currentWorkspace!.id,
          user_id: u.user?.id,
          ...input,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["composite-simulations", vars.kit_id] });
      toast.success("Simulação guardada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ============ AI Suggestions ============
export function useAISuggestions(filters?: { status?: string }) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["composite-ai-suggestions", currentWorkspace?.id, filters?.status],
    queryFn: async () => {
      let q = supabase
        .from("composite_product_ai_suggestions")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AISuggestion[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useReviewAISuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" | "converted" }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("composite_product_ai_suggestions")
        .update({ status, reviewed_by: u.user?.id ?? null, reviewed_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["composite-ai-suggestions"] });
      toast.success("Sugestão atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ============ Helpers ============
export function calcKitTotals(components: CompositeComponent[]) {
  let totalCost = 0;
  let totalPrice = 0;
  for (const c of components) {
    const cost = Number(c.unit_cost_snapshot ?? c.product?.direct_cost ?? c.product?.avg_cost ?? 0);
    const price = Number(c.unit_price_snapshot ?? c.product?.base_price ?? 0);
    totalCost += cost * c.quantity;
    totalPrice += price * c.quantity;
  }
  return { totalCost, totalPrice };
}

export function calcFinalPrice(kit: CompositeProduct, components: CompositeComponent[]) {
  const { totalCost, totalPrice } = calcKitTotals(components);
  let finalPrice = totalPrice;
  switch (kit.pricing_mode) {
    case "fixed_price":
      finalPrice = Number(kit.fixed_price ?? totalPrice);
      break;
    case "discount_on_sum":
      finalPrice = totalPrice * (1 - Number(kit.discount_pct ?? 0) / 100);
      break;
    case "min_margin": {
      const minMargin = Number(kit.min_margin_pct ?? 0) / 100;
      finalPrice = minMargin >= 1 ? totalCost : totalCost / (1 - minMargin);
      break;
    }
    default:
      finalPrice = totalPrice;
  }
  const margin = finalPrice - totalCost;
  const marginPct = finalPrice > 0 ? (margin / finalPrice) * 100 : 0;
  return { totalCost, totalPrice, finalPrice, margin, marginPct };
}

export function classifyMargin(marginPct: number, minMarginPct: number): MarginGuardLevel {
  if (marginPct < 0) return "not_recommended";
  if (marginPct < minMarginPct) return "danger";
  if (marginPct < minMarginPct + 5) return "attention";
  return "safe";
}
