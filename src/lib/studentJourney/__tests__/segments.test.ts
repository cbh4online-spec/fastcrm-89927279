import { describe, it, expect } from "vitest";
import { matchesJourneySegment, isJourneySegmentKey } from "../segments";
import { JOURNEY_TIMING_CONFIG } from "@/types/sjJourney";

const base = { currentState: "active_student", isActivationCandidate: false, activationPriority: 5, activationScore: 0, daysSinceLastActivity: 0 };

describe("journey segments", () => {
  it("state segments match current state", () => {
    expect(matchesJourneySegment(base, "active_student")).toBe(true);
    expect(matchesJourneySegment(base, "inactive")).toBe(false);
  });
  it("ready for contact needs priority <=2 and score >60", () => {
    expect(matchesJourneySegment({ ...base, activationPriority: 2, activationScore: 61 }, "ready_contact")).toBe(true);
    expect(matchesJourneySegment({ ...base, activationPriority: 2, activationScore: 60 }, "ready_contact")).toBe(false);
  });
  it("at risk is beyond threshold minus 14 days", () => {
    const t = JOURNEY_TIMING_CONFIG.inactivityThresholdDays - 14;
    expect(matchesJourneySegment({ ...base, daysSinceLastActivity: t + 1 }, "at_risk")).toBe(true);
    expect(matchesJourneySegment({ ...base, daysSinceLastActivity: t }, "at_risk")).toBe(false);
  });
  it("activation uses candidate flag", () => {
    expect(matchesJourneySegment({ ...base, isActivationCandidate: true }, "activation")).toBe(true);
  });
  it("unknown keys are rejected", () => {
    expect(isJourneySegmentKey("xpto")).toBe(false);
  });
});
