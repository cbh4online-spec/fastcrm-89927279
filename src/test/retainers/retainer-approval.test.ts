import { describe, expect, it } from "vitest";
import { canSendForApproval, summarizeApproval, type RetainerEntry } from "@/lib/retainers/retainerUsage";

const e = (minutes: number, approval: RetainerEntry["approval"], billable = true): RetainerEntry => ({
  id: Math.random().toString(), source: "project", date: "2026-11-02", minutes, billable,
  description: null, userId: null, parentId: "p", parentLabel: "P", approval,
});

describe("aprovação de horas pelo cliente", () => {
  it("só envia registos ainda não enviados ou contestados", () => {
    expect(canSendForApproval("submitted")).toBe(true);
    expect(canSendForApproval("disputed")).toBe(true);
    expect(canSendForApproval("pending_client")).toBe(false);
    expect(canSendForApproval("approved")).toBe(false);
  });
  it("soma minutos faturáveis por estado e ignora tempo interno", () => {
    const s = summarizeApproval([e(60, "approved"), e(30, "pending_client"), e(15, "disputed"), e(45, undefined), e(90, "approved", false)]);
    expect(s).toEqual({ approved: 60, pending_client: 30, disputed: 15, submitted: 45 });
  });
});
