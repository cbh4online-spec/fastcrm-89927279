import { describe, it, expect } from "vitest";
import { mergeSpecs } from "./mergeSpecs";

const base = (k: string, v = "") => ({ spec_key: k, spec_value: v, unit: "", spec_group: "Rede", display_order: 0 });

describe("mergeSpecs", () => {
  it("preenche valor vazio com a mesma chave (sem acentos/maiúsculas)", () => {
    const r = mergeSpecs([base("Interface de rede")], [{ spec_key: "interface de REDE", spec_value: "RJ-45" }], "fabricante");
    expect(r.specs[0].spec_value).toBe("RJ-45");
    expect(r.filled).toBe(1);
    expect(r.added).toBe(0);
  });
  it("nunca substitui valor já preenchido", () => {
    const r = mergeSpecs([base("Canais", "16")], [{ spec_key: "Canais", spec_value: "8" }], "ia");
    expect(r.specs[0].spec_value).toBe("16");
    expect(r.filled).toBe(0);
  });
  it("acrescenta especificações novas", () => {
    const r = mergeSpecs([], [{ spec_key: "Peso", spec_value: "1,2", unit: "kg" }], "fabricante");
    expect(r.added).toBe(1);
    expect(r.specs[0].source).toBe("fabricante");
  });
});
