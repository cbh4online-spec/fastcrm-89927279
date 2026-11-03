import { describe, it, expect } from "vitest";
import { buildStudentTimeline, canSeeSjFinance } from "../timeline";

describe("buildStudentTimeline", () => {
  it("junta todas as fontes e ordena do mais recente para o mais antigo", () => {
    const ev = buildStudentTimeline({
      enrollments: [{ id: "e1", enrolled_at: "2026-09-01", courseName: "Iniciação" }],
      installments: [
        { id: "i1", paid_at: "2026-10-05", paid_amount: 150, installment_no: 1 },
        { id: "i2", paid_at: null, paid_amount: 0, installment_no: 2 },
      ],
      attendance: [{ id: "a1", session_date: "2026-10-10", present: true, hours_attended: 7 }],
      certificates: [{ id: "c1", status: "pending", issued_at: null }],
      touchpoints: [{ id: "t1", occurred_at: "2026-11-01T10:00:00Z", typeLabel: "WhatsApp" }],
    });
    expect(ev.map((e) => e.id)).toEqual(["tp-t1", "att-a1", "pay-i1", "enr-e1"]);
  });
});

describe("canSeeSjFinance", () => {
  it("só gestão, financeiro, donos e administradores veem o financeiro", () => {
    expect(canSeeSjFinance({ workspaceRole: "member", sjRoles: ["comercial"] })).toBe(false);
    expect(canSeeSjFinance({ workspaceRole: "member", sjRoles: ["financeiro"] })).toBe(true);
    expect(canSeeSjFinance({ workspaceRole: "owner" })).toBe(true);
  });
});
