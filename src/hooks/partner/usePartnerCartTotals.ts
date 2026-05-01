import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PartnerCartItem } from "@/types/partner";

export interface PartnerCartLineComputed {
  product_id: string;
  quantity: number;
  unit_price_net: number;
  line_total_original: number;
  line_total_net: number;
  discount_pct: number;
  discount_source: 'quantity_break' | 'bundle' | null;
  bundle_id: string | null;
}

export interface PartnerCartTotals {
  lines: PartnerCartLineComputed[];
  subtotal_original: number;
  subtotal_net: number;
  quantity_break_savings: number;
  bundle_savings: number;
  coupon_savings: number;
  total_savings: number;
  shipping_amount: number;
  tax_amount: number;
  total_gross: number;
  free_shipping_threshold: number | null;
  free_shipping_remaining: number;
  coupon: {
    valid: boolean;
    reason?: string;
    coupon_id?: string;
    code?: string;
    discount_type?: 'percentage' | 'fixed' | 'free_shipping';
    discount_value?: number;
    discount_amount?: number;
    description?: string | null;
    min_subtotal?: number;
  } | null;
}

const EMPTY_TOTALS: PartnerCartTotals = {
  lines: [],
  subtotal_original: 0,
  subtotal_net: 0,
  quantity_break_savings: 0,
  bundle_savings: 0,
  coupon_savings: 0,
  total_savings: 0,
  shipping_amount: 0,
  tax_amount: 0,
  total_gross: 0,
  free_shipping_threshold: null,
  free_shipping_remaining: 0,
  coupon: null,
};

export function usePartnerCartTotals(
  workspaceId: string | null | undefined,
  partnerAccountId: string | null | undefined,
  items: PartnerCartItem[],
  couponCode: string | null,
) {
  const [totals, setTotals] = useState<PartnerCartTotals>(EMPTY_TOTALS);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!workspaceId || !partnerAccountId || items.length === 0) {
      setTotals(EMPTY_TOTALS);
      return;
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const payload = items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price_net: i.unit_price_net,
        }));
        const { data, error } = await supabase.rpc('compute_partner_cart_totals', {
          p_workspace_id: workspaceId,
          p_partner_account_id: partnerAccountId,
          p_items: payload as any,
          p_coupon_code: couponCode || null,
        });
        if (error) {
          console.error('[partner-cart-totals]', error);
          setTotals(EMPTY_TOTALS);
        } else if (data) {
          setTotals(data as unknown as PartnerCartTotals);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [workspaceId, partnerAccountId, items, couponCode]);

  return { totals, loading };
}
