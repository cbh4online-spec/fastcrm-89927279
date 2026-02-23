import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductInventoryRow {
  id: string;
  product_id: string;
  workspace_id: string;
  stock_on_hand: number;
  stock_reserved: number;
  reorder_point: number;
  supplier_lead_time_days: number;
  updated_at: string;
  product?: { id: string; name: string; sku: string | null; images: string[] | null; category: string | null };
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  type: string;
  qty: number;
  source: string;
  ref_id: string | null;
  notes: string | null;
  created_at: string;
}

export function useProductInventory(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["product-inventory", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("product_inventory")
        .select("*, product:products(id, name, sku, images, category)")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ProductInventoryRow[];
    },
    enabled: !!workspaceId,
  });

  const adjustStock = useMutation({
    mutationFn: async ({ productId, type, qty, notes }: { productId: string; type: string; qty: number; notes?: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      // Record movement
      const { error: movErr } = await supabase.from("inventory_movements").insert({
        workspace_id: workspaceId,
        product_id: productId,
        type,
        qty,
        source: "manual",
        notes: notes || null,
      });
      if (movErr) throw movErr;

      // Update inventory
      const existing = inventory.find((i) => i.product_id === productId);
      const currentStock = existing?.stock_on_hand || 0;
      const newStock = type === "in" || type === "release" ? currentStock + qty : currentStock - qty;

      const { error } = await supabase
        .from("product_inventory")
        .upsert({
          product_id: productId,
          workspace_id: workspaceId,
          stock_on_hand: Math.max(0, newStock),
          updated_at: new Date().toISOString(),
        }, { onConflict: "product_id,workspace_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-inventory"] });
      toast.success("Stock atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar stock"),
  });

  const lowStockItems = inventory.filter((i) => i.stock_on_hand - i.stock_reserved <= i.reorder_point);

  return { inventory, isLoading, adjustStock: adjustStock.mutateAsync, lowStockItems };
}
