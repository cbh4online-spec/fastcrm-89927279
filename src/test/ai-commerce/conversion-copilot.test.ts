import { describe, expect, it } from "vitest";
import {
  analyzeConversionCopilot,
  type CopilotFunnelStats,
  type CopilotProductInput,
} from "@/lib/ai-commerce/conversionCopilot";

const product = (over: Partial<CopilotProductInput> = {}): CopilotProductInput => ({
  id: "p1",
  name: "Central de alarme",
  sku: "AJ-1",
  price: 200,
  stockStatus: "in_stock",
  storePublished: true,
  readinessScore: 90,
  aiEnabled: true,
  hasAccessories: true,
  ...over,
});

const stats = (over: Partial<CopilotFunnelStats> = {}): CopilotFunnelStats => ({
  productId: "p1",
  views: 0,
  carts: 0,
  checkouts: 0,
  purchases: 0,
  revenue: 0,
  ...over,
});

describe("analyzeConversionCopilot", () => {
  it("reporta ausência de dados quando não há eventos", () => {
    const res = analyzeConversionCopilot([product()], new Map(), { days: 30 });
    expect(res.hasData).toBe(false);
    expect(res.recommendations).toHaveLength(0);
  });

  it("deteta visitas sem adição ao carrinho", () => {
    const funnel = new Map([["p1", stats({ views: 50 })]]);
    const res = analyzeConversionCopilot([product()], funnel, { days: 30 });
    expect(res.recommendations[0].kind).toBe("critical_dropoff");
    expect(res.recommendations[0].severity).toBe("critical");
  });

  it("deteta carrinhos sempre abandonados", () => {
    const funnel = new Map([["p1", stats({ views: 100, carts: 20 })]]);
    const res = analyzeConversionCopilot([product()], funnel, { days: 30 });
    expect(res.recommendations[0].kind).toBe("abandoned_cart");
  });

  it("sugere acessórios em produtos que vendem sem complementos", () => {
    const funnel = new Map([["p1", stats({ views: 100, carts: 20, purchases: 8, revenue: 1600 })]]);
    const res = analyzeConversionCopilot([product({ hasAccessories: false })], funnel, { days: 30 });
    expect(res.recommendations[0].kind).toBe("cross_sell_opportunity");
  });

  it("calcula a meta com base no ticket médio real", () => {
    const funnel = new Map([["p1", stats({ views: 1000, carts: 100, purchases: 50, revenue: 10000 })]]);
    const res = analyzeConversionCopilot([product()], funnel, { days: 30, targetMonthlyRevenue: 50000 });
    expect(res.totals.averageOrderValue).toBe(200);
    expect(res.goal.ordersNeeded).toBe(250);
    expect(res.goal.currentRevenue).toBe(10000);
  });

  it("alerta procura ativa sem stock", () => {
    const funnel = new Map([["p1", stats({ views: 40, carts: 6, purchases: 2, revenue: 400 })]]);
    const res = analyzeConversionCopilot([product({ stockStatus: "out_of_stock" })], funnel, { days: 30 });
    expect(res.recommendations.some((r) => r.kind === "stock_risk")).toBe(true);
  });
});
