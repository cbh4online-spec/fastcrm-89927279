import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { StoreOrderEvent } from "@/types/store-order";

export function useStoreOrderEvents(orderId: string | undefined) {
  return useQuery({
    queryKey: ["store-order-events", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from("store_order_events")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as StoreOrderEvent[];
    },
    enabled: !!orderId,
  });
}

export function useAddStoreOrderEvent() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ orderId, eventType, description, metadata }: {
      orderId: string;
      eventType: string;
      description: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("store_order_events").insert([{
        order_id: orderId,
        workspace_id: currentWorkspace?.id!,
        event_type: eventType,
        description,
        metadata: (metadata || null) as unknown as null,
        created_by: user?.id || null,
      }]);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["store-order-events", vars.orderId] });
      toast.success("Evento adicionado");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });
}
