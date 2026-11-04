import { describe, it, expect } from "vitest";
import { autoMapColumns, normalizePedagogic, normalizeFinancial, parseAmount, parseDate, prepareRows } from "../historicalImport";

describe("historicalImport", () => {
  it("mapeia cabeçalhos portugueses automaticamente", () => {
    const m = autoMapColumns(["Nome Completo", "E-mail", "Telemóvel", "Contribuinte", "Estado Pedagógico"]);
    expect(m).toMatchObject({ full_name: "Nome Completo", email: "E-mail", phone: "Telemóvel", nif: "Contribuinte", pedagogic_status: "Estado Pedagógico" });
  });
  it("normaliza estados", () => {
    expect(normalizePedagogic("Concluído")).toBe("completed");
    expect(normalizePedagogic("Desistiu")).toBe("withdrawn");
    expect(normalizeFinancial("Pago")).toBe("paid");
    expect(normalizeFinancial("Não pago")).toBe("unpaid");
    expect(normalizeFinancial("Parcial")).toBe("partial");
  });
  it("lê valores e datas portuguesas", () => {
    expect(parseAmount("1.250,50 €")).toBe(1250.5);
    expect(parseDate("05/03/2024")).toBe("2024-03-05");
  });
  it("bloqueia linhas sem nome e duplicados no ficheiro pela chave escolhida", () => {
    const rows = [
      { N: "Ana", E: "ana@x.pt" }, { N: "", E: "b@x.pt" }, { N: "Ana B", E: "ANA@x.pt" },
    ];
    const r = prepareRows(rows, { full_name: "N", email: "E" }, "email");
    expect(r.valid).toHaveLength(1);
    expect(r.fileDuplicates).toBe(1);
    expect(r.issues.filter((i) => i.blocking)).toHaveLength(2);
  });
  it("ignora certificado quando a formação não está concluída", () => {
    const r = prepareRows([{ N: "Ana", E: "a@x.pt", S: "Em curso", C: "Sim" }], { full_name: "N", email: "E", pedagogic_status: "S", certificate_issued: "C" }, "email");
    expect(r.valid[0].certificate_issued).toBe(false);
  });
});
