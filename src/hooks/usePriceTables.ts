import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type PriceTableType = "segment" | "volume" | "promotional";

export interface VolumeTier {
  min_qty: number;
  max_qty: number | null;
  price: number;
}

export interface PriceTable {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  table_type: PriceTableType;
  customer_segment: string | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  is_default: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface PriceTableItem {
  id: string;
  price_table_id: string;
  product_id: string;
  unit_price: number;
  discount_percent: number;
  volume_tiers: unknown;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePriceTableInput {
  name: string;
  description?: string;
  table_type: PriceTableType;
  customer_segment?: string;
  valid_from?: string;
  valid_until?: string;
  is_active?: boolean;
  is_default?: boolean;
  priority?: number;
}

export interface UpdatePriceTableInput extends Partial<CreatePriceTableInput> {
  id: string;
}

export interface CreatePriceTableItemInput {
  price_table_id: string;
  product_id: string;
  unit_price: number;
  discount_percent?: number;
  volume_tiers?: VolumeTier[];
  notes?: string;
}

export interface UpdatePriceTableItemInput {
  id: string;
  unit_price?: number;
  discount_percent?: number;
  notes?: string;
}

export const tableTypeLabels: Record<PriceTableType, string> = {
  segment: "Por Segmento",
  volume: "Por Volume",
  promotional: "Promocional",
};

export const customerSegmentOptions = [
  { value: "end_customer", label: "Cliente Final" },
  { value: "reseller", label: "Revendedor" },
  { value: "partner", label: "Parceiro" },
  { value: "vip", label: "VIP" },
  { value: "wholesale", label: "Grossista" },
];

export function usePriceTables() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["price-tables", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("price_tables")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("priority", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as PriceTable[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function usePriceTable(id: string | undefined) {
  return useQuery({
    queryKey: ["price-table", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("price_tables")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as PriceTable;
    },
    enabled: !!id,
  });
}

export function usePriceTableItems(priceTableId: string | undefined) {
  return useQuery({
    queryKey: ["price-table-items", priceTableId],
    queryFn: async () => {
      if (!priceTableId) return [];

      const { data, error } = await supabase
        .from("price_table_items")
        .select(`
          *,
          product:products(id, name, sku, base_price, category)
        `)
        .eq("price_table_id", priceTableId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as (PriceTableItem & { product: { id: string; name: string; sku: string | null; base_price: number; category: string | null } })[];
    },
    enabled: !!priceTableId,
  });
}

export function useCreatePriceTable() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreatePriceTableInput) => {
      if (!currentWorkspace?.id) {
        throw new Error("Workspace não encontrado");
      }

      const { data, error } = await supabase
        .from("price_tables")
        .insert({
          ...input,
          workspace_id: currentWorkspace.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PriceTable;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-tables"] });
      toast.success("Tabela de preços criada com sucesso!");
    },
    onError: (error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Já existe uma tabela com este nome");
      } else {
        toast.error("Erro ao criar tabela: " + error.message);
      }
    },
  });
}

export function useUpdatePriceTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdatePriceTableInput) => {
      const { data, error } = await supabase
        .from("price_tables")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as PriceTable;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["price-tables"] });
      queryClient.invalidateQueries({ queryKey: ["price-table", data.id] });
      toast.success("Tabela de preços atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar tabela: " + error.message);
    },
  });
}

export function useDeletePriceTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("price_tables")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-tables"] });
      toast.success("Tabela de preços eliminada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao eliminar tabela: " + error.message);
    },
  });
}

export function useCreatePriceTableItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePriceTableItemInput) => {
      const { data, error } = await supabase
        .from("price_table_items")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as PriceTableItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["price-table-items", data.price_table_id] });
      toast.success("Produto adicionado à tabela!");
    },
    onError: (error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Este produto já está na tabela");
      } else {
        toast.error("Erro ao adicionar produto: " + error.message);
      }
    },
  });
}

export function useUpdatePriceTableItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdatePriceTableItemInput) => {
      const { data, error } = await supabase
        .from("price_table_items")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as PriceTableItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["price-table-items", data.price_table_id] });
      toast.success("Preço atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar preço: " + error.message);
    },
  });
}

export function useDeletePriceTableItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, priceTableId }: { id: string; priceTableId: string }) => {
      const { error } = await supabase
        .from("price_table_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return priceTableId;
    },
    onSuccess: (priceTableId) => {
      queryClient.invalidateQueries({ queryKey: ["price-table-items", priceTableId] });
      toast.success("Produto removido da tabela!");
    },
    onError: (error) => {
      toast.error("Erro ao remover produto: " + error.message);
    },
  });
}
