import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { checkProspectingIdentityBatch, prospectingIdentityLabel, type ProspectingIdentityMatch } from "./identity";

const ws = "6e874265-fce7-4a8f-8e95-542bd89dd713";
const m = (entity_type: ProspectingIdentityMatch["entity_type"], extra: Partial<ProspectingIdentityMatch> = {}): ProspectingIdentityMatch => ({
  entity_type, entity_id: "x1", name: "X", field: "profile", strength: "strong", blocked: false, opportunity_id: null, ...extra,
});

describe("checkProspectingIdentityBatch", () => {
  it("usa uma única chamada por página de 100 e sempre o workspace atual", async () => {
    const rpc = vi.fn().mockImplementation((_n: string, args: { p_candidates: Array<{ key: string }> }) =>
      Promise.resolve({ data: args.p_candidates.map((c) => ({ key: c.key, result: { status: "new", matches: [] } })), error: null }));
    const client = { rpc } as unknown as SupabaseClient<Database>;
    const items = Array.from({ length: 150 }, (_, i) => ({ key: `k${i}`, name: `N${i}` }));
    const out = await checkProspectingIdentityBatch(client, ws, items);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls.every((c) => c[0] === "prospecting_identity_check_batch" && c[1].p_workspace_id === ws)).toBe(true);
    expect(Object.keys(out)).toHaveLength(150);
  });

  it("marca como indisponível (nunca «Novo») linhas em falta ou inválidas", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ key: "a", result: { bogus: true } }], error: null });
    const out = await checkProspectingIdentityBatch({ rpc } as unknown as SupabaseClient<Database>, ws, [
      { key: "a", name: "A" }, { key: "b", name: "B" },
    ]);
    expect(out.a.status).toBe("unavailable");
    expect(out.b.status).toBe("unavailable");
  });

  it("falha fechado quando o servidor recusa", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "Sem acesso" } });
    await expect(checkProspectingIdentityBatch({ rpc } as unknown as SupabaseClient<Database>, ws, [{ key: "a", name: "A" }]))
      .rejects.toThrow("Sem acesso");
  });
});

describe("prospectingIdentityLabel", () => {
  it("revela o tipo de registo existente", () => {
    expect(prospectingIdentityLabel({ status: "exists", matches: [m("lead")] }).label).toBe("Já é lead");
    expect(prospectingIdentityLabel({ status: "exists", matches: [m("contact")] }).label).toBe("Já é contacto");
    expect(prospectingIdentityLabel({ status: "exists", matches: [m("company")] }).label).toBe("Já é empresa");
    expect(prospectingIdentityLabel({ status: "opportunity", matches: [m("lead", { opportunity_id: "o1" })] }).label).toBe("Oportunidade em curso");
    expect(prospectingIdentityLabel({ status: "review", matches: [m("lead", { field: "name", strength: "possible" })] }).label).toBe("Possível duplicado");
    expect(prospectingIdentityLabel({ status: "blocked", matches: [m("contact", { blocked: true })] }).label).toBe("Não contactar");
    expect(prospectingIdentityLabel({ status: "new", matches: [] }).label).toBe("Novo");
  });
});
