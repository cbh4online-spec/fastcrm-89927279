import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { authorizeDispatchCall } from "../../../supabase/functions/whatsapp-pro-sequence-dispatch/dispatchAuth";
import { signWorkerRequest } from "../../../supabase/functions/_shared/sdr-engine/workerAuth";

const SR = "service-role-key-0123456789abcdef";
const SECRET = "w".repeat(40);
const env = { serviceRoleKey: SR, workerEnabled: "true", workerSecret: SECRET };
const hdr = (h: Record<string, string>) => (n: string) => h[n.toLowerCase()] ?? null;
const USER_JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQifQ.sig";

describe("whatsapp-pro-sequence-dispatch — autenticação interna", () => {
  it("anónimo (sem Authorization) → 401", async () => {
    expect(await authorizeDispatchCall(hdr({}), "{}", env)).toMatchObject({ ok: false, status: 401 });
  });
  it("Authorization mal formado → 401", async () => {
    expect(await authorizeDispatchCall(hdr({ authorization: SR }), "{}", env)).toMatchObject({ ok: false, status: 401 });
  });
  it("JWT de utilizador comum → 403", async () => {
    expect(await authorizeDispatchCall(hdr({ authorization: `Bearer ${USER_JWT}` }), "{}", env)).toMatchObject({ ok: false, status: 403, reason: "not_internal_caller" });
  });
  it("anon key → 403", async () => {
    expect(await authorizeDispatchCall(hdr({ authorization: "Bearer anon-key-abcdefghijklmnopqrstuvwxyz" }), "{}", env)).toMatchObject({ ok: false, status: 403 });
  });
  it("service role com assinatura inválida → 401", async () => {
    const r = await authorizeDispatchCall(hdr({ authorization: `Bearer ${SR}`, "x-fastcrm-worker-signature": "00", "x-fastcrm-worker-ts": String(Date.now()), "x-fastcrm-worker-workspace": "ws" }), "{}", env);
    expect(r).toMatchObject({ ok: false, status: 401, reason: "bad_worker_signature" });
  });
  it("service role com assinatura expirada → 401", async () => {
    const h = await signWorkerRequest(SECRET, "ws", "{}", Date.now() - 10 * 60_000);
    const r = await authorizeDispatchCall(hdr({ authorization: `Bearer ${SR}`, ...h }), "{}", env);
    expect(r).toMatchObject({ ok: false, status: 401, reason: "stale_worker_signature" });
  });
  it("assinatura presente com modo worker desligado → 401", async () => {
    const h = await signWorkerRequest(SECRET, "ws", "{}");
    expect(await authorizeDispatchCall(hdr({ authorization: `Bearer ${SR}`, ...h }), "{}", { ...env, workerEnabled: undefined })).toMatchObject({ ok: false, status: 401 });
  });
  it("servidor sem service role configurada → 401 (fail-closed)", async () => {
    expect(await authorizeDispatchCall(hdr({ authorization: `Bearer ${SR}` }), "{}", { ...env, serviceRoleKey: undefined })).toMatchObject({ ok: false, status: 401 });
  });
  it("cron interno com service role → autorizado", async () => {
    expect(await authorizeDispatchCall(hdr({ authorization: `Bearer ${SR}` }), "{}", env)).toEqual({ ok: true });
  });
  it("cron interno com service role + assinatura válida → autorizado", async () => {
    const h = await signWorkerRequest(SECRET, "ws", "{}");
    expect(await authorizeDispatchCall(hdr({ authorization: `Bearer ${SR}`, ...h }), "{}", env)).toEqual({ ok: true });
  });
  it("handler autentica antes de criar o cliente service_role e antes de qualquer mutação", () => {
    const src = readFileSync("supabase/functions/whatsapp-pro-sequence-dispatch/index.ts", "utf8");
    const body = src.slice(src.indexOf("Deno.serve("));
    const auth = body.indexOf("authorizeDispatchCall(");
    expect(auth).toBeGreaterThan(0);
    for (const later of ["createClient(", ".from(", ".rpc(", "fetch(", "PHASE1_WA_SEQUENCE_AUTONOMOUS_BLOCKED) {"]) {
      const i = body.indexOf(later);
      if (i >= 0) expect(i).toBeGreaterThan(auth);
    }
    expect(body.slice(auth, body.indexOf("createClient("))).toMatch(/status: f\.status/);
  });
});
