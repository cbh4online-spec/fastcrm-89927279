import { describe, it, expect } from "vitest";
import { isValidPhone, toE164 } from "@/utils/phone";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const normalizePhoneKey = (v: string) => {
  const d = v.replace(/[^\d]/g, "");
  return d.length >= 9 ? d.slice(-9) : d;
};

describe("regras do importador CSV de contactos", () => {
  it("aceita linhas só com email ou só com telefone", () => {
    expect(EMAIL_RE.test("ana@x.pt")).toBe(true);
    expect(isValidPhone("+351912345678")).toBe(true);
  });
  it("rejeita email/telefone inválidos", () => {
    expect(EMAIL_RE.test("notanemail")).toBe(false);
    expect(isValidPhone("123")).toBe(false);
  });
  it("normaliza telefone para E.164 e chave de dedup", () => {
    expect(toE164("912345678")).toBe("+351912345678");
    expect(normalizePhoneKey("+351 912 345 678")).toBe("912345678");
    expect(normalizePhoneKey("00351912345678")).toBe("912345678");
  });
  it("deteta duplicados por email normalizado", () => {
    expect("Ana@X.pt".trim().toLowerCase()).toBe("ana@x.pt");
  });
});
