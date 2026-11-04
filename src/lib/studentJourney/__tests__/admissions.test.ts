import { describe, it, expect } from "vitest";
import { ADMISSION_STAGE_CODES, allowsEnrollment, statusForStage, validateStageMove } from "../admissions";

describe("pipeline de admissões", () => {
  it("tem 11 etapas", () => expect(ADMISSION_STAGE_CODES).toHaveLength(11));
  it("perdido exige motivo", () => {
    expect(validateStageMove("lost", "")).not.toBeNull();
    expect(validateStageMove("lost", "Preço")).toBeNull();
  });
  it("só confirmada/convertido permitem inscrição", () => {
    expect(allowsEnrollment("enrollment_confirmed")).toBe(true);
    expect(allowsEnrollment("converted")).toBe(true);
    expect(allowsEnrollment("qualified")).toBe(false);
  });
  it("convertido = ganho, perdido = perdido", () => {
    expect(statusForStage("converted")).toBe("won");
    expect(statusForStage("lost")).toBe("lost");
    expect(statusForStage("no_answer")).toBe("open");
  });
});
