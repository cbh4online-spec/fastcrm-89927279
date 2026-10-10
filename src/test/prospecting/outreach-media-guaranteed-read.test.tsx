import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

let listResult: () => Promise<{ data: unknown; error: unknown }>;
let singleResult: () => Promise<{ data: unknown; error: unknown }>;
const chain = () => {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "update", "delete", "upsert"]) c[m] = () => c;
  c.in = () => listResult();
  c.maybeSingle = () => singleResult();
  return c;
};
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => chain(), storage: { from: () => ({}) } } }));
vi.mock("@/contexts/WorkspaceContext", () => ({ useWorkspace: () => ({ currentWorkspace: { id: "w1" } }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));

import { useOutreachMedia, MEDIA_READ_FAILED_MESSAGE } from "@/hooks/useOutreachMedia";

const row = { id: "m1", workspace_id: "w1", profile_id: "p1", step_index: 1, kind: "url", url: "https://www.instagram.com/reel/ABC/", label: null, storage_path: null, mime_type: null, size_bytes: null, url_expires_at: null, created_by: "u1" };
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

describe("useOutreachMedia.ensureFresh: leitura garantida", () => {
  beforeEach(() => {
    listResult = () => new Promise(() => {}); // a cache nunca chega a carregar
    singleResult = async () => ({ data: row, error: null });
  });

  it("clique imediato com conteúdo pré-existente: devolve a ligação guardada mesmo com a cache pendente", async () => {
    const { result } = renderHook(() => useOutreachMedia(["p1"]), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.get("p1", 1)).toBeNull();
    await expect(result.current.ensureFresh("p1", 1)).resolves.toMatchObject({ url: row.url });
  });

  it("erro de leitura falha fechado (nunca «sem conteúdo»)", async () => {
    singleResult = async () => ({ data: null, error: { message: "boom" } });
    const { result } = renderHook(() => useOutreachMedia(["p1"]), { wrapper });
    await expect(result.current.ensureFresh("p1", 1)).rejects.toThrow(MEDIA_READ_FAILED_MESSAGE);
  });

  it("erro na lista expõe isError para o aviso do seletor", async () => {
    listResult = async () => ({ data: null, error: { message: "boom" } });
    const { result } = renderHook(() => useOutreachMedia(["p1"]), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
