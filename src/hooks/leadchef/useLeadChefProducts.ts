import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LeadChefProductRow {
  id: string;
  workspace_id: string;
  name: string;
  points: number;
  price: number;
  promo: boolean;
  category: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadChefProductInput {
  name: string;
  points: number;
  price: number;
  promo?: boolean;
  category?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

const KEY = (ws: string | undefined) => ["leadchef-products", ws];

export function useLeadChefProducts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: KEY(workspaceId),
    enabled: !!workspaceId,
    queryFn: async (): Promise<LeadChefProductRow[]> => {
      const { data, error } = await supabase
        .from("leadchef_products")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LeadChefProductRow[];
    },
  });
}

export function useUpsertLeadChefProduct(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id?: string } & LeadChefProductInput) => {
      if (!workspaceId) throw new Error("Sem workspace");
      const { id, ...rest } = payload;
      const row = {
        workspace_id: workspaceId,
        name: rest.name.trim(),
        points: Number(rest.points) || 0,
        price: Number(rest.price) || 0,
        promo: !!rest.promo,
        category: rest.category?.trim() || null,
        sort_order: Number(rest.sort_order) || 0,
        is_active: rest.is_active ?? true,
      };
      if (id) {
        const { error } = await supabase
          .from("leadchef_products")
          .update(row)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("leadchef_products")
          .insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(workspaceId) });
      toast.success("Produto guardado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao guardar produto"),
  });
}

export function useDeleteLeadChefProduct(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("leadchef_products")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(workspaceId) });
      toast.success("Produto eliminado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao eliminar"),
  });
}
