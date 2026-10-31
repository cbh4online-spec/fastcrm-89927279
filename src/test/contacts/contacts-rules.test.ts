import { describe, it, expect } from "vitest";
import { fetchAllPaged } from "@/lib/contacts/fetchAllPaged";
import { buildContactSearchOr, sanitizeIlikeTerm } from "@/lib/contacts/searchFilter";
import { emptyToNull } from "@/lib/contacts/editPayload";

describe("contactos", () => {
  it("campo apagado na edição grava null", () => {
    expect(emptyToNull("   ")).toBeNull();
    expect(emptyToNull("")).toBeNull();
    expect(emptyToNull(" a@b.pt ")).toBe("a@b.pt");
  });

  it("lê mais de 1000 contactos em blocos e pára no fim", async () => {
    const all = Array.from({ length: 2500 }, (_, i) => i);
    const calls: Array<[number, number]> = [];
    const { rows, count } = await fetchAllPaged<number>(async (from, to) => {
      calls.push([from, to]);
      return { data: all.slice(from, to + 1), error: null, count: 2500 };
    });
    expect(rows).toHaveLength(2500);
    expect(count).toBe(2500);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("propaga erros de leitura", async () => {
    await expect(fetchAllPaged(async () => ({ data: null, error: new Error("x") }))).rejects.toThrow("x");
  });

  it("pesquisa com vírgula e parênteses gera filtro válido", () => {
    expect(sanitizeIlikeTerm("Silva, Lda (Porto)")).toBe("Silva Lda Porto");
    const or = buildContactSearchOr("Silva, Lda")!;
    expect(or.split(",")).toHaveLength(3);
    expect(buildContactSearchOr(" , ")).toBeNull();
    expect(sanitizeIlikeTerm("50%")).toBe("50\\%");
  });
});
