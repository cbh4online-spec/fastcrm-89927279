import { describe, it, expect } from "vitest";
import { autoMapColumns, normalizePedagogic, normalizeFinancial, parseAmount, parseDate, partitionRowsForEdition, prepareRows } from "../historicalImport";

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
  it("seleciona apenas ocorrências integralmente mapeadas para o curso e edição escolhidos", () => {
    const rows = prepareRows([
      { N: "Ana", F: "Iniciação", E: "PORTO24/1" },
      { N: "Bruno", F: "Avançado", E: "LISBOA23/2" },
      { N: "Carla", F: "Iniciação", E: "DESCONHECIDA" },
      { N: "Dário", F: "Iniciação; Avançado", E: "PORTO24/1; LISBOA23/2" },
    ], { full_name: "N", course_label: "F", edition_label: "E" }).valid;
    const selected = partitionRowsForEdition(rows, [
      { label_norm: "iniciacao", course_id: "course-a", cohort_id: "cohort-a" },
      { label_norm: "porto24 1", course_id: "course-a", cohort_id: "cohort-a" },
      { label_norm: "avancado", course_id: "course-b", cohort_id: "cohort-b" },
      { label_norm: "lisboa23 2", course_id: "course-b", cohort_id: "cohort-b" },
    ], "course-a", "cohort-a");
    expect(selected.eligible.map((r) => r.source_row)).toEqual(["2", "5#1"]);
    expect(selected.otherEditions.map((r) => r.source_row)).toEqual(["3", "5#2"]);
    expect(selected.unmapped.map(({ row }) => row.source_row)).toEqual(["4"]);
  });
  it("uma designação desconhecida impede a ocorrência mesmo junto de designações corretas", () => {
    const [row] = prepareRows([{ N: "Ana", F: "FBTC", E: "PORTO24/1; DESCONHECIDA" }], { full_name: "N", course_label: "F", edition_label: "E" }).valid;
    const selected = partitionRowsForEdition([row], [
      { label_norm: "fbtc", course_id: "course-a", cohort_id: "cohort-a" },
      { label_norm: "porto24 1", course_id: "course-a", cohort_id: "cohort-a" },
    ], "course-a", "cohort-a");
    expect(selected.eligible).toHaveLength(0);
    expect(selected.otherEditions).toHaveLength(0);
    expect(selected.unmapped[0].missingLabels).toEqual(["DESCONHECIDA"]);
  });
  it("exige curso e edição corretos e mantém ocorrências sem designação visíveis como aviso", () => {
    const rows = prepareRows([
      { N: "Ana", F: "Outro curso", E: "Edição A" },
      { N: "Bruno", F: "Curso A", E: "Outra edição" },
      { N: "Carla", F: "", E: "" },
    ], { full_name: "N", course_label: "F", edition_label: "E" }).valid;
    const selected = partitionRowsForEdition(rows, [
      { label_norm: "outro curso", course_id: "course-b", cohort_id: "cohort-a" },
      { label_norm: "edicao a", course_id: "course-a", cohort_id: "cohort-a" },
      { label_norm: "curso a", course_id: "course-a", cohort_id: "cohort-a" },
      { label_norm: "outra edicao", course_id: "course-a", cohort_id: "cohort-b" },
    ], "course-a", "cohort-a");
    expect(selected.otherEditions.map((r) => r.source_row)).toEqual(["2", "3"]);
    expect(selected.unmapped.map(({ row }) => row.source_row)).toEqual(["4"]);
  });
});
