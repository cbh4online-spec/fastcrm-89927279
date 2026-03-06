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
          order_number: tempNumber,
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
    onError: (error) => {
      console.warn("[ORDERS] CLIENT_ORDER_CREATE_FAILED", error.message);
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
    onError: (error) => {
      console.warn("[ORDERS] CLIENT_ORDER_ADD_ITEM_FAILED", error.message);
    },
  });

  // Submit order via edge function
  const submitOrderMutation = useMutation({
    mutationFn: async ({ 
      orderId, 
      installmentData 
    }: { 
      orderId: string; 
      installmentData?: { requested: boolean; count: number; notes: string } 
    }) => {
      const { data, error } = await supabase.functions.invoke('order-note-submit', {
        body: { orderId, installmentData }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      console.log("[ORDERS] Client order submitted");
      toast.success("Encomenda enviada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["client-orders"] });
      queryClient.invalidateQueries({ queryKey: ["client-draft-order"] });
    },
    onError: (error) => {
      console.warn("[ORDERS] CLIENT_ORDER_SUBMIT_FAILED", error.message);
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
