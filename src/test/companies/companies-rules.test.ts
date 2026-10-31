import { describe, it, expect } from "vitest";
import { buildCompanySearchOr } from "@/lib/contacts/searchFilter";
import { emptyToNull } from "@/lib/contacts/editPayload";

describe("empresas", () => {
  it("pesquisa com vírgula e parênteses gera 3 condições válidas", () => {
    const or = buildCompanySearchOr("Silva, Lda (Porto)")!;
    expect(or).toBe("name.ilike.%Silva Lda Porto%,email.ilike.%Silva Lda Porto%,industry.ilike.%Silva Lda Porto%");
    expect(or.split(",")).toHaveLength(3);
  });
  it("termo vazio não filtra", () => {
    expect(buildCompanySearchOr(" ( ) ")).toBeNull();
  });
  it("campo apagado na edição grava null", () => {
    expect(emptyToNull("  ")).toBeNull();
    expect(emptyToNull(" www.x.pt ")).toBe("www.x.pt");
  });
});
