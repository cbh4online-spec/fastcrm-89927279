import { describe, it, expect } from "vitest";
import { acceptableContacts, emailFieldHint, isRowReady, namesCompatible, nifKind, normPhone, validNif, type PreviewRow } from "../importReconciliation";

describe("importReconciliation (espelho das regras do servidor)", () => {
  it("+351, 00351 e telefone local português coincidem", () => {
    expect(normPhone("+351 912 345 678")).toBe("+351912345678");
    expect(normPhone("00351912345678")).toBe("+351912345678");
    expect(normPhone("912345678")).toBe("+351912345678");
  });
  it("outros países não colidem pelos últimos 9 dígitos", () => {
    expect(normPhone("+44 912 345 678")).not.toBe(normPhone("912345678"));
    expect(normPhone("+33 612345678")).toBe("+33612345678");
    expect(normPhone("612345678")).toBe("local:612345678");
  });
  it("valida NIF por checksum e distingue pessoa de empresa", () => {
    expect(validNif("123456789")).toBe(true);
    expect(validNif("123456780")).toBe(false);
    expect(nifKind("123456789")).toBe("person");
    expect(nifKind("501442600")).toBe("company");
  });
  it("nome sozinho não chega: compatibilidade exige primeiro e último nome", () => {
    expect(namesCompatible("Ana Maria Silva", "ana silva")).toBe(true);
    expect(namesCompatible("Ana Silva", "Rui Silva")).toBe(false);
  });
  it("telefone no campo de e-mail é pista, não e-mail", () => {
    expect(emailFieldHint("912345678")).toBe("phone_in_email");
    expect(emailFieldHint("ana@x.pt")).toBe("email");
  });
  const base: PreviewRow = { source_row: "2", status: "match", reasons: [], hints: [], contacts: [], profiles: [],
    resolution: { contact: "c", profile: "p" }, stored_decision: null, legacy_enrollments: [], existing_in_cohort: [], label_status: "ok" };
  it("linha pendente ou com designação não mapeada nunca está pronta", () => {
    expect(isRowReady(base)).toBe(true);
    expect(isRowReady({ ...base, resolution: { pending: "needs_decision" } })).toBe(false);
    expect(isRowReady({ ...base, label_status: "label_unmapped" })).toBe(false);
  });
  it("inscrição antiga sem edição exige decisão explícita", () => {
    const legacy = { ...base, legacy_enrollments: [{ id: "e", pedagogic_status: null, admin_status: null, financial_status: null, created_at: "" }] };
    expect(isRowReady(legacy)).toBe(false);
    expect(isRowReady({ ...legacy, resolution: { ...base.resolution, legacy: "e" } })).toBe(true);
  });
  it("contactos com conflito de NIF ou nome não são escolhíveis", () => {
    const p = { ...base, contacts: [
      { id: "a", name: "Ana", email: null, phone: null, tax_id: null, matched_by: ["email"], name_ok: true, nif_conflict: false },
      { id: "b", name: "Rui", email: null, phone: null, tax_id: null, matched_by: ["nif"], name_ok: false, nif_conflict: false },
      { id: "c", name: "Ana", email: null, phone: null, tax_id: null, matched_by: ["email"], name_ok: true, nif_conflict: true },
      { id: "d", name: "Ana", email: null, phone: null, tax_id: null, matched_by: ["name_only"], name_ok: true, nif_conflict: false },
    ] };
    expect(acceptableContacts(p).map((c) => c.id)).toEqual(["a"]);
  });
});
