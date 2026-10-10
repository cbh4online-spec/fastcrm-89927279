import { describe, expect, it } from "vitest";
import { bulkProgress, selectBulkEligible } from "../bulkEligibility";

type I = { id: string; wa: boolean };
const isWa = (i: I) => i.wa;

describe("fluxo em massa de follow-ups", () => {
  it("só WhatsApp: zero elegíveis, sem fase em massa", () => {
    const items: I[] = [{ id: "a", wa: true }, { id: "b", wa: true }];
    expect(selectBulkEligible(items, isWa)).toHaveLength(0);
    expect(bulkProgress([], new Set(), new Set())).toEqual({ total: 0, processed: 0, pct: 0 });
  });
  it("misto: denominador e progresso só com Instagram", () => {
    const items: I[] = [{ id: "a", wa: true }, { id: "b", wa: false }, { id: "c", wa: false }];
    const elig = selectBulkEligible(items, isWa).map((i) => i.id);
    expect(elig).toEqual(["b", "c"]);
    const p = bulkProgress(elig, new Set(["b", "a"]), new Set());
    expect(p).toEqual({ total: 2, processed: 1, pct: 50 });
  });
});
