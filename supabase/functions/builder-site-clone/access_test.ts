// Testes de acesso ao edge function builder-site-clone.
// Mockam fetch global para simular Supabase Auth + REST + RPC e validar que
// owner / member / super_admin passam o gate, e que não-membros são bloqueados
// com o código USER_NOT_MEMBER.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "https://stub.supabase.co");
Deno.env.set("SUPABASE_ANON_KEY", "anon-key");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-key");

const { handleClone } = await import("./index.ts");

const WORKSPACE_ID = "11111111-1111-1111-1111-111111111111";
const OWNER_ID = "00000000-0000-0000-0000-00000000aaaa";
const MEMBER_ID = "00000000-0000-0000-0000-00000000bbbb";
const STRANGER_ID = "00000000-0000-0000-0000-00000000cccc";
const SUPER_ID = "00000000-0000-0000-0000-00000000dddd";

interface Scenario {
  userId: string;
  isMember?: boolean;
  memberRole?: string;
  isSuper?: boolean;
}

function installFetchMock(s: Scenario) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: Request | URL | string, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    // auth.getUser → /auth/v1/user
    if (url.includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: s.userId, email: "x@x.pt", aud: "authenticated" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // workspaces lookup
    if (url.includes("/rest/v1/workspaces")) {
      return new Response(
        JSON.stringify([{ id: WORKSPACE_ID, owner_id: OWNER_ID, deleted_at: null }]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // workspace_members lookup
    if (url.includes("/rest/v1/workspace_members")) {
      const body = s.isMember
        ? [{ role: s.memberRole ?? "member" }]
        : [];
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // RPC is_super_admin
    if (url.includes("/rest/v1/rpc/is_super_admin")) {
      return new Response(JSON.stringify(!!s.isSuper), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unmocked", url }), { status: 500 });
  }) as typeof fetch;
  return () => { globalThis.fetch = original; };
}

function buildReq(): Request {
  return new Request("https://stub.local/builder-site-clone", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer fake-jwt",
    },
    // pages: [] → garante que se passar o gate de acesso, sai em NO_PAGES (400)
    // em vez de tentar inserir/scrapar. Permite isolar a decisão de acesso.
    body: JSON.stringify({
      workspace_id: WORKSPACE_ID,
      source_url: "https://example.com",
      pages: [],
    }),
  });
}

async function runScenario(s: Scenario): Promise<{ status: number; code?: string }> {
  const restore = installFetchMock(s);
  try {
    const res = await handleClone(buildReq());
    const body = await res.json().catch(() => ({}));
    return { status: res.status, code: body?.code };
  } finally {
    restore();
  }
}

Deno.test({ name: "owner passa o gate de acesso (NO_PAGES, não USER_NOT_MEMBER)", sanitizeOps: false, sanitizeResources: false }, async () => {
  const r = await runScenario({ userId: OWNER_ID });
  assertEquals(r.status, 400);
  assertEquals(r.code, "NO_PAGES");
});

Deno.test({ name: "membro com role 'member' passa o gate", sanitizeOps: false, sanitizeResources: false }, async () => {
  const r = await runScenario({ userId: MEMBER_ID, isMember: true, memberRole: "member" });
  assertEquals(r.status, 400);
  assertEquals(r.code, "NO_PAGES");
});

Deno.test({ name: "admin do workspace passa o gate", sanitizeOps: false, sanitizeResources: false }, async () => {
  const r = await runScenario({ userId: MEMBER_ID, isMember: true, memberRole: "admin" });
  assertEquals(r.status, 400);
  assertEquals(r.code, "NO_PAGES");
});

Deno.test({ name: "super_admin externo ao workspace passa o gate", sanitizeOps: false, sanitizeResources: false }, async () => {
  const r = await runScenario({ userId: SUPER_ID, isSuper: true });
  assertEquals(r.status, 400);
  assertEquals(r.code, "NO_PAGES");
});

Deno.test({ name: "não-membro é bloqueado com USER_NOT_MEMBER", sanitizeOps: false, sanitizeResources: false }, async () => {
  const r = await runScenario({ userId: STRANGER_ID });
  assertEquals(r.status, 403);
  assertEquals(r.code, "USER_NOT_MEMBER");
});

Deno.test({ name: "sem Authorization devolve 401", sanitizeOps: false, sanitizeResources: false }, async () => {
  const restore = installFetchMock({ userId: STRANGER_ID });
  try {
    const req = new Request("https://stub.local/builder-site-clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: WORKSPACE_ID, source_url: "https://x.pt", pages: [] }),
    });
    const res = await handleClone(req);
    assertEquals(res.status, 401);
    await res.text();
  } finally {
    restore();
  }
});
