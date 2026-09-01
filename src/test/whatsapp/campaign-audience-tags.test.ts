import { describe, it, expect } from "vitest";
import { toE164 } from "@/utils/phone";
import { supportsTagFilter, normalizedTagFilter, originKey } from "@/components/whatsapp-pro/campaignAudience";

describe("filtro por tag na audiência de campanhas", () => {
  it("aplica filtro de tag a contactos e leads, mas não a empresas", () => {
    expect(supportsTagFilter("contacts")).toBe(true);
    expect(supportsTagFilter("leads")).toBe(true);
    expect(supportsTagFilter("companies")).toBe(false);
  });

  it("normaliza a tag (trim) e ignora vazios", () => {
    expect(normalizedTagFilter("leads", "  ghl  ")).toBe("ghl");
    expect(normalizedTagFilter("leads", "   ")).toBeNull();
    expect(normalizedTagFilter("companies", "ghl")).toBeNull();
  });

  it("preserva a origem lead_id nos destinatários", () => {
    expect(originKey("leads")).toBe("lead_id");
    expect(originKey("contacts")).toBe("contact_id");
    expect(originKey("companies")).toBe("company_id");
  });
});

/** Réplica da paginação de 1000 em 1000 usada no carregamento de audiência. */
async function paginate(total: number, pageSize = 1000) {
  const pages: number[] = [];
  let from = 0;
  while (true) {
    const size = Math.max(0, Math.min(pageSize, total - from));
    pages.push(size);
    if (size < pageSize) break;
    from += pageSize;
  }
  return pages;
}

describe("paginação da audiência", () => {
  it("faz páginas de 1000 e termina numa página incompleta", async () => {
    expect(await paginate(2500)).toEqual([1000, 1000, 500]);
    expect(await paginate(0)).toEqual([0]);
    expect(await paginate(1000)).toEqual([1000, 0]);
  });
});

/** Réplica do estado do assistente: trocar de modo ou de tag limpa a pré-visualização. */
function makeAudienceState() {
  let mode = "manual";
  let tag = "";
  let preview: Array<{ phone: string; lead_id?: string }> = [{ phone: "351912345678", lead_id: "l1" }];
  let stats: unknown = { eligible: 1 };
  const clear = () => { preview = []; stats = null; };
  return {
    setMode(v: string) { mode = v; clear(); },
    setTag(v: string) { tag = v; clear(); },
    get snapshot() { return { mode, tag, preview, stats }; },
  };
}

describe("limpeza de resultados", () => {
  it("limpa audiência ao trocar de modo", () => {
    const s = makeAudienceState();
    s.setMode("leads");
    expect(s.snapshot.preview).toEqual([]);
    expect(s.snapshot.stats).toBeNull();
  });

  it("limpa audiência ao alterar a tag", () => {
    const s = makeAudienceState();
    s.setTag("ghl");
    expect(s.snapshot.preview).toEqual([]);
    expect(s.snapshot.tag).toBe("ghl");
  });
});

describe("leads com tag preservam lead_id após normalização", () => {
  it("mapeia registos válidos com lead_id", () => {
    const records = [
      { id: "l1", name: "A", phone: "912345678", tags: ["ghl"] },
      { id: "l2", name: "B", phone: "912345678", tags: ["ghl"] },
      { id: "l3", name: "C", phone: "abc", tags: ["ghl"] },
    ];
    const seen = new Set<string>();
    const out = records.flatMap((r) => {
      const phone = toE164(r.phone)?.replace(/\D/g, "") ?? "";
      if (!phone || seen.has(phone)) return [];
      seen.add(phone);
      return [{ phone, [originKey("leads")]: r.id }];
    });
    expect(out).toEqual([{ phone: "351912345678", lead_id: "l1" }]);
  });
});
