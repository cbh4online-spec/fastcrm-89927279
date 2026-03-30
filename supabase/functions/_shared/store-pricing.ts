/**
 * Store Pricing Engine — Server-side truth for all store order calculations.
 *
 * Never trust client-supplied prices. Every monetary value is resolved from the DB.
 *
 * Logging prefix: [STORE-PRICING]
 */

// deno-lint-ignore-file no-explicit-any

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CartItem {
  productId: string;
  quantity: number;
  name?: string;   // ignored for pricing — only used as fallback label
  price?: number;  // ignored for pricing
}

export interface ResolvedProduct {
  id: string;
  name: string;
  base_price: number;
  currency: string;
  sku: string | null;
  short_description: string | null;
  images: string[] | null;
  primary_image_index: number | null;
  stock_quantity: number | null;
  track_stock: boolean;
  stock_status: string | null;
  billing_type: string | null;
  billing_frequency: string | null;
  category_id: string | null;
}

export interface ValidatedCoupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  max_discount_amount: number | null;
  single_use_per_customer: boolean;
  category_ids: string[] | null;
}

export interface NormalizedItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  sku: string | null;
  category_id: string | null;
}

export interface PricingBreakdown {
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  gift_card_reserved: number;
  total_payable: number;
  currency: string;
  items_normalized: NormalizedItem[];
  coupon_id: string | null;
  coupon_code: string | null;
}

const log = (msg: string, data?: unknown) =>
  console.log(`[STORE-PRICING] ${msg}${data ? ` - ${JSON.stringify(data)}` : ""}`);

/* ------------------------------------------------------------------ */
/*  resolveStoreProducts                                               */
/* ------------------------------------------------------------------ */

export async function resolveStoreProducts(
  supabase: any,
  workspaceId: string,
  items: CartItem[],
): Promise<{ products: ResolvedProduct[]; normalized: NormalizedItem[] }> {
  const productIds = items.map((i) => i.productId);

  const { data: products, error } = await supabase
    .from("products")
    .select(
      "id, name, base_price, currency, sku, short_description, images, primary_image_index, stock_quantity, track_stock, stock_status, billing_type, billing_frequency, category_id",
    )
    .eq("workspace_id", workspaceId)
    .eq("store_published", true)
    .eq("status", "active")
    .in("id", productIds);

  if (error) throw new Error(`Erro ao carregar produtos: ${error.message}`);
  if (!products || products.length === 0) throw new Error("Nenhum produto válido encontrado");

  // Validate every requested item exists and has stock
  for (const item of items) {
    const p = products.find((pr: ResolvedProduct) => pr.id === item.productId);
    if (!p) throw new Error(`Produto ${item.productId} não encontrado ou indisponível`);
    if (p.track_stock && p.stock_status === "out_of_stock")
      throw new Error(`"${p.name}" está esgotado`);
    if (p.track_stock && p.stock_quantity !== null && item.quantity > p.stock_quantity)
      throw new Error(`Stock insuficiente para "${p.name}". Disponível: ${p.stock_quantity}`);
  }

  const normalized: NormalizedItem[] = items.map((item) => {
    const p = products.find((pr: ResolvedProduct) => pr.id === item.productId)!;
    return {
      product_id: p.id,
      name: p.name,
      quantity: item.quantity,
      unit_price: p.base_price,
      sku: p.sku,
      category_id: p.category_id ?? null,
    };
  });

  log("Products resolved", { count: products.length });
  return { products, normalized };
}

/* ------------------------------------------------------------------ */
/*  validateCoupon                                                     */
/* ------------------------------------------------------------------ */

export async function validateCoupon(
  supabase: any,
  workspaceId: string,
  couponCode: string,
  customerEmail: string,
  subtotal: number,
  itemCategoryIds: string[],
): Promise<ValidatedCoupon | null> {
  const code = couponCode.toUpperCase().trim();
  if (!code) return null;

  const { data: coupon, error } = await supabase
    .from("store_coupons")
    .select("id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, max_discount_amount, single_use_per_customer, category_ids, valid_until, is_active")
    .eq("workspace_id", workspaceId)
    .eq("code", code)
    .maybeSingle();

  if (error || !coupon) throw new Error("Cupão não encontrado");
  if (!coupon.is_active) throw new Error("Cupão desativado");

  // Expiry
  if (coupon.valid_until && new Date(coupon.valid_until) < new Date())
    throw new Error("Cupão expirado");

  // Max uses
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses)
    throw new Error("Cupão esgotado (limite de utilizações atingido)");

  // Single use per customer
  if (coupon.single_use_per_customer && customerEmail) {
    const { data: usageRows } = await supabase
      .from("store_coupon_usage")
      .select("id")
      .eq("coupon_id", coupon.id)
      .eq("customer_email", customerEmail)
      .limit(1);

    if (usageRows && usageRows.length > 0)
      throw new Error("Este cupão já foi utilizado com este email");
  }

  // Min order amount
  if (subtotal < coupon.min_order_amount)
    throw new Error(
      `Valor mínimo da encomenda para este cupão: €${coupon.min_order_amount.toFixed(2)}`,
    );

  // Category restrictions
  if (coupon.category_ids && coupon.category_ids.length > 0) {
    const eligibleCategories = coupon.category_ids as string[];
    const hasEligible = itemCategoryIds.some((cid) => eligibleCategories.includes(cid));
    if (!hasEligible)
      throw new Error("Cupão não aplicável aos produtos no carrinho (categoria incompatível)");
  }

  log("Coupon validated", { couponId: coupon.id, code });
  return coupon as ValidatedCoupon;
}

/* ------------------------------------------------------------------ */
/*  calculateDiscount                                                  */
/* ------------------------------------------------------------------ */

export function calculateDiscount(
  coupon: ValidatedCoupon,
  subtotal: number,
  eligibleSubtotal?: number,
): number {
  const base = eligibleSubtotal ?? subtotal;
  let discount = 0;

  if (coupon.discount_type === "percentage") {
    discount = (base * coupon.discount_value) / 100;
  } else {
    // fixed
    discount = coupon.discount_value;
  }

  // Cap by max_discount_amount
  if (coupon.max_discount_amount !== null && discount > coupon.max_discount_amount) {
    discount = coupon.max_discount_amount;
  }

  // Never exceed subtotal
  if (discount > subtotal) discount = subtotal;

  // Round to 2 decimals
  discount = Math.round(discount * 100) / 100;

  log("Discount calculated", { type: coupon.discount_type, value: coupon.discount_value, discount });
  return discount;
}

/* ------------------------------------------------------------------ */
/*  calculateOrderTotals                                               */
/* ------------------------------------------------------------------ */

export function calculateOrderTotals(
  normalized: NormalizedItem[],
  coupon: ValidatedCoupon | null,
  shippingCost: number,
  giftCardReserved: number,
  currency: string,
): PricingBreakdown {
  const subtotal = normalized.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const roundedSubtotal = Math.round(subtotal * 100) / 100;

  // Discount
  let discountAmount = 0;
  if (coupon) {
    // If coupon has category restrictions, calculate eligible subtotal
    let eligibleSubtotal = roundedSubtotal;
    if (coupon.category_ids && coupon.category_ids.length > 0) {
      eligibleSubtotal = normalized
        .filter((i) => i.category_id && coupon.category_ids!.includes(i.category_id))
        .reduce((s, i) => s + i.unit_price * i.quantity, 0);
      eligibleSubtotal = Math.round(eligibleSubtotal * 100) / 100;
    }
    discountAmount = calculateDiscount(coupon, roundedSubtotal, eligibleSubtotal);
  }

  const afterDiscount = Math.round((roundedSubtotal - discountAmount) * 100) / 100;
  const withShipping = Math.round((afterDiscount + shippingCost) * 100) / 100;
  const totalPayable = Math.max(0, Math.round((withShipping - giftCardReserved) * 100) / 100);

  const breakdown: PricingBreakdown = {
    subtotal: roundedSubtotal,
    discount_amount: discountAmount,
    shipping_amount: shippingCost,
    gift_card_reserved: giftCardReserved,
    total_payable: totalPayable,
    currency: currency.toUpperCase(),
    items_normalized: normalized,
    coupon_id: coupon?.id ?? null,
    coupon_code: coupon?.code ?? null,
  };

  log("Order totals calculated", {
    subtotal: roundedSubtotal,
    discount: discountAmount,
    shipping: shippingCost,
    gcReserved: giftCardReserved,
    totalPayable,
  });

  return breakdown;
}

/* ------------------------------------------------------------------ */
/*  normalizeCurrency                                                  */
/* ------------------------------------------------------------------ */

export function normalizeCurrency(products: ResolvedProduct[]): string {
  return (products[0]?.currency || "EUR").toUpperCase();
}
