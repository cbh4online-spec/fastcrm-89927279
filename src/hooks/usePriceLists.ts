import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────
export interface PriceList {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  currency: string;
  is_default: boolean;
  is_active: boolean;
  priority: number;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
}

export interface PriceListItem {
  id: string;
  price_list_id: string;
  product_id: string;
  price: number;
  min_quantity: number;
  margin_percent: number | null;
  notes: string | null;
  product?: { name: string; sku: string | null; base_price: number };
}

export interface PriceRule {
  id: string;
  workspace_id: string;
  name: string;
  rule_type: "volume_discount" | "client_discount" | "category_discount" | "special_price";
  is_active: boolean;
  priority: number;
  contact_id: string | null;
  company_id: string | null;
  product_id: string | null;
  category: string | null;
  price_list_id: string | null;
  discount_type: "percentage" | "fixed" | "fixed_price";
  discount_value: number;
  min_quantity: number;
  max_quantity: number | null;
  valid_from: string | null;
  valid_until: string | null;
}

export interface ResolvedPrice {
  product_id: string;
  product_name: string;
  base_price: number;
  final_price: number;
  currency: string;
  quantity: number;
  line_total: number;
  price_source: string;
  price_list_id: string | null;
  cost: number;
  margin_amount: number;
  margin_percent: number;
  applied_rules: any[];
  discount_from_base: number;
  discount_percent_from_base: number;
}

// ─── Price Lists ────────────────────────────────────────

export function usePriceLists() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["price-lists", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_lists" as any)
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PriceList[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreatePriceList() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<PriceList>) => {
      const { error } = await supabase
        .from("price_lists" as any)
        .insert({ ...data, workspace_id: currentWorkspace!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-lists"] });
      toast.success("Lista de preços criada");
    },
    onError: () => toast.error("Erro ao criar lista"),
  });
}

export function useUpdatePriceList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PriceList> & { id: string }) => {
      const { error } = await supabase
        .from("price_lists" as any)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-lists"] });
      toast.success("Lista de preços atualizada");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });
}

export function useDeletePriceList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_lists" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-lists"] });
      toast.success("Lista eliminada");
    },
    onError: () => toast.error("Erro ao eliminar"),
  });
}

// ─── Price List Items ───────────────────────────────────

export function usePriceListItems(priceListId?: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["price-list-items", priceListId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_list_items" as any)
        .select("*, product:products(name, sku, base_price)")
        .eq("price_list_id", priceListId!)
        .order("min_quantity");
      if (error) throw error;
      return (data || []) as unknown as PriceListItem[];
    },
    enabled: !!priceListId && !!currentWorkspace?.id,
  });
}

export function useUpsertPriceListItem() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      price_list_id: string;
      product_id: string;
      price: number;
      min_quantity?: number;
      margin_percent?: number;
      notes?: string;
      id?: string;
    }) => {
      if (data.id) {
        const { error } = await supabase
          .from("price_list_items" as any)
          .update({
            price: data.price,
            min_quantity: data.min_quantity || 1,
            margin_percent: data.margin_percent,
            notes: data.notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("price_list_items" as any)
          .insert({
            workspace_id: currentWorkspace!.id,
            price_list_id: data.price_list_id,
            product_id: data.product_id,
            price: data.price,
            min_quantity: data.min_quantity || 1,
            margin_percent: data.margin_percent,
            notes: data.notes,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-list-items"] });
      toast.success("Preço guardado");
    },
    onError: () => toast.error("Erro ao guardar preço"),
  });
}

export function useDeletePriceListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_list_items" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-list-items"] });
    },
  });
}

// ─── Price Rules ────────────────────────────────────────

export function usePriceRules() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["price-rules", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_rules" as any)
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PriceRule[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreatePriceRule() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<PriceRule>) => {
      const { error } = await supabase
        .from("price_rules" as any)
        .insert({ ...data, workspace_id: currentWorkspace!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-rules"] });
      toast.success("Regra criada");
    },
    onError: () => toast.error("Erro ao criar regra"),
  });
}

export function useUpdatePriceRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PriceRule> & { id: string }) => {
      const { error } = await supabase
        .from("price_rules" as any)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-rules"] });
      toast.success("Regra atualizada");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });
}

export function useDeletePriceRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_rules" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-rules"] });
      toast.success("Regra eliminada");
    },
    onError: () => toast.error("Erro ao eliminar"),
  });
}

// ─── Resolve Price ──────────────────────────────────────

export function useResolvePrice() {
  return useMutation({
    mutationFn: async (params: {
      workspace_id: string;
      product_id: string;
      contact_id?: string;
      company_id?: string;
      quantity?: number;
    }): Promise<ResolvedPrice> => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resolve-product-price`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao calcular preço");
      }
      return res.json();
    },
  });
}
