import { describe, it, expect, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { partitionByIdentity, confirmOutreachWithReview } from "@/lib/prospecting/outreachGate";
import { PROSPECTING_IDENTITY_QUERY_KEY } from "@/hooks/useProspectingIdentityBatch";

const page = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }];
const identity = {
  a: { status: "new" as const, matches: [] },
  b: { status: "review" as const, matches: [] },
  c: { status: "blocked" as const, matches: [] },
  d: { status: "exists" as const, matches: [] },
  e: { status: "unavailable" as const, matches: [] },
};

describe("partitionByIdentity", () => {
  it("ignores selections from hidden pages and unverified rows", () => {
    const g = partitionByIdentity(page, new Set(["a", "hidden-1", "e"]), identity, true);
    expect(g.allowed.map((p) => p.id)).toEqual(["a"]);
    expect(g.ignored).toBe(2);
  });
  it("splits new/review/stopped", () => {
    const g = partitionByIdentity(page, new Set(["a", "b", "c", "d"]), identity, true);
    expect(g.allowed.map((p) => p.id)).toEqual(["a"]);
    expect(g.review.map((p) => p.id)).toEqual(["b"]);
    expect(g.stopped.map((p) => p.id)).toEqual(["c", "d"]);
  });
  it("treats everything as unverified when identity is not ready", () => {
    const g = partitionByIdentity(page, new Set(["a"]), identity, false);
    expect(g.allowed).toEqual([]);
    expect(g.ignored).toBe(1);
  });
});

function fakeClient(responses: Array<Record<string, unknown>>) {
  const calls: Record<string, unknown>[] = [];
  return {
    calls,
    client: { rpc: vi.fn(async (_n: string, a: Record<string, unknown>) => { calls.push(a); return { data: responses.shift(), error: null }; }) } as never,
  };
}
const args = { workspaceId: "w", profileId: "p", stepIndex: 1, sentMessage: "olá" };

describe("confirmOutreachWithReview", () => {
  it("always re-checks on the server and refuses blocked", async () => {
    const { client, calls } = fakeClient([{ status: "blocked", recorded: false }]);
    await expect(confirmOutreachWithReview(client, args, () => true)).rejects.toThrow(/Não contactar/);
    expect(calls).toHaveLength(1);
  });
  it("review needs explicit confirmation and retries with allowReview", async () => {
    const { client, calls } = fakeClient([{ status: "review", recorded: false }, { status: "sent", recorded: true }]);
    const ask = vi.fn(() => true);
    await expect(confirmOutreachWithReview(client, args, ask)).resolves.toMatchObject({ status: "sent" });
    expect(ask).toHaveBeenCalledOnce();
    expect(calls[1].p_allow_review).toBe(true);
  });
  it("declined review records nothing", async () => {
    const { client, calls } = fakeClient([{ status: "review", recorded: false }]);
    await expect(confirmOutreachWithReview(client, args, () => false)).rejects.toThrow();
    expect(calls).toHaveLength(1);
  });
});

describe("identity cache invalidation after import", () => {
  it("invalidating [key, workspace] refreshes every page/instance of that workspace only", async () => {
    const qc = new QueryClient();
    qc.setQueryData([PROSPECTING_IDENTITY_QUERY_KEY, "w1", "main", "x"], { a: { status: "new" } });
    qc.setQueryData([PROSPECTING_IDENTITY_QUERY_KEY, "w2", "main", "x"], { a: { status: "new" } });
    await qc.invalidateQueries({ queryKey: [PROSPECTING_IDENTITY_QUERY_KEY, "w1"] });
    expect(qc.getQueryState([PROSPECTING_IDENTITY_QUERY_KEY, "w1", "main", "x"])?.isInvalidated).toBe(true);
    expect(qc.getQueryState([PROSPECTING_IDENTITY_QUERY_KEY, "w2", "main", "x"])?.isInvalidated).toBe(false);
  });
});
