import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

let ws = "ws-a";
const eqCalls: Array<[string, unknown]> = [];
const rows = [
  { id: "1", workspace_id: "ws-a", profile_id: "p1", step_index: 1, kind: "url", url: "https://a.pt/x" },
  { id: "2", workspace_id: "ws-b", profile_id: "p1", step_index: 2, kind: "url", url: "https://b.pt/y" },
];
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const q = {
        select: () => q,
        eq: (c: string, v: unknown) => { eqCalls.push([c, v]); return q; },
        in: () => Promise.resolve({ data: rows, error: null }),
      };
      return q;
    },
    storage: { from: () => ({}) },
  },
}));
vi.mock("@/contexts/WorkspaceContext", () => ({ useWorkspace: () => ({ currentWorkspace: { id: ws } }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));

import { useOutreachMedia } from "@/hooks/useOutreachMedia";

describe("useOutreachMedia", () => {
  it("filtra pelo workspace atual e por perfil/etapa, sem misturar", async () => {
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result, rerender } = renderHook(({ ids }) => useOutreachMedia(ids), { wrapper, initialProps: { ids: ["p1"] } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eqCalls).toContainEqual(["workspace_id", "ws-a"]);
    expect(result.current.get("p1", 1)?.url).toBe("https://a.pt/x");
    expect(result.current.get("p1", 2)).toBeNull(); // linha de outro workspace ignorada
    expect(result.current.get("p2", 1)).toBeNull();

    ws = "ws-b";
    rerender({ ids: ["p1"] });
    expect(result.current.get("p1", 1)).toBeNull(); // sem placeholder do workspace anterior
  });
});
