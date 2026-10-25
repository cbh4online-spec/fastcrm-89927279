import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { lookupPhoneVariants, normalizeLookupPhone, queryLookup } from "./lookup";

describe("normalização e variantes", () => {
  it("inclui os quatro formatos PT pedidos", () => {
    expect(lookupPhoneVariants("912 345 678")).toEqual(["+351912345678", "00351912345678", "351912345678", "912345678"]);
    expect(normalizeLookupPhone("00351 (912) 345-678")).toBe("+351912345678");
  });
  it("noutros países só inclui formatos completos", () => {
    expect(lookupPhoneVariants("+34 612 345 678")).toEqual(["+34612345678", "0034612345678", "34612345678"]);
  });
  it("rejeita PT inválido e injeções na gramática do filtro", () => {
    for (const raw of ["", "812345678", "+35191234567", "+3519123456789", "+0351912345678", "+1234567", "+1234567890123456", "+351912345678),workspace_id.neq.x", "++351912345678", "1".repeat(41)]) {
      expect(normalizeLookupPhone(raw)).toBeNull();
      expect(lookupPhoneVariants(raw)).toEqual([]);
    }
  });
});

function mockClient() {
  const chains: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {};
  const from = vi.fn((table: string) => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ["select", "eq", "is", "or", "in", "limit", "order"]) chain[method] = vi.fn(() => chain);
    chain.abortSignal = vi.fn(() => Promise.resolve({ data: [], error: null }));
    chains[table] = chain;
    return chain;
  });
  return { client: { from } as unknown as SupabaseClient<Database>, from, chains };
}

describe("consulta somente leitura", () => {
  it("filtra ambas as fontes no servidor pelo workspace e limita a 20", async () => {
    const { client, from, chains } = mockClient();
    const signal = new AbortController().signal;
    await queryLookup(client, "workspace-atual", "912345678", signal);
    expect(from.mock.calls).toEqual([["contacts"], ["leads"]]);
    for (const table of ["contacts", "leads"]) {
      expect(chains[table].eq).toHaveBeenCalledWith("workspace_id", "workspace-atual");
      expect(chains[table].limit).toHaveBeenCalledWith(20);
      expect(chains[table].abortSignal).toHaveBeenCalledWith(signal);
      expect(chains[table].is).toHaveBeenCalledWith("archived_at", null);
    }
    expect(chains.contacts.is).toHaveBeenCalledWith("deleted_at", null);
    expect(chains.contacts.or).toHaveBeenCalledWith("phone.in.(+351912345678,00351912345678,351912345678,912345678),whatsapp_number.in.(+351912345678,00351912345678,351912345678,912345678)");
    expect(chains.leads.in).toHaveBeenCalledWith("phone", ["+351912345678", "00351912345678", "351912345678", "912345678"]);
    expect(chains.contacts.select).toHaveBeenCalledWith("id,workspace_id,name,phone,whatsapp_number,company");
    expect(chains.leads.select).toHaveBeenCalledWith("id,workspace_id,name,phone,status");
  });
  it("não consulta sem workspace ou com telefone inválido", async () => {
    const { client, from } = mockClient();
    const signal = new AbortController().signal;
    await expect(queryLookup(client, "", "912345678", signal)).rejects.toThrow();
    await expect(queryLookup(client, "workspace-atual", "bad", signal)).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });
});