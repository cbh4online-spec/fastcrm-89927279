import { describe, it, expect } from "vitest";
import { computeEffectiveness } from "@/lib/prospecting/effectiveness";
import { fillObjectionReply } from "@/lib/prospecting/objectionReplies";

const now = new Date("2026-10-08T15:00:00");
const today = "2026-10-08T10:00:00";
const old = "2026-09-01T10:00:00";

describe("eficácia da prospeção", () => {
  it("taxa de resposta conta perfis abordados cuja cadência parou", () => {
    const r = computeEffectiveness(
      [
        { profile_id: "a", step_index: 1, status: "sent", updated_at: today },
        { profile_id: "b", step_index: 1, status: "sent", updated_at: old },
        { profile_id: "a", step_index: 2, status: "cancelled", updated_at: today },
        { profile_id: "b", step_index: 2, status: "sent", updated_at: today },
        { profile_id: "b", step_index: 3, status: "scheduled", updated_at: today },
      ],
      now,
    );
    expect(r.responseRate).toBe(50);
    expect(r.approachesToday).toBe(1);
    expect(r.approaches7d).toBe(1);
    expect(r.followUpsDone).toBe(1);
    expect(r.followUpsPending).toBe(1);
  });

  it("sem abordagens a taxa é nula", () => {
    expect(computeEffectiveness([], now).responseRate).toBeNull();
  });

  it("resposta rápida usa o primeiro nome ou remove o marcador", () => {
    expect(fillObjectionReply("Olá {nome}, ok", "Ana Silva")).toBe("Olá Ana, ok");
    expect(fillObjectionReply("Olá {nome}, ok", null)).toBe("Olá, ok");
  });
});
