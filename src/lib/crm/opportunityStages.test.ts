import { describe, it, expect } from "vitest";
import { stagesForOpportunity } from "./opportunityStages";

const stages = [
  { id: "a", pipeline_id: "p1" },
  { id: "b", pipeline_id: "p1" },
  { id: "c", pipeline_id: "p2" },
  { id: "orf", pipeline_id: null },
];

describe("stagesForOpportunity", () => {
  it("mostra só as etapas do funil da oportunidade", () => {
    expect(stagesForOpportunity(stages, { pipeline_id: "p1", stage_id: "a" }).map((s) => s.id)).toEqual(["a", "b"]);
  });
  it("deduz o funil pela etapa atual quando falta pipeline_id", () => {
    expect(stagesForOpportunity(stages, { pipeline_id: null, stage_id: "c" }).map((s) => s.id)).toEqual(["c"]);
  });
  it("etapa órfã não arrasta todas as etapas", () => {
    expect(stagesForOpportunity(stages, { stage_id: "orf" }).map((s) => s.id)).toEqual(["orf"]);
  });
});
