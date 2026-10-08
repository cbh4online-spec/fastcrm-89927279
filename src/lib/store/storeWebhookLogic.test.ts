import { describe, it, expect } from "vitest";
import { decideAction, validateSessionAgainstOrder, canTransition } from "../../../supabase/functions/_shared/storeWebhookLogic";

const WS = "1d208cbe-3285-45d0-8d9e-7d2bd6e9b2d6";
const order = { id: "o1", workspace_id: WS, status: "pending", total: 35.42, currency: "EUR", stripe_session_id: "cs_1" };
const session = { id: "cs_1", mode: "payment", payment_status: "paid", amount_total: 3542, currency: "eur", metadata: { workspace_id: WS, store_order_id: "o1" } };

describe("store webhook logic", () => {
  it("completed pago → paid; não pago (Multibanco) → pending", () => {
    expect(decideAction("checkout.session.completed", session)).toBe("mark_paid");
    expect(decideAction("checkout.session.completed", { ...session, payment_status: "unpaid" })).toBe("keep_pending");
  });
  it("delayed: async succeeded/failed", () => {
    expect(decideAction("checkout.session.async_payment_succeeded", session)).toBe("mark_paid");
    expect(decideAction("checkout.session.async_payment_failed", { ...session, payment_status: "unpaid" })).toBe("mark_failed");
  });
  it("ignora subscrições e outros eventos", () => {
    expect(decideAction("checkout.session.completed", { ...session, mode: "subscription" })).toBe("ignore");
    expect(decideAction("invoice.paid", session)).toBe("ignore");
  });
  it("valida montante, moeda, sessão e workspace", () => {
    expect(validateSessionAgainstOrder(session, order, WS).ok).toBe(true);
    expect(validateSessionAgainstOrder({ ...session, amount_total: 100 }, order, WS)).toEqual({ ok: false, reason: "amount_mismatch" });
    expect(validateSessionAgainstOrder({ ...session, currency: "usd" }, order, WS)).toEqual({ ok: false, reason: "currency_mismatch" });
    expect(validateSessionAgainstOrder({ ...session, id: "cs_x" }, order, WS)).toEqual({ ok: false, reason: "session_mismatch" });
    expect(validateSessionAgainstOrder(session, { ...order, workspace_id: "other" }, WS)).toEqual({ ok: false, reason: "workspace_mismatch" });
    expect(validateSessionAgainstOrder({ ...session, metadata: { workspace_id: "other" } }, order, WS)).toEqual({ ok: false, reason: "metadata_workspace_mismatch" });
  });
  it("duplicados/falha nunca sobrescrevem paga", () => {
    expect(canTransition("pending", "mark_paid")).toBe(true);
    expect(canTransition("paid", "mark_paid")).toBe(false);
    expect(canTransition("paid", "mark_failed")).toBe(false);
    expect(canTransition("failed", "mark_paid")).toBe(false);
  });
});
