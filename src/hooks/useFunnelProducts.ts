import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface FunnelProduct {
  id: string;
  funnel_id: string;
  product_id: string;
  workspace_id: string;
  position: string;
  order_index: number;
  created_at: string;
}

export function useFunnelProducts(funnelId: string | null) {
  return useQuery({
    queryKey: ["funnel-products", funnelId],
    queryFn: async () => {
      if (!funnelId) return [];
      const { data, error } = await supabase
        .from("funnel_products")
        .select("*, products(id, name, price, currency)")
        .eq("funnel_id", funnelId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!funnelId,
  });
}

export function useAddFunnelProduct() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { funnel_id: string; product_id: string; position?: string; order_index?: number }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await supabase
        .from("funnel_products")
        .insert({ ...input, workspace_id: currentWorkspace.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["funnel-products", d.funnel_id] });
      toast.success("Produto associado ao funil");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useRemoveFunnelProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, funnelId }: { id: string; funnelId: string }) => {
      const { error } = await supabase.from("funnel_products").delete().eq("id", id);
      if (error) throw error;
      return funnelId;
    },
    onSuccess: (funnelId) => {
      qc.invalidateQueries({ queryKey: ["funnel-products", funnelId] });
      toast.success("Produto removido do funil");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}
