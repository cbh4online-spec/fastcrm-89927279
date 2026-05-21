import { describe, it, expect, beforeEach } from "vitest";
import { createDynamicClient, clearClientCache } from "@/lib/dynamicSupabase";

/**
 * Garantias de isolamento entre tenants para o factory de clientes Supabase.
 * Cada par (url, anonKey) corresponde a um projecto distinto e NUNCA pode
 * partilhar a mesma instância de cliente com outro tenant.
 */
describe("createDynamicClient — isolamento multi-tenant", () => {
  beforeEach(() => {
    clearClientCache();
  });

  it("devolve a MESMA instância para o mesmo (url, key) — cache por tenant", () => {
    const a1 = createDynamicClient("https://t1.supabase.co", "anon-t1");
    const a2 = createDynamicClient("https://t1.supabase.co", "anon-t1");
    expect(a1).toBe(a2);
  });

  it("devolve instâncias DIFERENTES para URLs diferentes (tenants distintos)", () => {
    const a = createDynamicClient("https://t1.supabase.co", "anon-shared");
    const b = createDynamicClient("https://t2.supabase.co", "anon-shared");
    expect(a).not.toBe(b);
  });

  it("devolve instâncias DIFERENTES para a mesma URL com anon keys diferentes", () => {
    const a = createDynamicClient("https://t1.supabase.co", "anon-A");
    const b = createDynamicClient("https://t1.supabase.co", "anon-B");
    expect(a).not.toBe(b);
  });

  it("cada cliente aponta para o endpoint REST do tenant correspondente — sem cross-tenant URL leak", () => {
    const a = createDynamicClient("https://t1.supabase.co", "anon-t1") as any;
    const b = createDynamicClient("https://t2.supabase.co", "anon-t2") as any;

    // supabase-js expõe restUrl/realtimeUrl internamente; validamos via .from().url
    const urlA = (a.from("any_table") as any).url?.toString?.() ?? "";
    const urlB = (b.from("any_table") as any).url?.toString?.() ?? "";

    expect(urlA).toContain("t1.supabase.co");
    expect(urlA).not.toContain("t2.supabase.co");
    expect(urlB).toContain("t2.supabase.co");
    expect(urlB).not.toContain("t1.supabase.co");
  });

  it("clearClientCache força reinstanciação (útil em logout / troca de tenant forçada)", () => {
    const a = createDynamicClient("https://t1.supabase.co", "anon-t1");
    clearClientCache();
    const b = createDynamicClient("https://t1.supabase.co", "anon-t1");
    expect(a).not.toBe(b);
  });
});
