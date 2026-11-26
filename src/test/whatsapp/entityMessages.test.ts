import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  queries: [] as Array<{ table: string; filters: Record<string, unknown>; range?: number[] }>,
  user: { id: "jorge" } as { id: string } | null,
  phone: "+351915150880" as string | null,
  failure: false,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("@/contexts/WorkspaceContext", () => ({ useWorkspace: () => ({
  currentWorkspace: { id: "hub" }, workspaces: [{ id: "hub", name: "myMYA Hub" }, { id: "pare", name: "METODOPARE" }],
}) }));
vi.mock("@tanstack/react-query", () => ({ useQuery: (options: unknown) => options }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  const request = { table, filters: {} as Record<string, unknown>, range: undefined as number[] | undefined };
  state.queries.push(request);
  const chain = {
    select: () => chain,
    order: () => chain,
    eq: (key: string, value: unknown) => { request.filters[key] = value; return chain; },
    in: (key: string, value: unknown) => { request.filters[key] = value; return chain; },
    range: (start: number, end: number) => { request.range = [start, end]; return chain; },
    maybeSingle: () => chain,
    then: (resolve: (result: unknown) => unknown) => {
      if (table === "contacts" || table === "leads") return Promise.resolve(resolve({ data: { workspace_id: "hub", phone: state.phone }, error: null }));
      if (table === "conversations") return Promise.resolve(resolve({
        data: [{ id: "thread", workspace_id: "pare", channel: "whatsapp", status: "open", unread_count: 0 }],
        error: state.failure && request.filters.external_thread_id ? new Error("Access failed") : null,
      }));
      return Promise.resolve(resolve({ data: [
        { id: "new", content: "Obrigada", sent_at: "2026-11-26T10:14:39Z", direction: "inbound" },
        { id: "old", content: "Olá", sent_at: "2026-11-26T09:31:28Z", direction: "outbound" },
      ], error: null }));
    },
  };
  return chain;
} } }));
import { useEntityMessages } from "@/hooks/useEntityMessages";

function options(type: "lead" | "contact" = "contact") {
  return useEntityMessages(type, "karine") as unknown as { queryFn: () => Promise<Array<{ id: string; workspace_name: string; messages: Array<{ id: string }> }>>; enabled: boolean; queryKey: unknown[] };
}
beforeEach(() => { state.queries = []; state.phone = "+351915150880"; state.failure = false; state.user = { id: "jorge" }; });
describe("Histórico da Karine entre workspaces autorizados", () => {
  it.each(["lead", "contact"] as const)("%s resolve o número exato nos workspaces acessíveis, sem consulta global", async type => {
    await options(type).queryFn();
    const phoneQuery = state.queries.find(q => q.filters.external_thread_id);
    expect(phoneQuery?.filters.workspace_id).toEqual(["hub", "pare"]);
    expect(phoneQuery?.filters.channel).toBe("whatsapp");
    expect(phoneQuery?.filters.external_thread_id).toContain("351915150880");
  });
  it("deduplica a conversa e mantém as mensagens cronológicas, sem limite global", async () => {
    const result = await options().queryFn();
    expect(result).toHaveLength(1);
    expect(result[0].workspace_name).toBe("METODOPARE");
    expect(result[0].messages.map(m => m.id)).toEqual(["old", "new"]);
    expect(state.queries.find(q => q.table === "messages")?.range).toEqual([0, 99]);
  });
  it("sem telefone não pesquisa outras conversas", async () => {
    state.phone = null;
    await options().queryFn();
    expect(state.queries.filter(q => q.filters.external_thread_id)).toHaveLength(0);
  });
  it("falha de leitura não se apresenta como histórico vazio", async () => {
    state.failure = true;
    await expect(options().queryFn()).rejects.toThrow("Access failed");
  });
  it("sem sessão não consulta dados nem reutiliza a chave da sessão anterior", async () => {
    state.user = null;
    const query = options();
    expect(query.enabled).toBe(false);
    expect(await query.queryFn()).toEqual([]);
    expect(state.queries).toHaveLength(0);
    expect(query.queryKey[1]).toBeUndefined();
  });
});