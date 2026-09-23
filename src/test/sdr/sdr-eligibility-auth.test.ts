import { describe, it, expect } from "vitest";
import { evaluateCandidate, parseTargetFilters, candidateFromProfile, candidateFromLead } from "../../../supabase/functions/_shared/sdr-engine/eligibility";
import { identityKey, normalizePhone } from "../../../supabase/functions/_shared/sdr-engine/identity";
import { signWorkerRequest, verifyWorkerRequest } from "../../../supabase/functions/_shared/sdr-engine/workerAuth";
import { resolveStepContent } from "../../../supabase/functions/_shared/sdr-engine/content";

const none = { emails: new Set<string>(), phones: new Set<string>() };
const profile = (o: Record<string, unknown> = {}) => candidateFromProfile({ id: "p1", workspace_id: "ws", profile_name: "Dra. Rita", extracted_email: "Rita@Clinica.pt", extracted_phone: "912 345 678", lead_score: 80, inferred_location: "Lisboa", inferred_profession: "Dentista", status: "new", platform: "instagram", ...o });

describe("elegibilidade (B01)", () => {
  it("usa as colunas reais de professional_prospecting_profiles", () => {
    const c = profile();
    expect(c).toMatchObject({ email: "Rita@Clinica.pt", phone: "912 345 678", score: 80, name: "Dra. Rita" });
    expect(evaluateCandidate(c, parseTargetFilters({}, 70), "email", none).eligible).toBe(true);
  });
  it("aplica target_filters além do score", () => {
    const f = parseTargetFilters({ locations: ["porto"], professions: ["dentista"] }, 70);
    expect(evaluateCandidate(profile(), f, "email", none).reasons).toContain("location_not_targeted");
  });
  it("score, estado rejeitado e canal sem contacto", () => {
    const f = parseTargetFilters({}, 90);
    expect(evaluateCandidate(profile(), f, "email", none).reasons).toContain("score_below_min");
    expect(evaluateCandidate(profile({ status: "rejected" }), parseTargetFilters({}, 10), "email", none).reasons).toContain("excluded_status");
    expect(evaluateCandidate(profile({ extracted_phone: null }), parseTargetFilters({}, 10), "whatsapp", none).reasons).toContain("no_valid_phone");
  });
  it("leads do Maps: bloqueadas/arquivadas e excluídas nunca são elegíveis", () => {
    const l = candidateFromLead({ id: "l1", workspace_id: "ws", name: "Clínica X", email: "x@x.pt", phone: "213000000", icp_fit_score: 85, source: "google_maps", is_blocked: true });
    expect(evaluateCandidate(l, parseTargetFilters({ lead_sources: ["google_maps"] }, 70), "email", none).reasons).toContain("blocked");
    const ok = { ...l, blocked: false };
    expect(evaluateCandidate(ok, parseTargetFilters({}, 70), "email", { emails: new Set(["x@x.pt"]), phones: new Set() }).reasons).toContain("email_suppressed");
  });
  it("identidade estável para deduplicação", () => {
    expect(identityKey({ email: " A@B.PT " })).toBe("email:a@b.pt");
    expect(identityKey({ phone: "+351 912 345 678" })).toBe("phone:351912345678");
    expect(normalizePhone("912345678")).toBe(normalizePhone("00351912345678"));
    expect(identityKey({ leadId: "l1" })).toBe("lead:l1");
    expect(identityKey({})).toBeNull();
  });
});

describe("conteúdo", () => {
  it("variáveis por resolver bloqueiam", () => {
    const r = resolveStepContent({ id: "s", step_order: 1, channel: "email", subject: "Olá {{empresa}}", body_html: "x" }, {});
    expect(r).toEqual({ ok: false, reason: "unresolved_variables" });
  });
});

describe("contrato worker", () => {
  const secret = "x".repeat(40);
  const env = { enabled: "true", secret };
  const hdr = (h: Record<string, string>) => (n: string) => h[n] ?? null;
  it("assinatura válida é aceite", async () => {
    const h = await signWorkerRequest(secret, "ws", '{"a":1}');
    expect(await verifyWorkerRequest(hdr(h), '{"a":1}', env)).toEqual({ ok: true, workspaceId: "ws" });
  });
  it("corpo alterado, workspace trocado, expirada, ou modo desligado → recusado", async () => {
    const h = await signWorkerRequest(secret, "ws", '{"a":1}');
    expect((await verifyWorkerRequest(hdr(h), '{"a":2}', env)).ok).toBe(false);
    expect((await verifyWorkerRequest(hdr({ ...h, "x-fastcrm-worker-workspace": "other" }), '{"a":1}', env)).ok).toBe(false);
    expect((await verifyWorkerRequest(hdr(h), '{"a":1}', env, Date.now() + 200_000)).ok).toBe(false);
    expect(await verifyWorkerRequest(hdr(h), '{"a":1}', { enabled: undefined, secret })).toMatchObject({ ok: false, reason: "worker_mode_disabled", present: true });
    expect((await verifyWorkerRequest(hdr(h), '{"a":1}', { enabled: "true", secret: "curto" })).ok).toBe(false);
  });
  it("sem cabeçalho → present=false (fluxo manual com getUser mantém-se)", async () => {
    expect(await verifyWorkerRequest(() => null, "{}", env)).toMatchObject({ ok: false, present: false });
  });
});
