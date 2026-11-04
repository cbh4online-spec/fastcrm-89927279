import { describe, it, expect } from "vitest";
import { evaluateObjective, periodDays } from "../objectiveProgress";

const nov = { start: "2026-11-01", end: "2026-12-01" };

describe("objectiveProgress", () => {
  it("conta dias de calendário incluindo hoje", () => {
    expect(periodDays(nov.start, nov.end, "2026-11-04")).toEqual({ elapsed: 4, total: 30 });
  });
  it("atingido quando o valor chega ao alvo", () => {
    expect(evaluateObjective({ current: 100, target: 100, ...nov, todayYmd: "2026-11-10" }).status).toBe("achieved");
  });
  it("no caminho quando a projeção linear chega ao alvo", () => {
    const r = evaluateObjective({ current: 20, target: 100, ...nov, todayYmd: "2026-11-06" });
    expect(r.projected).toBe(100);
    expect(r.status).toBe("on_track");
  });
  it("em risco entre 85% e 100% projetado; atrasado abaixo", () => {
    expect(evaluateObjective({ current: 18, target: 100, ...nov, todayYmd: "2026-11-06" }).status).toBe("at_risk");
    expect(evaluateObjective({ current: 10, target: 100, ...nov, todayYmd: "2026-11-06" }).status).toBe("behind");
  });
  it("sem dados quando o valor é nulo", () => {
    expect(evaluateObjective({ current: null, target: 100, ...nov, todayYmd: "2026-11-06" }).status).toBe("no_data");
  });
  it("rácios não são projetados", () => {
    expect(evaluateObjective({ current: 40, target: 50, ...nov, todayYmd: "2026-11-06", cumulative: false }).projected).toBe(40);
  });
});
