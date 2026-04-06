/**
 * Unified E-commerce Tracking — GA4 (dataLayer) + Meta Pixel (fbq)
 *
 * Standard events aligned with Google and Facebook algorithms:
 * - view_item / ViewContent
 * - add_to_cart / AddToCart
 * - begin_checkout / InitiateCheckout
 * - purchase / Purchase
 *
 * Each event also fires a server-side CAPI call when possible.
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    fbq: (...args: unknown[]) => void;
  }
}

/* ────────── helpers ────────── */

function pushGA4(eventName: string, params: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null }); // clear previous ecommerce
  window.dataLayer.push({ event: eventName, ecommerce: params });
}

function fireFBQ(eventName: string, params: Record<string, unknown>, eventId?: string) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  const opts = eventId ? { eventID: eventId } : undefined;
  window.fbq("track", eventName, params, opts);
}

function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Fire CAPI server-side event (non-blocking).
 * Requires store_settings to have facebook_capi_token configured.
 */
function fireCAPI(
  eventName: string,
  eventId: string,
  params: Record<string, unknown>,
  userData?: { email?: string; phone?: string },
) {
  if (typeof window === "undefined") return;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) return;

  const url = `https://${projectId}.supabase.co/functions/v1/store-capi-event`;
  const body = JSON.stringify({
    event_name: eventName,
    event_id: eventId,
    event_source_url: window.location.href,
    custom_data: params,
    user_data: userData || {},
  });

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {/* non-blocking */});
}

/* ────────── Item type ────────── */

export interface EcommerceItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  currency?: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  sku?: string;
  image?: string;
}

/* ────────── Events ────────── */

/** Product page view */
export function trackViewItem(item: EcommerceItem) {
  const eventId = generateEventId();
  const currency = item.currency || "EUR";

  pushGA4("view_item", {
    currency,
    value: item.price,
    items: [{ ...item, currency }],
  });

  fireFBQ("ViewContent", {
    content_ids: [item.item_id],
    content_name: item.item_name,
    content_type: "product",
    value: item.price,
    currency,
  }, eventId);

  fireCAPI("ViewContent", eventId, {
    content_ids: [item.item_id],
    content_name: item.item_name,
    value: item.price,
    currency,
  });
}

/** Add to cart */
export function trackAddToCart(item: EcommerceItem) {
  const eventId = generateEventId();
  const currency = item.currency || "EUR";
  const value = item.price * item.quantity;

  pushGA4("add_to_cart", {
    currency,
    value,
    items: [{ ...item, currency }],
  });

  fireFBQ("AddToCart", {
    content_ids: [item.item_id],
    content_name: item.item_name,
    content_type: "product",
    value,
    currency,
    num_items: item.quantity,
  }, eventId);

  fireCAPI("AddToCart", eventId, {
    content_ids: [item.item_id],
    value,
    currency,
    num_items: item.quantity,
  });
}

/** Begin checkout */
export function trackBeginCheckout(items: EcommerceItem[], value: number, currency = "EUR") {
  const eventId = generateEventId();

  pushGA4("begin_checkout", {
    currency,
    value,
    items: items.map((i) => ({ ...i, currency })),
  });

  fireFBQ("InitiateCheckout", {
    content_ids: items.map((i) => i.item_id),
    content_type: "product",
    value,
    currency,
    num_items: items.reduce((s, i) => s + i.quantity, 0),
  }, eventId);

  fireCAPI("InitiateCheckout", eventId, {
    content_ids: items.map((i) => i.item_id),
    value,
    currency,
    num_items: items.reduce((s, i) => s + i.quantity, 0),
  });
}

/** Purchase completed */
export function trackPurchase(
  transactionId: string,
  items: EcommerceItem[],
  value: number,
  currency = "EUR",
  userData?: { email?: string; phone?: string },
) {
  const eventId = generateEventId();

  pushGA4("purchase", {
    transaction_id: transactionId,
    currency,
    value,
    items: items.map((i) => ({ ...i, currency })),
  });

  fireFBQ("Purchase", {
    content_ids: items.map((i) => i.item_id),
    content_type: "product",
    value,
    currency,
    num_items: items.reduce((s, i) => s + i.quantity, 0),
  }, eventId);

  fireCAPI("Purchase", eventId, {
    content_ids: items.map((i) => i.item_id),
    value,
    currency,
    num_items: items.reduce((s, i) => s + i.quantity, 0),
    transaction_id: transactionId,
  }, userData);
}
