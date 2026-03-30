/**
 * Build merge variables for abandoned cart recovery templates.
 * Used both client-side (preview) and server-side (edge function).
 */

export interface CartForVariables {
  customer_name?: string | null;
  customer_email?: string | null;
  subtotal?: number | null;
  items?: Array<{ name?: string; quantity?: number; price?: number }> | null;
  abandoned_at?: string | null;
  recovery_token?: string | null;
}

export interface StoreForVariables {
  store_name?: string | null;
  store_slug?: string | null;
  workspace_id?: string;
}

export function buildRecoveryTemplateVariables(
  cart: CartForVariables,
  store: StoreForVariables,
  baseUrl?: string,
): Record<string, string> {
  const items = (cart.items || []) as Array<{ name?: string; quantity?: number; price?: number }>;

  const cartItemsSummary = items
    .map((i) => `${i.name || "Produto"} ×${i.quantity || 1}`)
    .join(", ");

  const recoveryLink =
    cart.recovery_token && store.store_slug
      ? `${baseUrl || ""}/store/${store.store_slug}/recover/${cart.recovery_token}`
      : "";

  return {
    contact_name: cart.customer_name || cart.customer_email || "Cliente",
    store_name: store.store_name || "Loja",
    cart_total: `€${(cart.subtotal || 0).toFixed(2)}`,
    cart_items_summary: cartItemsSummary || "artigos no carrinho",
    recovery_link: recoveryLink,
    abandoned_at: cart.abandoned_at
      ? new Date(cart.abandoned_at).toLocaleString("pt-PT")
      : "",
    workspace_name: store.store_name || "",
  };
}

/**
 * Replace {{variable}} placeholders in a string with values from the map.
 */
export function resolveTemplateVariables(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] ?? match);
}
