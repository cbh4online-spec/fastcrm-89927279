import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { activeModulePlan, meetsModuleMinimumPlan } from "../../../supabase/functions/_shared/module-plan";

const now = Date.parse("2026-10-09T12:00:00Z");

describe("marketplace module plan eligibility", () => {
  it("blocks Starter and free from Growth modules", () => {
    expect(meetsModuleMinimumPlan("starter", "growth")).toBe(false);
    expect(meetsModuleMinimumPlan("free", "growth")).toBe(false);
  });

  it("accepts current and legacy paid plans at the matching tier", () => {
    for (const plan of ["basic", "growth", "pro", "agency", "scale"]) {
      expect(meetsModuleMinimumPlan(plan, "growth")).toBe(true);
    }
    for (const plan of ["pro", "agency", "scale"]) {
      expect(meetsModuleMinimumPlan(plan, "pro")).toBe(true);
    }
    expect(meetsModuleMinimumPlan("basic", "pro")).toBe(false);
    expect(meetsModuleMinimumPlan("growth", "pro")).toBe(false);
  });

  it("fails closed for an unknown catalogue tier", () => {
    expect(meetsModuleMinimumPlan("scale", "enterprise")).toBe(false);
  });

  it("requires an active subscription in its paid period", () => {
    expect(activeModulePlan({ plan: "growth", status: "active", current_period_end: "2026-10-10T00:00:00Z" }, now)).toBe("growth");
    expect(activeModulePlan({ plan: "agency", status: "trialing", current_period_end: null }, now)).toBe("agency");
    expect(activeModulePlan({ plan: "growth", status: "past_due", current_period_end: null }, now)).toBe("free");
    expect(activeModulePlan({ plan: "growth", status: "active", current_period_end: "2026-10-08T00:00:00Z" }, now)).toBe("free");
    expect(activeModulePlan(null, now)).toBe("free");
  });

  it("keeps an existing prospecting add-on price and Stripe mapping untouched", () => {
    const migration = readFileSync(
      resolve(process.cwd(), "supabase/migrations/20261009150500_register_prospecting_pro_module.sql"),
      "utf8",
    );
    const existingModulePath = migration.split("ON CONFLICT (slug) DO NOTHING;")[1];
    expect(existingModulePath).toBeDefined();
    expect(existingModulePath).toMatch(/UPDATE public\.marketplace_modules\s+SET min_plan = 'growth'/i);
    expect(existingModulePath).not.toMatch(/\bSET\s+(pricing_model|price_eur|stripe_price_id)\b/i);
    expect(existingModulePath).not.toMatch(/\bDELETE\s+FROM\s+public\.workspace_modules\b/i);
  });
});
