import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { phoneOptOutVariants as clientV } from "@/lib/whatsapp/phoneVariants";
import { phoneOptOutVariants as serverV } from "../../../supabase/functions/_shared/phoneVariants";
import { mapStripeSubscription } from "../../../supabase/functions/_shared/stripeRenewalStatus";

const state: { error: unknown; optRows: unknown[]; lastIn?: string[] } = { error: null, optRows: [] };
vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string) => {
    const c: any = {
      select: () => c, eq: () => c, order: () => c,
      in: (_: string, v: string[]) => { state.lastIn = v; return c; },
      limit: () => Promise.resolve(state.error ? { data: null, error: state.error } : { data: table === "whatsapp_optouts" ? state.optRows : [], error: null }),
    };
    return c;
  };
  return { supabase: { from: (t: string) => chain(t) } };
});
import { useWhatsAppStopSignals } from "@/hooks/useWhatsAppStopSignals";

const wrap = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client: qc }, children);
};

describe("Variantes de número para opt-out", () => {
  it("formatos equivalentes geram o mesmo conjunto", () => {
    const a = new Set(clientV("912 345 678"));
    for (const f of ["+351 912 345 678", "00351912345678", "351912345678"]) expect(new Set(clientV(f))).toEqual(a);
    expect(a.has("351912345678")).toBe(true);
    expect(a.has("+351912345678")).toBe(true);
  });
  it("cliente e servidor normalizam igual", () => {
    for (const f of ["912345678", "+351 912 345 678", "+44 7700 900123", "12"]) expect(clientV(f)).toEqual(serverV(f));
  });
  it("número curto não gera variantes", () => expect(clientV("123")).toEqual([]));
});

describe("Sinais de paragem no telemóvel do contacto", () => {
  beforeEach(() => { state.error = null; state.optRows = []; state.lastIn = undefined; });
  it("opt-out gravado noutro formato é detetado", async () => {
    state.optRows = [{ id: "x" }];
    const { result } = renderHook(() => useWhatsAppStopSignals("ws1", "912345678"), { wrapper: wrap() });
    await waitFor(() => expect(result.current.optedOut).toBe(true));
    expect(state.lastIn).toContain("351912345678");
  });
  it("só consulta os números deste contacto", async () => {
    const { result } = renderHook(() => useWhatsAppStopSignals("ws1", "912345678"), { wrapper: wrap() });
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(state.lastIn!.every((v) => v.replace("+", "").endsWith("912345678"))).toBe(true);
  });
  it("sem permissão (erro RLS) mantém os botões fechados", async () => {
    state.error = { code: "42501", message: "permission denied" };
    const { result } = renderHook(() => useWhatsAppStopSignals("ws1", "912345678"), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.pending).toBe(true);
  });
});

describe("Sincronização Stripe — cancelamentos", () => {
  it("subscrição cancelada marca contrato como cancelled (valor válido)", () => {
    const m = mapStripeSubscription({ status: "canceled" });
    expect(m.status).toBe("cancelled");
    expect(m.keepNextRenewal).toBe(false);
  });
  it("cancelamento no fim do período fica agendado, sem próxima renovação", () => {
    const m = mapStripeSubscription({ status: "active", cancel_at_period_end: true, cancel_at: 1798761600 });
    expect(m.status).toBe("active");
    expect(m.cancelScheduledAt).toBe(new Date(1798761600 * 1000).toISOString());
    expect(m.keepNextRenewal).toBe(false);
    expect(m.riskHigh).toBe(true);
  });
  it("subscrição ativa normal mantém renovação", () => {
    const m = mapStripeSubscription({ status: "active" });
    expect(m.cancelScheduledAt).toBeNull();
    expect(m.keepNextRenewal).toBe(true);
  });
  it("pagamento em atraso não altera estado, só risco", () => {
    const m = mapStripeSubscription({ status: "past_due" });
    expect(m.status).toBeUndefined();
    expect(m.riskHigh).toBe(true);
  });
});
