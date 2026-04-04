import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreatePriceRequestInput {
  workspace_id: string;
  product_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  message?: string;
}

export function useCreateStorePriceRequest() {
  return useMutation({
    mutationFn: async (input: CreatePriceRequestInput) => {
      const { data, error } = await (supabase as any)
        .from("store_price_requests")
        .insert({
          workspace_id: input.workspace_id,
          product_id: input.product_id,
          customer_name: input.customer_name,
          customer_email: input.customer_email,
          customer_phone: input.customer_phone || null,
          message: input.message || null,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Pedido de preço enviado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao enviar pedido. Tente novamente.");
    },
  });
}

export function useStorePriceRequests(workspaceId: string | undefined, status?: string) {
  return useQuery({
    queryKey: ["store-price-requests", workspaceId, status],
    queryFn: async () => {
      let query = (supabase as any)
        .from("store_price_requests")
        .select("*, products:product_id(name, images, primary_image_index)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function useUpdatePriceRequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: string; admin_notes?: string }) => {
      const update: any = { status };
      if (admin_notes !== undefined) update.admin_notes = admin_notes;
      const { error } = await (supabase as any)
        .from("store_price_requests")
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-price-requests"] });
      toast.success("Estado atualizado");
    },
  });
}
