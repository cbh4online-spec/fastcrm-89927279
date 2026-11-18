import { describe, it, expect } from "vitest";
import { autoMapColumns, normalizePedagogic, normalizeFinancial, parseAmount, parseDate, prepareRows } from "../historicalImport";

describe("historicalImport", () => {
  it("mapeia cabeçalhos portugueses automaticamente", () => {
    const m = autoMapColumns(["Nome Completo", "E-mail", "Telemóvel", "Contribuinte", "Estado Pedagógico", "Formação"]);
    expect(m).toMatchObject({ full_name: "Nome Completo", email: "E-mail", phone: "Telemóvel", nif: "Contribuinte", pedagogic_status: "Estado Pedagógico", course_label: "Formação" });
  });
  it("normaliza estados", () => {
    expect(normalizePedagogic("Concluído")).toBe("completed");
    expect(normalizePedagogic("Desistiu")).toBe("withdrawn");
    expect(normalizeFinancial("Pago")).toBe("paid");
    expect(normalizeFinancial("Não pago")).toBe("unpaid");
  });
  it("sem informação financeira fica desconhecido, nunca 'não pago'", () => {
    expect(normalizeFinancial("")).toBeNull();
    const r = prepareRows([{ N: "Ana", F: "FBTC" }], { full_name: "N", course_label: "F" });
    expect(r.valid[0].financial_status).toBeNull();
    expect(r.valid[0].agreed_amount).toBeNull();
  });
  it("lê valores e datas portuguesas sem inventar dias", () => {
    expect(parseAmount("1.250,50 €")).toBe(1250.5);
    expect(parseDate("05/03/2024")).toBe("2024-03-05");
    expect(prepareRows([{ N: "Ana", F: "FBTC" }], { full_name: "N", course_label: "F" }).valid[0].completed_at).toBeNull();
  });
  it("cada formação de uma célula é uma ocorrência própria", () => {
    const r = prepareRows([{ N: "Ana", F: "FBTC; FATC", E: "PORTO24/1; LISBOA23/2" }], { full_name: "N", course_label: "F", edition_label: "E" });
    expect(r.valid.map((v) => [v.source_row, v.labels])).toEqual([["2#1", ["FBTC", "PORTO24/1"]], ["2#2", ["FATC", "LISBOA23/2"]]]);
  });
  it("bloqueia linhas sem nome e guarda as células de origem", () => {
    const r = prepareRows([{ N: "", F: "x" }, { N: "Rui", F: "FBTC" }], { full_name: "N", course_label: "F" });
    expect(r.issues.filter((i) => i.blocking)).toHaveLength(1);
    expect(r.valid[0].cells).toEqual({ N: "Rui", F: "FBTC" });
  });
});
