import { describe, it, expect } from "vitest";
import { mobileCellClass } from "@/components/documents/listing/mobileCardCell";
describe("Cartões móveis — Score PARE e Data de criação", () => {
  it("Score PARE 0 continua visível (é um valor real)", () => {
    expect(mobileCellClass("pare_score", 2, { pare_score: 0 })).not.toContain("max-md:hidden");
  });
  it("o valor da célula não encolhe até desaparecer", () => {
    expect(mobileCellClass("created_at", 2, { created_at: "2026-08-26" })).toContain("max-md:[&>*]:min-w-fit");
  });
});
