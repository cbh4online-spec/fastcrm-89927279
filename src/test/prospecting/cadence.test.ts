import { describe, it, expect } from "vitest";
import { buildFollowUpRows, buildInitialOutreachRow, resolveCadenceChannel } from "@/lib/prospecting/cadence";

describe("cadência Instagram → WhatsApp", () => {
  it("passo 2 vai para WhatsApp quando há telefone válido", () => {
    expect(resolveCadenceChannel(2, "+351 912 345 678")).toBe("whatsapp");
  });

  it("passo 2 fica no Instagram sem telefone ou com telefone inválido", () => {
    expect(resolveCadenceChannel(2, null)).toBe("instagram");
    expect(resolveCadenceChannel(2, "123")).toBe("instagram");
  });

  it("passos 1 e 3 ficam sempre no Instagram", () => {
    expect(resolveCadenceChannel(1, "+351912345678")).toBe("instagram");
    expect(resolveCadenceChannel(3, "+351912345678")).toBe("instagram");
  });

  it("agenda follow-ups ao dia 3 e ao dia 7", () => {
    const now = new Date("2026-10-08T10:00:00Z");
    const rows = buildFollowUpRows({ workspaceId: "ws", profileId: "p", now });
    expect(rows.map((r) => [r.step_index, r.scheduled_for])).toEqual([
      [2, "2026-10-11T10:00:00.000Z"],
      [3, "2026-10-15T10:00:00.000Z"],
    ]);
  });

  it("regista a abordagem inicial como passo 1 apenas após confirmação", () => {
    const row = buildInitialOutreachRow({ workspaceId: "ws", profileId: "p", now: new Date("2026-10-08T10:00:00Z") });
    expect(row).toMatchObject({
      workspace_id: "ws",
      profile_id: "p",
      step_index: 1,
      status: "sent",
      scheduled_for: "2026-10-08T10:00:00.000Z",
    });
  });
});
