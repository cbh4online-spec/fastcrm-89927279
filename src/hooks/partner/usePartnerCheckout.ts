import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerCart } from "@/contexts/PartnerCartContext";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { toast } from "sonner";
import type { PartnerAccount, PartnerUser } from "@/types/partner";
import type { PartnerCartTotals } from "./usePartnerCartTotals";

export function usePartnerCheckout(
  partnerUser: PartnerUser | null,
  account: PartnerAccount | null | undefined
) {
  const { items, subtotalNet, poNumber, orderNotes, couponCode, cartId, clearCart, emitFunnelEvent } = usePartnerCart();
  const [submitting, setSubmitting] = useState(false);

  const submitOrder = async (totals?: PartnerCartTotals) => {
    if (!partnerUser || !account || items.length === 0) return null;
    setSubmitting(true);

    try {
      const workspaceId = partnerUser.workspace_id;
      const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}`;

      // Resolve totals (use server-computed totals if provided)
      const subtotal = totals?.subtotal_net ?? subtotalNet;
      const subtotalOriginal = totals?.subtotal_original ?? subtotalNet;
      const discountAmount = totals?.total_savings ?? 0;
      const shippingAmount = totals?.shipping_amount ?? 0;
      const taxAmount = totals?.tax_amount ?? Math.round(subtotal * 0.23 * 100) / 100;
      const totalGross = totals?.total_gross ?? (subtotal + shippingAmount + taxAmount);
      const qbSavings = totals?.quantity_break_savings ?? 0;
      const bundleSavings = totals?.bundle_savings ?? 0;
      const couponSavings = totals?.coupon_savings ?? 0;
      const validCoupon = totals?.coupon?.valid ? totals.coupon.code : null;

      const needsApproval = account.requires_order_approval &&
        account.approval_threshold != null &&
        totalGross > account.approval_threshold;
      const status = needsApproval ? 'awaiting_approval' : 'submitted';

      // Credit check
      if (account.credit_limit > 0) {
        const newExposure = account.current_credit_exposure + subtotal;
        if (newExposure > account.credit_limit) {
          toast.error("Limite de crédito ultrapassado. Contacte o gestor comercial.");
          setSubmitting(false);
          return null;
        }
      }

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
          subtotal_net: subtotal,
          discount_amount: discountAmount,
          shipping_amount: shippingAmount,
          tax_amount: taxAmount,
          total_net: subtotal,
          total_gross: totalGross,
          payment_terms_snapshot: account.payment_terms,
          notes: orderNotes || null,
          source: 'partner_center',
          coupon_code: validCoupon,
          quantity_break_savings: qbSavings,
          bundle_savings: bundleSavings,
          recovered_from_cart_id: cartId,
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      // Map line discounts from server totals
      const lineMap = new Map((totals?.lines || []).map((l) => [l.product_id, l]));

      const orderItems = items.map((item) => {
        const line = lineMap.get(item.product_id);
        const lineTotalNet = line?.line_total_net ?? Math.round(item.unit_price_net * item.quantity * 100) / 100;
        return {
          workspace_id: workspaceId,
          partner_order_id: order.id,
          product_id: item.product_id,
          variant_id: item.variant_id ?? null,
          sku: item.sku,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price_net: item.unit_price_net,
          unit_price_original: item.unit_price_net,
          pvp_recommended: item.pvp_recommended,
          margin_estimated: item.margin_estimated,
          tax_rate: 23,
          line_total_net: lineTotalNet,
          pack_size: item.pack_size,
          moq_applied: item.moq,
          parent_product_id: item.parent_product_id ?? (item.variant_id ? item.product_id : null),
          variant_label: item.variant_label ?? null,
          variant_attributes: item.variant_attributes ?? {},
          quantity_break_pct: line?.discount_source === 'quantity_break' ? line.discount_pct : 0,
          bundle_id: line?.discount_source === 'bundle' ? line.bundle_id : null,
        };
      });

      const { error: itemsError } = await supabase.from("partner_order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      // Decrement variant stock (atomic, server-side). Erros logados mas não bloqueiam a encomenda
      // já submetida — qualquer "insufficient_stock" é capturado e devolvido como aviso.
      const stockWarnings: string[] = [];
      for (const item of items) {
        if (!item.variant_id) continue;
        const { data: stockResult, error: stockError } = await supabase.rpc(
          'decrement_partner_variant_stock',
          {
            p_workspace_id: workspaceId,
            p_variant_id: item.variant_id,
            p_quantity: item.quantity,
            p_allow_backorder: !!item.allow_backorder || !!account.allow_backorders,
          },
        );
        if (stockError) {
          console.warn('[partner-checkout] stock rpc error', item.variant_id, stockError.message);
          continue;
        }
        const result = stockResult as { ok?: boolean; error?: string; available?: number } | null;
        if (result && result.ok === false) {
          stockWarnings.push(`${item.product_name}${item.variant_label ? ` (${item.variant_label})` : ''}: ${result.error === 'insufficient_stock' ? `apenas ${result.available} em stock` : result.error}`);
        }
      }
      if (stockWarnings.length > 0) {
        toast.warning(`Encomenda registada com avisos de stock: ${stockWarnings.join('; ')}`);
      }

      // Atomic coupon redemption
      if (validCoupon && couponSavings > 0) {
        await supabase.rpc('redeem_partner_coupon', {
          p_workspace_id: workspaceId,
          p_partner_account_id: account.id,
          p_order_id: order.id,
          p_code: validCoupon,
          p_discount_amount: couponSavings,
        });
      }

      // Mark cart as recovered (cleared)
      if (cartId) {
        await supabase.from('partner_carts').update({
          items: [] as any,
          applied_coupon_code: null,
          po_number: null,
          notes: null,
          subtotal_net: 0,
          recovery_stage: 'recovered',
          recovered_at: new Date().toISOString(),
        }).eq('id', cartId);
      }

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
          subtotal_original: subtotalOriginal,
          total_gross: totalGross,
          total_savings: discountAmount,
          coupon_code: validCoupon,
          items_count: items.length,
        },
      });

      emitFunnelEvent('complete_order', {
        order_id: order.id,
        total_gross: totalGross,
        total_savings: discountAmount,
        coupon_code: validCoupon,
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
