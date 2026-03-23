import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StockMovement {
  id: string;
  workspace_id: string;
  product_id: string;
  variant_id: string | null;
  location_id: string | null;
  movement_type: string;
  quantity: number;
  reason: string | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  unit_cost: number | null;
  balance_after: number | null;
  created_by: string | null;
  created_at: string;
}

export interface StockLocation {
  id: string;
  workspace_id: string;
  name: string;
  code: string | null;
  address: string | null;
  is_default: boolean;
  is_active: boolean;
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  in: "Entrada",
  out: "Saída",
  adjustment: "Ajuste",
  reserve: "Reserva",
  release: "Libertação",
  transfer: "Transferência",
  return: "Devolução",
};

const REASON_LABELS: Record<string, string> = {
  purchase: "Compra",
  sale: "Venda",
  manual_adjustment: "Ajuste manual",
  damage: "Dano",
  theft: "Roubo",
  return: "Devolução",
  correction: "Correção",
  proposal_reserve: "Reserva proposta",
  order_reserve: "Reserva encomenda",
  production: "Produção",
  transfer: "Transferência",
  other: "Outro",
};

export function getMovementTypeLabel(type: string) {
  return MOVEMENT_TYPE_LABELS[type] ?? type;
}

export function getReasonLabel(reason: string) {
  return REASON_LABELS[reason] ?? reason;
}

export function useStockMovements(workspaceId: string | undefined, productId: string) {
  return useQuery({
    queryKey: ["stock-movements", workspaceId, productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_stock_movements")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as StockMovement[];
    },
    enabled: !!workspaceId && !!productId,
  });
}

export function useStockLocations(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["stock-locations", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_stock_locations")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as StockLocation[];
    },
    enabled: !!workspaceId,
  });
}

interface AdjustStockInput {
  workspace_id: string;
  product_id: string;
  variant_id?: string;
  location_id?: string;
  movement_type: string;
  quantity: number;
  reason?: string;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  unit_cost?: number;
}

export function useAdjustStock() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: AdjustStockInput) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/product-stock-adjust`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(input),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao ajustar stock");
      return json;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["product", variables.product_id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Stock atualizado com sucesso");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useCreateStockLocation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { workspace_id: string; name: string; code?: string; address?: string; is_default?: boolean }) => {
      const { data, error } = await supabase
        .from("product_stock_locations")
        .insert(input)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-locations"] });
      toast.success("Localização criada");
    },
    onError: () => toast.error("Erro ao criar localização"),
  });
}
