import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveWorkspaceTarget,
  type ControlPlaneConfig,
  type ResolveTargetDeps,
  type WorkspaceInstanceData,
} from "@/lib/workspaceInstanceResolver";

// Sentinelas — usamos referências distintas como "clientes" para detectar leaks.
const mainClient = { __id: "MAIN" } as any;
const t1Client = { __id: "T1" } as any;
const t2Client = { __id: "T2" } as any;

function makeDeps(overrides: Partial<ResolveTargetDeps> = {}): ResolveTargetDeps {
  return {
    callControlPlane: vi.fn(async () => null),
    fetchLocalInstance: vi.fn(async () => null),
    createClient: vi.fn((url: string) => {
      if (url.includes("t1")) return t1Client;
      if (url.includes("t2")) return t2Client;
      return { __id: `dyn:${url}` } as any;
    }),
    mainClient,
    ...overrides,
  };
}

const cpEnabled: ControlPlaneConfig = {
  enabled: true,
  url: "https://control-plane.example",
};

describe("resolveWorkspaceTarget — routing multi-tenant via Control Plane", () => {
  beforeEach(() => vi.clearAllMocks());

  it("usa a URL/key devolvida pelo Control Plane para o workspace pedido", async () => {
    const deps = makeDeps({
      callControlPlane: vi.fn(async (_cfg, _wsId) => ({
        success: true,
        workspace: {
          id: "inst-1",
          status: "active" as const,
          supabase_url: "https://t1.supabase.co",
          supabase_anon_key: "anon-t1",
        },
      })),
    });

    const r = await resolveWorkspaceTarget("ws-1", cpEnabled, deps);

    expect(deps.callControlPlane).toHaveBeenCalledWith(cpEnabled, "ws-1");
    expect(deps.createClient).toHaveBeenCalledWith("https://t1.supabase.co", "anon-t1");
    expect(r.client).toBe(t1Client);
    expect(r.source).toBe("control-plane");
    expect(r.instance?.supabase_url).toBe("https://t1.supabase.co");
  });

  it("workspaces diferentes recebem clientes diferentes — SEM cross-tenant leak", async () => {
    const cp = vi.fn(async (_cfg: ControlPlaneConfig, wsId: string) => ({
      success: true,
      workspace:
        wsId === "ws-1"
          ? {
              id: "inst-1",
              status: "active" as const,
              supabase_url: "https://t1.supabase.co",
              supabase_anon_key: "anon-t1",
            }
          : {
              id: "inst-2",
              status: "active" as const,
              supabase_url: "https://t2.supabase.co",
              supabase_anon_key: "anon-t2",
            },
    }));
    const deps = makeDeps({ callControlPlane: cp });

    const r1 = await resolveWorkspaceTarget("ws-1", cpEnabled, deps);
    const r2 = await resolveWorkspaceTarget("ws-2", cpEnabled, deps);

    expect(r1.client).toBe(t1Client);
    expect(r2.client).toBe(t2Client);
    expect(r1.client).not.toBe(r2.client);
    expect(r1.instance?.supabase_url).not.toBe(r2.instance?.supabase_url);
  });

  it("workspace SUSPENSO via Control Plane NUNCA recebe cliente do tenant — devolve mainClient", async () => {
    const deps = makeDeps({
      callControlPlane: vi.fn(async () => ({
        success: true,
        workspace: {
          id: "inst-x",
          status: "suspended" as const,
          supabase_url: "https://t1.supabase.co",
          supabase_anon_key: "anon-t1",
        },
      })),
    });

    const r = await resolveWorkspaceTarget("ws-sus", cpEnabled, deps);

    expect(r.client).toBe(mainClient);
    expect(r.client).not.toBe(t1Client);
    expect(r.status).toBe("suspended");
    expect(r.source).toBe("main-fallback");
    expect(deps.createClient).not.toHaveBeenCalled();
  });

  it("workspace INACTIVO via Control Plane também cai para mainClient", async () => {
    const deps = makeDeps({
      callControlPlane: vi.fn(async () => ({
        success: true,
        workspace: {
          id: "inst-x",
          status: "inactive" as const,
          supabase_url: "https://t1.supabase.co",
          supabase_anon_key: "anon-t1",
        },
      })),
    });

    const r = await resolveWorkspaceTarget("ws-i", cpEnabled, deps);
    expect(r.client).toBe(mainClient);
    expect(r.status).toBe("inactive");
  });

  it("Control Plane com erro NÃO faz fallback para tenant aleatório nem para local", async () => {
    const localSpy = vi.fn(async () => ({
      id: "x",
      workspace_id: "ws-1",
      supabase_url: "https://t2.supabase.co",
      supabase_anon_key: "anon-t2",
      status: "active" as const,
      metadata: {},
    }));
    const deps = makeDeps({
      callControlPlane: vi.fn(async () => ({ success: false, error: "boom" })),
      fetchLocalInstance: localSpy,
    });

    const r = await resolveWorkspaceTarget("ws-1", cpEnabled, deps);

    expect(r.client).toBe(mainClient);
    expect(r.source).toBe("main-fallback");
    expect(r.error).toBe("boom");
    // Quando Control Plane está activo e falha, NÃO consultamos o local —
    // evita servir um tenant antigo/errado por desincronização.
    expect(localSpy).not.toHaveBeenCalled();
  });

  it("sem Control Plane configurado, usa workspace_instances local do workspace pedido", async () => {
    const local: WorkspaceInstanceData = {
      id: "loc-1",
      workspace_id: "ws-1",
      supabase_url: "https://t1.supabase.co",
      supabase_anon_key: "anon-t1",
      status: "active" as const,
      metadata: {},
    };
    const deps = makeDeps({
      fetchLocalInstance: vi.fn(async (id) => (id === "ws-1" ? local : null)),
    });

    const r = await resolveWorkspaceTarget("ws-1", null, deps);

    expect(r.source).toBe("local");
    expect(r.client).toBe(t1Client);
  });

  it("sem Control Plane e sem registo local, devolve mainClient (estado pré-tenant)", async () => {
    const deps = makeDeps();
    const r = await resolveWorkspaceTarget("ws-novo", null, deps);
    expect(r.client).toBe(mainClient);
    expect(r.source).toBe("main-fallback");
  });

  it("workspaceId vazio devolve mainClient sem chamar Control Plane nem DB local", async () => {
    const deps = makeDeps();
    const r = await resolveWorkspaceTarget("", cpEnabled, deps);
    expect(r.client).toBe(mainClient);
    expect(deps.callControlPlane).not.toHaveBeenCalled();
    expect(deps.fetchLocalInstance).not.toHaveBeenCalled();
  });

  it("Control Plane DESACTIVADO (enabled=false) ignora-o e usa apenas o fallback local", async () => {
    const cp = vi.fn(async () => ({ success: true, workspace: undefined }));
    const local: WorkspaceInstanceData = {
      id: "loc-1",
      workspace_id: "ws-1",
      supabase_url: "https://t1.supabase.co",
      supabase_anon_key: "anon-t1",
      status: "active" as const,
      metadata: {},
    };
    const deps = makeDeps({
      callControlPlane: cp,
      fetchLocalInstance: vi.fn(async () => local),
    });

    const r = await resolveWorkspaceTarget("ws-1", { enabled: false, url: "x" }, deps);

    expect(cp).not.toHaveBeenCalled();
    expect(r.source).toBe("local");
    expect(r.client).toBe(t1Client);
  });

  it("troca de workspace recria o cliente apropriado em cada chamada (sem memória cruzada)", async () => {
    let i = 0;
    const deps = makeDeps({
      callControlPlane: vi.fn(async (_c, wsId) => ({
        success: true,
        workspace: {
          id: `inst-${++i}`,
          status: "active" as const,
          supabase_url: wsId === "ws-A" ? "https://t1.supabase.co" : "https://t2.supabase.co",
          supabase_anon_key: wsId === "ws-A" ? "anon-t1" : "anon-t2",
        },
      })),
    });

    const a = await resolveWorkspaceTarget("ws-A", cpEnabled, deps);
    const b = await resolveWorkspaceTarget("ws-B", cpEnabled, deps);
    const a2 = await resolveWorkspaceTarget("ws-A", cpEnabled, deps);

    expect(a.client).toBe(t1Client);
    expect(b.client).toBe(t2Client);
    expect(a2.client).toBe(t1Client);
    expect(a.instance?.supabase_url).not.toBe(b.instance?.supabase_url);
  });
});
