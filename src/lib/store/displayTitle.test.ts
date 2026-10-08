import { describe, it, expect } from "vitest";
import { formatStoreTitle } from "./displayTitle";

describe("formatStoreTitle", () => {
  it("remove separadores soltos no fim e espaços duplicados", () => {
    expect(formatStoreTitle("Ajax - Suporte  MotionCam - ")).toBe("Ajax - Suporte MotionCam");
  });
  it("usa a grafia PT-PT de detetor", () => {
    expect(formatStoreTitle("Ajax Detector de fumo")).toBe("Ajax Detetor de fumo");
  });
});
