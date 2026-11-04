import { describe, expect, it } from "vitest";
import { planModuleCheckout } from "../../../supabase/functions/_shared/moduleBilling";
import { resolveWorkspaceIndicators } from "@/lib/bgi/indicatorCatalog";

const mod = { price_eur: 49, one_time_price_eur: 990, stripe_price_id: null, stripe_one_time_price_id: null };

describe("Crescimento: cobrança do módulo", () => {
  it("mensal cria subscrição", () => {
    const p = planModuleCheckout(mod, "monthly");
    expect(p).toMatchObject({ ok: true, mode: "subscription", billingType: "subscription", unitAmountCents: 4900 });
  });
  it("pagamento único cria pagamento sem recorrência", () => {
    const p = planModuleCheckout(mod, "one_time");
    expect(p).toMatchObject({ ok: true, mode: "payment", billingType: "one_time", unitAmountCents: 99000 });
  });
  it("sem preço configurado nunca cobra 0 €", () => {
    expect(planModuleCheckout({ ...mod, one_time_price_eur: null }, "one_time")).toEqual({ ok: false, code: "price_not_configured" });
  });
});

describe("Crescimento: combinação de modelos", () => {
  it("Comércio + Formação + Serviços sem indicadores duplicados", () => {
    const ids = resolveWorkspaceIndicators(["commerce", "education", "services"])!.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(["orders", "enrollments", "billable_hours", "revenue_invoiced"]));
  });
});
