import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerCart } from "@/contexts/PartnerCartContext";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { toast } from "sonner";
import type { PartnerAccount, PartnerUser } from "@/types/partner";

export function usePartnerCheckout(
  partnerUser: PartnerUser | null,
  account: PartnerAccount | null | undefined
) {
  const { items, subtotalNet, poNumber, orderNotes, clearCart } = usePartnerCart();
  const [submitting, setSubmitting] = useState(false);

  const submitOrder = async () => {
    if (!partnerUser || !account || items.length === 0) return null;
    setSubmitting(true);

    try {
      const workspaceId = partnerUser.workspace_id;
      const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}`;

      // Determine initial status
      const needsApproval = account.requires_order_approval &&
        account.approval_threshold != null &&
        subtotalNet > account.approval_threshold;

      const status = needsApproval ? 'awaiting_approval' : 'submitted';

      // Credit check
      if (account.credit_limit > 0) {
        const newExposure = account.current_credit_exposure + subtotalNet;
        if (newExposure > account.credit_limit) {
          toast.error("Limite de crédito ultrapassado. Contacte o gestor comercial.");
          setSubmitting(false);
          return null;
        }
      }

      const taxRate = 23; // default PT VAT
      const taxAmount = Math.round(subtotalNet * (taxRate / 100) * 100) / 100;

      const { data: order, error: orderError } = await supabase
        .from("partner_order_headers")
        .insert({
          workspace_id: workspaceId,
          partner_account_id: account.id,
          order_number: orderNumber,
          status,
          po_number: poNumber || null,
          buyer_user_id: partnerUser.auth_user_id,
          currency: account.currency || 'EUR',
          subtotal_net: subtotalNet,
          tax_amount: taxAmount,
          total_net: subtotalNet,
          total_gross: subtotalNet + taxAmount,
          payment_terms_snapshot: account.payment_terms,
          notes: orderNotes || null,
          source: 'partner_center',
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      // Insert items
      const orderItems = items.map((item) => ({
        workspace_id: workspaceId,
        partner_order_id: order.id,
        product_id: item.product_id,
        sku: item.sku,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price_net: item.unit_price_net,
        pvp_recommended: item.pvp_recommended,
        margin_estimated: item.margin_estimated,
        tax_rate: taxRate,
        line_total_net: item.unit_price_net * item.quantity,
        pack_size: item.pack_size,
        moq_applied: item.moq,
      }));

      const { error: itemsError } = await supabase
        .from("partner_order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Kernel event
      emitKernelEvent({
        workspace_id: workspaceId,
        type: 'PARTNER.ORDER_SUBMITTED',
        entity_kind: 'partner_order',
        entity_id: order.id,
        actor_id: partnerUser.auth_user_id,
        source_module: 'partner-center',
        payload: {
          order_number: orderNumber,
          status,
          total_net: subtotalNet,
          items_count: items.length,
        },
      });

      clearCart();
      toast.success(`Encomenda ${orderNumber} ${needsApproval ? 'submetida para aprovação' : 'submetida com sucesso'}`);
      return order.id;
    } catch (err) {
      console.error("[PARTNER-CHECKOUT] Error:", err);
      toast.error("Erro ao submeter encomenda");
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  return { submitOrder, submitting };
}
