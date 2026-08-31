import { describe, it, expect } from "vitest";
import { toE164 } from "@/utils/phone";

/** Réplica da normalização usada no passo 2 (Audiência) do assistente de campanhas. */
function buildRecipients(records: Array<{ id: string; phone: string | null }>) {
  const seen = new Set<string>();
  return records.flatMap((r) => {
    const phone = toE164(r.phone ?? "")?.replace(/\D/g, "") ?? "";
    if (!phone || seen.has(phone)) return [];
    seen.add(phone);
    return [{ id: r.id, phone }];
  });
}

describe("audiência unificada de campanhas WhatsApp", () => {
  it("assume Portugal quando não há prefixo internacional", () => {
    expect(toE164("912345678")).toBe("+351912345678");
  });

  it("exclui telefones inválidos ou vazios", () => {
    const out = buildRecipients([
      { id: "a", phone: "912345678" },
      { id: "b", phone: "123" },
      { id: "c", phone: null },
      { id: "d", phone: "" },
    ]);
    expect(out.map((r) => r.id)).toEqual(["a"]);
  });

  it("deduplica por E.164 mesmo com formatações diferentes", () => {
    const out = buildRecipients([
      { id: "a", phone: "+351 912 345 678" },
      { id: "b", phone: "912345678" },
      { id: "c", phone: "00351912345678" },
      { id: "d", phone: "933333333" },
    ]);
    expect(out.map((r) => r.phone)).toEqual(["351912345678", "351933333333"]);
  });
});
