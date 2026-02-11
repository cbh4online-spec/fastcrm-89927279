import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { AddressData, OrderNoteStatus } from "@/types/order-note";

interface OrderLineItem {
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  product_image_url: string | null;
  quantity: number;
  unit_price_net: number;
  vat_rate: number;
  position: number;
  notes: string | null;
}

interface CreateOrderNoteInput {
  workspace_id: string;
  client_user_id: string;
  status: OrderNoteStatus;
  items: OrderLineItem[];
  billing_address?: AddressData;
  shipping_address?: AddressData;
  client_notes?: string;
  admin_notes?: string;
  installment_requested?: boolean;
  installment_count?: number;
  installment_notes?: string;
}

function generateOrderNumber(): string {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `NE-${now}-${rand}`;
}

export function useCreateOrderNote() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOrderNoteInput) => {
      const orderNumber = generateOrderNumber();

      // Calculate totals
      let totalNet = 0;
      let totalVat = 0;
      const processedItems = input.items.map((item, idx) => {
        const lineNet = item.quantity * item.unit_price_net;
        const lineVat = lineNet * (item.vat_rate / 100);
        totalNet += lineNet;
        totalVat += lineVat;
        return {
          ...item,
          position: idx,
          line_total_net: lineNet,
          vat_amount: lineVat,
          line_total_gross: lineNet + lineVat,
        };
      });

      const totalGross = totalNet + totalVat;

      // Insert order note
      const { data: orderNote, error: orderError } = await supabase
        .from("order_notes")
        .insert({
          workspace_id: input.workspace_id,
          client_user_id: input.client_user_id,
          order_number: orderNumber,
          status: input.status,
          total_net: totalNet,
          total_vat: totalVat,
          total_gross: totalGross,
          currency: "EUR",
          billing_address: input.billing_address ? JSON.parse(JSON.stringify(input.billing_address)) : {},
          shipping_address: input.shipping_address ? JSON.parse(JSON.stringify(input.shipping_address)) : {},
          client_notes: input.client_notes || null,
          admin_notes: input.admin_notes || null,
          installment_requested: input.installment_requested || false,
          installment_count: input.installment_count || 1,
          installment_notes: input.installment_notes || null,
          submitted_at: input.status === "submitted" ? new Date().toISOString() : null,
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      // Insert items
      const itemsToInsert = processedItems.map((item) => ({
        order_note_id: orderNote.id,
        workspace_id: input.workspace_id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        product_image_url: item.product_image_url,
        quantity: item.quantity,
        unit_price_net: item.unit_price_net,
        vat_rate: item.vat_rate,
        vat_amount: item.vat_amount,
        line_total_net: item.line_total_net,
        line_total_gross: item.line_total_gross,
        position: item.position,
        notes: item.notes,
      }));

      const { error: itemsError } = await supabase
        .from("order_note_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      return orderNote.id;
    },
    onSuccess: (orderId) => {
      queryClient.invalidateQueries({ queryKey: ["order-notes"] });
      toast.success("Nota de encomenda criada com sucesso");
      navigate(`/dashboard/order-notes/${orderId}`);
    },
    onError: (error) => {
      toast.error("Erro ao criar nota de encomenda: " + error.message);
    },
  });
}
