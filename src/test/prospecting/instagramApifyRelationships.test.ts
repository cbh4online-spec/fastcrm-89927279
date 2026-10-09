import { describe, it, expect, vi } from "vitest";
import * as ap from "../../../supabase/functions/_shared/instagramApifyRelationships";
import { isLegacyRelationshipJob } from "@/lib/prospecting/extractionJobState";
import * as srv from "../../../supabase/functions/_shared/instagramSources";

// Exemplo do README oficial do Actor
const ITEMS = [
  { sourceUsername: "grandhaportugal", userId: "1", username: "john_wyw", fullName: "John", isVerified: false, isPrivate: false, type: "FOLLOWER" },
  { sourceUsername: "grandhaportugal", userId: "2", username: "nada.mohamedabdo", isPrivate: true, type: "FOLLOWER" },
  { sourceUsername: "grandhaportugal", userId: "3", username: "John_WYW", isPrivate: false, type: "FOLLOWER" },
  { sourceUsername: "grandhaportugal", userId: "4", username: "other", isPrivate: false, type: "FOLLOWING" },
  { sourceUsername: "outro", userId: "5", username: "intruso", isPrivate: false, type: "FOLLOWER" },
];

const env = (k: string) => ({ LOVABLE_API_KEY: "lov_x", APIFY_API_KEY: "conn_x" } as Record<string, string>)[k];
const res = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const mk = (queue: Array<Response | Error>, getEnv = env) => {
  const calls: { url: string; init: RequestInit }[] = [];
  const sleep = vi.fn(async () => undefined);
  const f = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const r = queue.shift();
    if (!r || r instanceof Error) throw r ?? new Error("fim");
    return r;
  }) as unknown as typeof fetch;
  return { deps: { fetch: f, sleep, getEnv }, calls, sleep };
};

describe("contrato do Actor oficial", () => {
  it("input documentado e teto de custo", () => {
    expect(ap.buildRunInput("following", "GrandHaPortugal", 5)).toEqual({ usernames: ["grandhaportugal"], dataToScrape: "following", resultsLimit: 5 });
    expect(ap.buildRunPath(5)).toBe("/acts/apify~instagram-followers-following-scraper/runs?maxItems=5&maxTotalChargeUsd=0.0151");
    expect(ap.maxChargeUsd(500)).toBeCloseTo(1.01, 4);
  });
  it("só públicos do tipo e origem certos, sem duplicados", () => {
    const p = ap.parseDatasetItems(ITEMS, "followers", "grandhaportugal");
    expect(p.usernames).toEqual(["john_wyw"]);
    expect(p.privateSkipped).toBe(1);
    expect(p.rawCount).toBe(5);
  });
  it("erro no_items do perfil de origem", () => {
    expect(ap.parseDatasetItems([{ error: "no_items", errorDescription: "Profile is private" }], "followers", "x").sourceError).toMatch(/privado/);
    expect(ap.parseDatasetItems([{ error: "no_items", errorDescription: "Profile does not exist" }], "followers", "x").sourceError).toMatch(/não existe/);
  });
  it("cursor persistido ida e volta", () => {
    const c = { runId: "abc123", datasetId: "ds9", offset: 200 };
    expect(ap.decodeCursor(ap.encodeCursor(c))).toEqual(c);
    expect(ap.decodeCursor("25")).toBeNull();
  });
  it("estados de execução", () => {
    expect(ap.runPhase("RUNNING")).toBe("running");
    expect(ap.runPhase("SUCCEEDED")).toBe("succeeded");
    expect(ap.runPhase("TIMED-OUT")).toBe("failed");
    expect(ap.runFailureMessage("ABORTED")).toMatch(/teto de custo/);
  });
});

describe("gateway, autenticação e falhas", () => {
  it("usa o gateway com a ligação do projeto e nunca o token na URL", async () => {
    const d = mk([res(201, { data: { id: "run1", defaultDatasetId: "ds1" } })]);
    const r = await ap.startRun("followers", "grandhaportugal", 5, d.deps);
    expect(r).toEqual({ runId: "run1", datasetId: "ds1" });
    expect(d.calls[0].url.startsWith("https://connector-gateway.lovable.dev/apify/acts/")).toBe(true);
    expect(d.calls[0].url).not.toMatch(/token=/);
    const h = d.calls[0].init.headers as Record<string, string>;
    expect(h.Authorization).toBe("Bearer lov_x");
    expect(h["X-Connection-Api-Key"]).toBe("conn_x");
    expect(JSON.parse(String(d.calls[0].init.body))).toEqual({ usernames: ["grandhaportugal"], dataToScrape: "followers", resultsLimit: 5 });
  });
  it("ligação ausente → configuração necessária, sem pedidos", async () => {
    expect(ap.apifyConfigured(() => undefined)).toBe(false);
    const d = mk([], () => undefined);
    await expect(ap.startRun("followers", "a", 5, d.deps)).rejects.toMatchObject({ fatal: true });
    expect(d.calls).toHaveLength(0);
  });
  it.each([400, 401, 402, 403, 404])("%i é fatal, sem repetir", async (status) => {
    const d = mk([res(status, {})]);
    await expect(ap.getRunStatus("run1", d.deps)).rejects.toMatchObject({ status, fatal: true });
    expect(d.calls).toHaveLength(1);
  });
  it("429/5xx com backoff e recuperação", async () => {
    const d = mk([res(429, {}), res(503, {}), res(200, { data: { status: "RUNNING", usageTotalUsd: 0.004 } })]);
    expect(await ap.getRunStatus("run1", d.deps)).toEqual({ status: "RUNNING", usageUsd: 0.004 });
    expect(d.sleep).toHaveBeenNthCalledWith(1, 1000);
    expect(d.sleep).toHaveBeenNthCalledWith(2, 2000);
  });
  it("timeout repetido é falha temporária", async () => {
    const d = mk([new Error("abort"), new Error("abort"), new Error("abort")]);
    await expect(ap.readDataset("ds1", 0, d.deps)).rejects.toMatchObject({ status: 0, fatal: false });
  });
  it("dataset paginado por offset", async () => {
    const d = mk([res(200, ITEMS)]);
    await ap.readDataset("ds1", 100, d.deps);
    expect(d.calls[0].url).toMatch(/\/datasets\/ds1\/items\?offset=100&limit=100&clean=true$/);
  });
  it("execução sem id não é tratada como sucesso", async () => {
    const d = mk([res(201, { data: {} })]);
    await expect(ap.startRun("followers", "a", 5, d.deps)).rejects.toMatchObject({ fatal: true });
  });
});

describe("compatibilidade", () => {
  it("trabalhos Apify não são legados; instagram-looter2 continua bloqueado", () => {
    expect(isLegacyRelationshipJob("followers", "apify")).toBe(false);
    expect(srv.isLegacyRelationshipJob("following", "apify")).toBe(false);
    expect(isLegacyRelationshipJob("followers", null)).toBe(true);
  });
});
