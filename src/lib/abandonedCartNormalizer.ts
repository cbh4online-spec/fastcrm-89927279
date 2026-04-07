/**
 * Shared normalizer for abandoned cart statuses, field mappings, and labels.
 * Used across useAbandonedCarts, AbandonedCartsPanel, StoreCartsTab, and StoreAbandonedCartsTab.
 */

// ─── Status Labels ───────────────────────────────────────────
export const RECOVERY_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  abandoned: { label: "Abandonado", variant: "destructive" },
  contacted: { label: "Contactado", variant: "secondary" },
  touch_1_sent: { label: "Toque 1", variant: "secondary" },
  touch_2_sent: { label: "Toque 2", variant: "secondary" },
  touch_3_sent: { label: "Toque 3", variant: "secondary" },
  recovered: { label: "Recuperado", variant: "default" },
  expired: { label: "Expirado", variant: "destructive" },
  exited: { label: "Expirado", variant: "destructive" },
};

export const OUTREACH_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Sem outreach", variant: "outline" },
  enrolled: { label: "Inscrito", variant: "secondary" },
  in_progress: { label: "Em progresso", variant: "default" },
  contacted: { label: "Contactado", variant: "secondary" },
  recovered: { label: "Recuperado", variant: "default" },
  exited: { label: "Saiu", variant: "destructive" },
  failed: { label: "Falhado", variant: "destructive" },
};

// ─── Status Groupings ────────────────────────────────────────
/** Statuses considered "active/pending" for KPI counts */
export const PENDING_STATUSES = ["pending", "abandoned", "in_progress", "touch_1_sent", "touch_2_sent", "touch_3_sent", "enrolled"];

/** Statuses considered "closed/done" */
export const CLOSED_STATUSES = ["recovered", "expired", "exited"];

export function isPendingStatus(status: string): boolean {
  return PENDING_STATUSES.includes(status);
}

export function isRecoveredStatus(status: string): boolean {
  return status === "recovered";
}

export function isExpiredStatus(status: string): boolean {
  return ["expired", "exited"].includes(status);
}

// ─── Status Resolver ─────────────────────────────────────────
/** Given raw fields from different table schemas, resolve to a canonical status */
export function resolveRecoveryStatus(row: {
  recovery_status?: string;
  outreach_status?: string;
}): string {
  return row.outreach_status || row.recovery_status || "pending";
}

export function getRecoveryStatusLabel(status: string) {
  return RECOVERY_STATUS_LABELS[status] || { label: status, variant: "outline" as const };
}

export function getOutreachStatusLabel(status: string) {
  return OUTREACH_STATUS_LABELS[status] || OUTREACH_STATUS_LABELS.pending;
}

// ─── Normalised Cart Shape ───────────────────────────────────
export interface NormalisedAbandonedCart {
  id: string;
  workspace_id: string;
  session_id: string | null;
  contact_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  cart_items: any[];
  cart_value: number;
  currency: string;
  detected_at: string;
  recovery_status: string;
  outreach_status: string;
  recovered_at: string | null;
  recovery_channel: string | null;
  recovery_url: string | null;
  touch_1_at: string | null;
  touch_2_at: string | null;
  touch_3_at: string | null;
  expires_at: string;
  created_at: string;
}

/** Normalise a row from `store_abandoned_carts` to the canonical shape */
export function normaliseStoreCart(c: any): NormalisedAbandonedCart {
  return {
    id: c.id,
    workspace_id: c.workspace_id,
    session_id: c.session_id ?? null,
    contact_id: c.contact_id ?? null,
    customer_email: c.customer_email ?? null,
    customer_name: c.customer_name ?? null,
    customer_phone: c.customer_phone ?? null,
    cart_items: c.items || [],
    cart_value: Number(c.subtotal || 0),
    currency: c.currency || "EUR",
    detected_at: c.abandoned_at || c.created_at,
    recovery_status: c.recovery_status || "abandoned",
    outreach_status: c.outreach_status || "pending",
    recovered_at: c.recovered_at ?? null,
    recovery_channel: c.contact_channel ?? null,
    recovery_url: null,
    touch_1_at: c.contacted_at ?? null,
    touch_2_at: null,
    touch_3_at: null,
    expires_at: c.expires_at || c.created_at,
    created_at: c.created_at,
  };
}

/** Normalise a row from `abandoned_carts` (legacy) to the canonical shape */
export function normaliseLegacyCart(c: any): NormalisedAbandonedCart {
  return {
    id: c.id,
    workspace_id: c.workspace_id,
    session_id: c.session_id ?? null,
    contact_id: c.contact_id ?? null,
    customer_email: c.customer_email ?? null,
    customer_name: c.customer_name ?? null,
    customer_phone: c.customer_phone ?? null,
    cart_items: Array.isArray(c.cart_items) ? c.cart_items : [],
    cart_value: Number(c.cart_value || 0),
    currency: c.currency || "EUR",
    detected_at: c.detected_at,
    recovery_status: c.recovery_status || "pending",
    outreach_status: "pending",
    recovered_at: c.recovered_at ?? null,
    recovery_channel: c.recovery_channel ?? null,
    recovery_url: c.recovery_url ?? null,
    touch_1_at: c.touch_1_at ?? null,
    touch_2_at: c.touch_2_at ?? null,
    touch_3_at: c.touch_3_at ?? null,
    expires_at: c.expires_at,
    created_at: c.created_at,
  };
}
