import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProcurementNeed {
  id: string;
  workspace_id: string;
  product_id: string | null;
  variant_id: string | null;
  project_id: string | null;
  demand_total: number;
  stock_on_hand: number;
  stock_allocated: number;
  stock_available: number;
  shortage: number;
  earliest_due_date: string | null;
  demand_sources_json: any[];
  status: string;
  recommended_supplier_id: string | null;
  suggested_unit_price: number | null;
  suggestion_json: any;
  last_computed_at: string | null;
  priority_score: number;
  estimated_value: number;
  created_at: string;
  updated_at: string | null;
  // Joined
  products?: { name: string; sku: string | null; category: string | null } | null;
  suppliers?: { name: string } | null;
}

export function useProcurementNeedsBoard(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["procurement-needs-board", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("procurement_needs")
        .select("*, products:product_id(name, sku, category), suppliers:recommended_supplier_id(name)")
        .eq("workspace_id", workspaceId)
        .is("project_id", null)
        .neq("status", "resolved")
        .order("priority_score", { ascending: false }) as any;

      if (error) throw error;
      return (data || []) as ProcurementNeed[];
    },
    enabled: !!workspaceId,
  });
}

export function useRecomputeNeeds(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("procurement-needs-recompute", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["procurement-needs-board", workspaceId] });
      toast.success(`Recálculo completo: ${data?.needs_updated || 0} atualizados, ${data?.needs_resolved || 0} resolvidos`);
    },
    onError: (err: any) => {
      toast.error("Erro ao recalcular: " + (err.message || "Erro desconhecido"));
    },
  });
}

export function useUpdateNeedStatus(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ needId, status }: { needId: string; status: string }) => {
      const { error } = await supabase
        .from("procurement_needs")
        .update({ status, updated_at: new Date().toISOString() } as any)
        .eq("id", needId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement-needs-board", workspaceId] });
    },
  });
}

export function useCreatePOsFromNeeds(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (needIds: string[]) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("procurement-needs-create-pos", {
        body: { workspace_id: workspaceId, need_ids: needIds },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["procurement-needs-board", workspaceId] });
      toast.success(`${data?.count || 0} Ordem(ns) de Compra criada(s)`);
    },
    onError: (err: any) => {
      toast.error("Erro ao criar OC: " + (err.message || "Erro desconhecido"));
    },
  });
}

export function useCreateRFQFromNeeds(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ needIds, title, dueDate }: { needIds: string[]; title?: string; dueDate?: string }) => {
      if (!workspaceId) throw new Error("No workspace");

      // Get needs to extract supplier info
      const { data: needs } = await supabase
        .from("procurement_needs")
        .select("id, recommended_supplier_id, shortage, product_id")
        .in("id", needIds) as any;

      const supplierIds = [...new Set((needs || []).map((n: any) => n.recommended_supplier_id).filter(Boolean))];

      const { data, error } = await supabase.functions.invoke("rfq-create-from-needs", {
        body: {
          workspace_id: workspaceId,
          project_id: null,
          supplier_ids: supplierIds,
          need_ids: needIds,
          title: title || `RFQ - Necessidades de Compra ${new Date().toLocaleDateString("pt-PT")}`,
          due_date: dueDate || null,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement-needs-board", workspaceId] });
      toast.success("RFQ criada com sucesso");
    },
    onError: (err: any) => {
      toast.error("Erro ao criar RFQ: " + (err.message || "Erro desconhecido"));
    },
  });
}
