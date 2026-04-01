import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toMoney, moneySub, moneyAdd, moneyMul, moneyMin, moneyMax, moneyToNumber } from "@/lib/money";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import type { CartItem } from "@/contexts/StoreCartContext";

export interface CTTShippingOption {
  id: string;
  name: string;
  price: number;
  estimate: string;
  maxWeight: number;
}

interface UseCheckoutPricingOptions {
  items: CartItem[];
  subtotal: number;
  wsId: string;
  wsSlug: string;
  customerEmail: string;
}

export function useCheckoutPricing({ items, subtotal, wsId, wsSlug, customerEmail }: UseCheckoutPricingOptions) {
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_type: string;
    discount_value: number;
    max_discount_amount?: number | null;
    category_ids?: string[] | null;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [selectedShippingId, setSelectedShippingId] = useState("");
  const [cttOptions, setCttOptions] = useState<CTTShippingOption[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [totalWeight, setTotalWeight] = useState(0);
  const [overWeight, setOverWeight] = useState(false);

  const [appliedGiftCard, setAppliedGiftCard] = useState<{
    id: string;
    code: string;
    current_balance: number;
  } | null>(null);

  // Fetch product weights
  useEffect(() => {
    if (items.length === 0) return;
    const fetchWeights = async () => {
      const productIds = items.map((i) => i.productId);
      const { data } = await supabase
        .from("products")
        .select("id, weight")
        .in("id", productIds);

      const weightMap = new Map<string, number>();
      (data || []).forEach((p: any) => {
        weightMap.set(p.id, p.weight ? Number(p.weight) : 0.5);
      });

      const total = items.reduce((sum, item) => {
        const w = weightMap.get(item.productId) || 0.5;
        return sum + w * item.quantity;
      }, 0);
      setTotalWeight(Math.round(total * 1000) / 1000);
    };
    fetchWeights();
  }, [items]);

  // Fetch CTT shipping options
  useEffect(() => {
    if (totalWeight <= 0) return;
    const fetchShipping = async () => {
      setShippingLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("calculate-shipping", {
          body: { totalWeightKg: totalWeight },
        });
        if (!error && data?.success) {
          setCttOptions(data.options || []);
          setOverWeight(data.overWeight || false);
          if (data.options?.length > 0 && !selectedShippingId) {
            setSelectedShippingId(data.options[0].id);
          }
        }
      } catch {
        // fallback: no shipping options
      } finally {
        setShippingLoading(false);
      }
    };
    fetchShipping();
  }, [totalWeight]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_coupons")
        .select("id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, valid_until, is_active, single_use_per_customer, category_ids, max_discount_amount")
        .eq("code", couponCode.toUpperCase().trim())
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (error || !data) { toast.error("Cupão inválido"); return; }
      if (data.max_uses && (data.used_count ?? 0) >= data.max_uses) { toast.error("Cupão esgotado"); return; }
      if (data.valid_until && new Date(data.valid_until) < new Date()) { toast.error("Cupão expirado"); return; }
      if (data.min_order_amount && subtotal < data.min_order_amount) {
        toast.error(`Encomenda mínima de €${Number(data.min_order_amount).toFixed(2)}`);
        return;
      }

      if (data.single_use_per_customer && customerEmail) {
        const { data: usageData } = await supabase
          .from("store_coupon_usage")
          .select("id")
          .eq("coupon_id", data.id)
          .eq("customer_email", customerEmail.toLowerCase().trim())
          .limit(1)
          .maybeSingle();
        if (usageData) { toast.error("Já utilizou este cupão anteriormente"); return; }
      }

      if (data.category_ids && data.category_ids.length > 0) {
        const cartCategories = items.map((item) => (item as any).category).filter(Boolean);
        const hasMatch = cartCategories.some((cat: string) => data.category_ids!.includes(cat));
        if (!hasMatch && cartCategories.length > 0) {
          toast.error("Cupão válido apenas para categorias específicas");
          return;
        }
      }

      setAppliedCoupon({
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        max_discount_amount: data.max_discount_amount,
        category_ids: data.category_ids,
      });
      setCouponCode("");
      toast.success("Cupão aplicado!");
      trackEvent("apply_coupon", { workspaceSlug: wsSlug, code: data.code, discount_type: data.discount_type, discount_value: data.discount_value });
    } finally {
      setCouponLoading(false);
    }
  };

  const discountAmount = appliedCoupon
    ? (() => {
        const sub = toMoney(subtotal);
        let discount =
          appliedCoupon.discount_type === "percentage"
            ? moneyMul(sub, appliedCoupon.discount_value / 100)
            : moneyMin(appliedCoupon.discount_value, sub);
        if (appliedCoupon.discount_type === "percentage" && appliedCoupon.max_discount_amount) {
          discount = moneyMin(discount, appliedCoupon.max_discount_amount);
        }
        return moneyToNumber(discount);
      })()
    : 0;

  const selectedCttOption = cttOptions.find((o) => o.id === selectedShippingId);
  const effectiveShippingCost = selectedCttOption?.price ?? 0;

  const giftCardAmount = appliedGiftCard
    ? moneyToNumber(
        moneyMin(
          appliedGiftCard.current_balance,
          moneyAdd(moneySub(subtotal, discountAmount), effectiveShippingCost)
        )
      )
    : 0;

  const finalTotal = moneyToNumber(
    moneyMax(0, moneySub(moneyAdd(moneySub(subtotal, discountAmount), effectiveShippingCost), giftCardAmount))
  );

  return {
    // Coupon
    couponCode,
    setCouponCode,
    appliedCoupon,
    setAppliedCoupon,
    couponLoading,
    handleApplyCoupon,
    discountAmount,
    // Shipping
    selectedShippingId,
    setSelectedShippingId,
    cttOptions,
    shippingLoading,
    totalWeight,
    overWeight,
    selectedCttOption,
    effectiveShippingCost,
    // Gift Card
    appliedGiftCard,
    setAppliedGiftCard,
    giftCardAmount,
    // Totals
    finalTotal,
  };
}
