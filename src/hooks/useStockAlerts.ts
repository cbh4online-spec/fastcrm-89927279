import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface StockAlert {
  id: string;
  workspace_id: string;
  product_id: string;
  threshold: number;
  status: "active" | "acknowledged" | "resolved";
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
  product?: { id: string; name: string; stock_quantity: number; sku: string | null; images: any };
}

export function useStockAlerts(statusFilter?: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["stock-alerts", currentWorkspace?.id, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("stock_alerts")
        .select("*, product:products(id, name, stock_quantity, sku, images)")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (statusFilter) query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data as StockAlert[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateStockAlert() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { product_id: string; threshold: number }) => {
      const { error } = await supabase
        .from("stock_alerts")
        .insert({ ...input, workspace_id: currentWorkspace!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-alerts"] });
      toast.success("Alerta de stock criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateStockAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; threshold?: number; status?: string }) => {
      const { error } = await supabase.from("stock_alerts").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-alerts"] });
      toast.success("Alerta atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteStockAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stock_alerts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-alerts"] });
      toast.success("Alerta removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Produtos com stock abaixo do threshold */
export function useLowStockProducts() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["low-stock-products", currentWorkspace?.id],
    queryFn: async () => {
      const { data: alerts, error: alertsErr } = await supabase
        .from("stock_alerts")
        .select("*, product:products(id, name, stock_quantity, sku, images)")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("status", "active");
      if (alertsErr) throw alertsErr;
      return (alerts as StockAlert[]).filter(
        a => a.product && a.product.stock_quantity <= a.threshold
      );
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 60000,
  });
}
