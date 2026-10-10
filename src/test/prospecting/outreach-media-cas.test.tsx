import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const reads: unknown[] = [];
const updates: unknown[][] = [];
const updateFilters: Record<string, unknown>[] = [];
const chain = () => {
  let isUpdate = false;
  const filters: Record<string, unknown> = {};
  const c: Record<string, unknown> = {};
  c.select = () => (isUpdate ? Promise.resolve({ data: updates.shift() ?? [], error: null }) : c);
  c.update = () => { isUpdate = true; updateFilters.push(filters); return c; };
  c.eq = (k: string, v: unknown) => { filters[k] = v; return c; };
  c.in = () => new Promise(() => {});
  c.maybeSingle = () => Promise.resolve({ data: reads.shift() ?? null, error: null });
  return c;
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => chain(),
    storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: "https://s.example/new?t=1" }, error: null }) }) },
  },
}));
vi.mock("@/contexts/WorkspaceContext", () => ({ useWorkspace: () => ({ currentWorkspace: { id: "w1" } }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));

import { useOutreachMedia } from "@/hooks/useOutreachMedia";

const base = { id: "m1", workspace_id: "w1", profile_id: "p1", step_index: 1, label: null, mime_type: "video/mp4", size_bytes: 10, created_by: "u2" };
const expiring = { ...base, kind: "video", url: "https://s.example/old", storage_path: "w1/u2/a.mp4", url_expires_at: new Date(Date.now() + 1000).toISOString(), updated_at: "2026-10-10T10:00:00Z" };
const replaced = { ...base, kind: "url", url: "https://www.instagram.com/reel/NEW/", storage_path: null, mime_type: null, url_expires_at: null, updated_at: "2026-10-10T10:00:05Z" };
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

describe("ensureFresh compare-and-swap", () => {
  it("se outro membro substituiu entre leitura e escrita, usa a linha atual e nunca o ficheiro antigo", async () => {
    reads.push(expiring, replaced);
    updates.push([]); // CAS: 0 linhas
    const { result } = renderHook(() => useOutreachMedia(["p1"]), { wrapper });
    const out = await result.current.ensureFresh("p1", 1);
    expect(out?.url).toBe(replaced.url);
    expect(out?.storage_path).toBeNull();
    expect(updateFilters[0]).toMatchObject({ kind: "video", storage_path: "w1/u2/a.mp4", url: "https://s.example/old", updated_at: "2026-10-10T10:00:00Z" });
  });

  it("sem concorrência renova a ligação", async () => {
    reads.push(expiring);
    updates.push([{ id: "m1" }]);
    const { result } = renderHook(() => useOutreachMedia(["p1"]), { wrapper });
    await expect(result.current.ensureFresh("p1", 1)).resolves.toMatchObject({ url: "https://s.example/new?t=1" });
  });
});
