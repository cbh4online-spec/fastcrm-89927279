import { describe, it, expect, vi } from "vitest";
import * as rel from "../../../supabase/functions/_shared/instagramRelationships";
import * as srv from "../../../supabase/functions/_shared/instagramSources";
import {
  CONFIGURATION_REQUIRED_MESSAGE,
  isLegacyRelationshipJob,
  resolveJobDisplay,
  UNSUPPORTED_SOURCE_LEGACY_MESSAGE,
} from "@/lib/prospecting/extractionJobState";

// Fixtures copiadas dos exemplos da especificação oficial (openapi.json)
const PAGE_1 = {
  data: {
    items: [
      { id: "13460080", username: "nike", full_name: "Nike", is_verified: true, is_private: false, profile_pic_url: "x" },
      { id: "27821530565", username: "16mh.vl", full_name: "", is_verified: false, is_private: true, profile_pic_url: "x" },
    ],
    next_cursor: "25",
  },
  meta: { endpoint: "profile/followers", request_id: "req_3f8a1c9e", credits_charged: 2, credits_remaining: 4987, ms: 412 },
};

const jsonRes = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

const deps = (responses: Array<Response | Error>) => {
  const calls: { url: string; init: RequestInit }[] = [];
  const sleep = vi.fn(async () => undefined);
  const f = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const r = responses.shift();
    if (!r) throw new Error("sem resposta");
    if (r instanceof Error) throw r;
    return r;
  }) as unknown as typeof fetch;
  return { deps: { fetch: f, sleep }, calls, sleep };
};

describe("contrato ProfileQuery", () => {
  it("host fixo, caminhos e parâmetros documentados", () => {
    expect(rel.buildRelationshipsUrl("followers", "grandhaportugal", null)).toBe(
      "https://api.profilequery.com/v1/profile/followers?handle=grandhaportugal",
    );
    expect(rel.buildRelationshipsUrl("following", "grandhaportugal", "25")).toBe(
      "https://api.profilequery.com/v1/profile/following?handle=grandhaportugal&cursor=25",
    );
  });

  it("lê data.items e data.next_cursor, ignora privados e duplicados", () => {
    const p = rel.parseRelationshipsPage({
      data: { ...PAGE_1.data, items: [...PAGE_1.data.items, { username: "NIKE", is_private: false }] },
    });
    expect(p.usernames).toEqual(["nike"]);
    expect(p.privateSkipped).toBe(1);
    expect(p.nextCursor).toBe("25");
  });

  it("aceita a variante meta.next_cursor e cursor nulo", () => {
    expect(rel.parseRelationshipsPage({ data: { items: [] }, meta: { next_cursor: "50" } }).nextCursor).toBe("50");
    expect(rel.parseRelationshipsPage({ data: { items: [], next_cursor: null } }).nextCursor).toBeNull();
  });

  it("envia Bearer com a chave dedicada", async () => {
    const d = deps([jsonRes(200, PAGE_1)]);
    await rel.fetchRelationshipsPage("followers", "grandhaportugal", null, "pq_test_key", d.deps);
    expect((d.calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer pq_test_key");
  });
});

describe("paginação e limites", () => {
  it("continua com cursor novo", () => {
    const s = rel.nextListingState({ previousCursor: null, page: { usernames: ["a"], privateSkipped: 0, nextCursor: "25" }, queuedAfter: 1, limit: 100 });
    expect(s).toEqual({ cursor: "25", done: false, note: null });
  });
  it("cursor repetido termina com nota de lista incompleta", () => {
    const s = rel.nextListingState({ previousCursor: "25", page: { usernames: ["a"], privateSkipped: 0, nextCursor: "25" }, queuedAfter: 30, limit: 100 });
    expect(s.done).toBe(true);
    expect(s.note).toMatch(/30 perfis públicos/);
  });
  it("API termina antes do máximo: mostra quantidade obtida, sem prometer lista completa", () => {
    const s = rel.nextListingState({ previousCursor: "25", page: { usernames: [], privateSkipped: 0, nextCursor: null }, queuedAfter: 48, limit: 200 });
    expect(s.note).toMatch(/48 perfis públicos/);
    expect(s.note).toMatch(/pode não estar completa/);
  });
  it("atingir o limite termina sem nota", () => {
    const s = rel.nextListingState({ previousCursor: null, page: { usernames: [], privateSkipped: 0, nextCursor: "25" }, queuedAfter: 5, limit: 5 });
    expect(s).toMatchObject({ done: true, note: null });
  });
});

describe("falhas e repetições", () => {
  it.each([401, 402, 403, 404, 400])("%i é fatal e não repete", async (status) => {
    const d = deps([jsonRes(status, { error: { code: "x" } })]);
    await expect(rel.fetchRelationshipsPage("followers", "a", null, "k_12345678", d.deps)).rejects.toMatchObject({ status, fatal: true });
    expect(d.calls).toHaveLength(1);
  });
  it("404 indica pedido cobrado", () => {
    expect(rel.relationshipsErrorFor(404).billed).toBe(true);
    expect(rel.relationshipsErrorFor(502).billed).toBe(false);
  });
  it("429 e 502 repetem com backoff e recuperam", async () => {
    const d = deps([jsonRes(429, {}, { "retry-after": "2" }), jsonRes(502, {}), jsonRes(200, PAGE_1)]);
    const r = await rel.fetchRelationshipsPage("followers", "a", null, "k_12345678", d.deps);
    expect(r.attempts).toBe(3);
    expect(d.sleep).toHaveBeenNthCalledWith(1, 2000);
    expect(d.sleep).toHaveBeenNthCalledWith(2, 2000);
  });
  it("5xx esgotado após 3 tentativas", async () => {
    const d = deps([jsonRes(503, {}), jsonRes(503, {}), jsonRes(503, {})]);
    await expect(rel.fetchRelationshipsPage("following", "a", null, "k_12345678", d.deps)).rejects.toMatchObject({ status: 503, fatal: false });
    expect(d.calls).toHaveLength(3);
  });
  it("timeout/rede conta como falha repetível", async () => {
    const d = deps([new Error("abort"), new Error("abort"), new Error("abort")]);
    await expect(rel.fetchRelationshipsPage("following", "a", null, "k_12345678", d.deps)).rejects.toMatchObject({ status: 0 });
  });
  it("resposta 200 sem data não é tratada como lista vazia", async () => {
    const d = deps([jsonRes(200, { ok: true })]);
    await expect(rel.fetchRelationshipsPage("followers", "a", null, "k_12345678", d.deps)).rejects.toMatchObject({ fatal: true });
  });
});

describe("configuração e autorização do início", () => {
  it("chave ausente → configuração necessária", () => {
    expect(rel.relationshipsConfigured(() => undefined)).toBe(false);
    expect(rel.relationshipsConfigured((k) => (k === "RAPIDAPI_KEY" ? "rapid_key_123" : undefined))).toBe(false);
    expect(rel.relationshipsConfigured((k) => (k === "INSTAGRAM_RELATIONSHIPS_API_KEY" ? "pq_live_123456" : undefined))).toBe(true);
    const v = rel.validateRelationshipStart({ configured: false, limit: 50, activeJobs: 0, jobsLast24h: 0 });
    expect(v).toMatchObject({ ok: false, code: "configuration_required" });
  });
  it("uma recolha ativa por organização (sem dupla execução)", () => {
    expect(rel.validateRelationshipStart({ configured: true, limit: 50, activeJobs: 1, jobsLast24h: 1 })).toMatchObject({ code: "already_running" });
  });
  it("máximo de 10 por dia por organização", () => {
    expect(rel.validateRelationshipStart({ configured: true, limit: 50, activeJobs: 0, jobsLast24h: 10 })).toMatchObject({ code: "daily_limit" });
  });
  it("limite cortado a 500 perfis", () => {
    expect(rel.validateRelationshipStart({ configured: true, limit: 20000, activeJobs: 0, jobsLast24h: 0 })).toEqual({ ok: true, limit: 500 });
  });
  it("mensagem de configuração igual no ecrã e no servidor", () => {
    expect(CONFIGURATION_REQUIRED_MESSAGE).toBe(rel.CONFIGURATION_REQUIRED_MESSAGE);
  });
});

describe("trabalhos antigos vs. ProfileQuery", () => {
  it("antigo (instagram-looter2) continua bloqueado, sem afirmar ausência de pedidos", () => {
    expect(isLegacyRelationshipJob("followers", null)).toBe(true);
    expect(srv.isLegacyRelationshipJob("following", undefined)).toBe(true);
    expect(UNSUPPORTED_SOURCE_LEGACY_MESSAGE).toMatch(/404/);
    expect(UNSUPPORTED_SOURCE_LEGACY_MESSAGE).not.toMatch(/Nenhum pedido|cobrad/);
  });
  it("ProfileQuery concluído com nota mostra Concluído e a limitação", () => {
    const d = resolveJobDisplay({
      source: "followers", status: "completed", error: null, found_count: 48,
      updated_at: new Date().toISOString(), provider: "profilequery",
      listing_note: "O serviço devolveu 48 perfis públicos e terminou antes do máximo pedido (200).",
    });
    expect(d).toMatchObject({ kind: "completed", label: "Concluído", isError: false });
    expect(d.message).toMatch(/48 perfis/);
  });
  it("ProfileQuery com 401 aparece como Falhou", () => {
    const d = resolveJobDisplay({
      source: "following", status: "failed", error: rel.relationshipsErrorFor(401).message, found_count: 0,
      updated_at: new Date().toISOString(), provider: "profilequery",
    });
    expect(d.label).toBe("Falhou");
    expect(d.message).toMatch(/ProfileQuery/);
  });
});
