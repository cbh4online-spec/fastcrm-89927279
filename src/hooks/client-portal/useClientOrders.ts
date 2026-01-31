import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OrderNote, OrderNoteItem, CreateOrderNoteData, CreateOrderNoteItemData } from "@/types/order-note";
import { toast } from "sonner";

interface UseClientOrdersReturn {
  orders: OrderNote[];
  loading: boolean;
  error: string | null;
  createOrder: (data: CreateOrderNoteData) => Promise<OrderNote | null>;
  addItemToOrder: (data: CreateOrderNoteItemData) => Promise<OrderNoteItem | null>;
  submitOrder: (orderId: string, installmentData?: { requested: boolean; count: number; notes: string }) => Promise<boolean>;
  currentDraft: OrderNote | null;
  draftLoading: boolean;
}

export function useClientOrders(clientUserId: string | undefined): UseClientOrdersReturn {
  const queryClient = useQueryClient();

  // Fetch all orders for this client
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ["client-orders", clientUserId],
    queryFn: async () => {
      if (!clientUserId) return [];

      const { data, error } = await supabase
        .from("order_notes")
        .select(`
          *,
          items:order_note_items(*)
        `)
        .eq("client_user_id", clientUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OrderNote[];
    },
    enabled: !!clientUserId,
  });

  // Fetch current draft order
  const { data: currentDraft = null, isLoading: draftLoading } = useQuery({
    queryKey: ["client-draft-order", clientUserId],
    queryFn: async () => {
      if (!clientUserId) return null;

      const { data, error } = await supabase
        .from("order_notes")
        .select(`
          *,
          items:order_note_items(*)
        `)
        .eq("client_user_id", clientUserId)
        .eq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as OrderNote | null;
    },
    enabled: !!clientUserId,
  });

  // Create new order
  const createOrderMutation = useMutation({
    mutationFn: async (data: CreateOrderNoteData) => {
      // Generate order number (trigger will also set it, but we need it for TypeScript)
      const year = new Date().getFullYear();
      const tempNumber = `NE-${year}-TEMP-${Date.now()}`;
      
      const { data: order, error } = await supabase
        .from("order_notes")
        .insert([{
          workspace_id: data.workspace_id,
          client_user_id: data.client_user_id,
          client_notes: data.client_notes || null,
          billing_address: JSON.parse(JSON.stringify(data.billing_address || {})),
          shipping_address: JSON.parse(JSON.stringify(data.shipping_address || {})),
          status: "draft" as const,
          order_number: tempNumber, // Will be replaced by trigger
        }])
        .select()
        .single();

      if (error) throw error;
      return order as OrderNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-orders"] });
      queryClient.invalidateQueries({ queryKey: ["client-draft-order"] });
    },
  });

  // Add item to order
  const addItemMutation = useMutation({
    mutationFn: async (data: CreateOrderNoteItemData) => {
      const { data: item, error } = await supabase
        .from("order_note_items")
        .insert({
          order_note_id: data.order_note_id,
          workspace_id: data.workspace_id,
          product_id: data.product_id,
          product_name: data.product_name,
          product_sku: data.product_sku,
          product_image_url: data.product_image_url,
          quantity: data.quantity,
          unit_price_net: data.unit_price_net,
          vat_rate: data.vat_rate ?? 23,
          position: data.position ?? 0,
          notes: data.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return item as OrderNoteItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-orders"] });
      queryClient.invalidateQueries({ queryKey: ["client-draft-order"] });
    },
  });

  // Submit order
  const submitOrderMutation = useMutation({
    mutationFn: async ({ 
      orderId, 
      installmentData 
    }: { 
      orderId: string; 
      installmentData?: { requested: boolean; count: number; notes: string } 
    }) => {
      const updateData: Record<string, any> = {
        status: installmentData?.requested ? "awaiting_approval" : "submitted",
        submitted_at: new Date().toISOString(),
      };

      if (installmentData?.requested) {
        updateData.installment_requested = true;
        updateData.installment_count = installmentData.count;
        updateData.installment_notes = installmentData.notes;
      }

      const { error } = await supabase
        .from("order_notes")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success("Encomenda enviada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["client-orders"] });
      queryClient.invalidateQueries({ queryKey: ["client-draft-order"] });
    },
    onError: (error) => {
      toast.error("Erro ao enviar encomenda: " + error.message);
    },
  });

  const createOrder = async (data: CreateOrderNoteData): Promise<OrderNote | null> => {
    try {
      return await createOrderMutation.mutateAsync(data);
    } catch {
      return null;
    }
  };

  const addItemToOrder = async (data: CreateOrderNoteItemData): Promise<OrderNoteItem | null> => {
    try {
      return await addItemMutation.mutateAsync(data);
    } catch {
      return null;
    }
  };

  const submitOrder = async (
    orderId: string, 
    installmentData?: { requested: boolean; count: number; notes: string }
  ): Promise<boolean> => {
    try {
      return await submitOrderMutation.mutateAsync({ orderId, installmentData });
    } catch {
      return false;
    }
  };

  return {
    orders,
    loading: ordersLoading,
    error: ordersError?.message || null,
    createOrder,
    addItemToOrder,
    submitOrder,
    currentDraft,
    draftLoading,
  };
}
