import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const ws = "6e874265-fce7-4a8f-8e95-542bd89dd713";
const rpc = vi.fn();
const from = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...a: unknown[]) => rpc(...a),
    from: (...a: unknown[]) => from(...a),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
  },
}));
vi.mock("@/contexts/WorkspaceContext", () => ({ useWorkspace: () => ({ currentWorkspace: { id: ws } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

import { CreateLeadModal } from "@/components/instagram-looter/CreateLeadModal";

function renderModal(profileId?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CreateLeadModal open onOpenChange={() => {}} profile={{ username: "joana.silva", full_name: "Joana Silva" }} insight={null} profileId={profileId} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const createButton = () => screen.getByRole("button", { name: /Criar Lead/ });

describe("CreateLeadModal", () => {
  beforeEach(() => { rpc.mockReset(); from.mockReset(); });

  it("bloqueia correspondência forte e mostra link para o registo", async () => {
    rpc.mockResolvedValue({ data: { status: "exists", matches: [{ entity_type: "contact", entity_id: "c1", name: "Joana", field: "profile", strength: "strong", blocked: false, opportunity_id: null }] }, error: null });
    renderModal();
    await screen.findByText(/Já é contacto/);
    expect(screen.getByRole("link", { name: /Abrir registo existente/ })).toHaveAttribute("href", "/dashboard/contacts/c1");
    expect(createButton()).toBeDisabled();
    expect(rpc).toHaveBeenCalledWith("prospecting_identity_check", expect.objectContaining({ p_workspace_id: ws, p_profile_id: null }));
    expect(from).not.toHaveBeenCalledWith("leads");
  });

  it("bloqueia «Não contactar» e oportunidade em curso", async () => {
    rpc.mockResolvedValue({ data: { status: "blocked", matches: [{ entity_type: "lead", entity_id: "l1", name: "J", field: "phone", strength: "strong", blocked: true, opportunity_id: null }] }, error: null });
    renderModal();
    await screen.findByText(/Não contactar\./);
    expect(createButton()).toBeDisabled();
  });

  it("possível duplicado exige confirmação explícita e usa a RPC segura", async () => {
    rpc.mockImplementation((name: string) => Promise.resolve(name === "prospecting_identity_check"
      ? { data: { status: "review", matches: [{ entity_type: "lead", entity_id: "l2", name: "Joana Silva", field: "name", strength: "possible", blocked: false, opportunity_id: null }] }, error: null }
      : { data: { status: "created", lead_id: "new-lead", matches: [] }, error: null }));
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "igp1" } });
    const insert = vi.fn().mockResolvedValue({ error: null });
    from.mockImplementation((t: string) => t === "ig_profiles"
      ? { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle }) }) }) }
      : { insert });
    renderModal("igp1");
    await screen.findByText(/Possível duplicado\./);
    expect(createButton()).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /entidade diferente/ }));
    await waitFor(() => expect(createButton()).toBeEnabled());
    fireEvent.click(createButton());
    await waitFor(() => expect(insert).toHaveBeenCalled());
    const importCall = rpc.mock.calls.find((c) => c[0] === "prospecting_import_lead_safe")!;
    expect(importCall[1]).toMatchObject({ p_workspace_id: ws, p_profile_id: null, p_allow_possible: true });
    expect(importCall[1].p_lead).toMatchObject({ source: "instagram_looter", instagram_url: "https://www.instagram.com/joana.silva" });
    expect(insert.mock.calls[0][0]).toMatchObject({ workspace_id: ws, profile_id: "igp1", crm_lead_id: "new-lead" });
    expect(from).not.toHaveBeenCalledWith("leads");
  });

  it("não associa o perfil quando o servidor não confirma o lead", async () => {
    rpc.mockImplementation((name: string) => Promise.resolve(name === "prospecting_identity_check"
      ? { data: { status: "new", matches: [] }, error: null }
      : { data: { status: "exists", matches: [{ entity_type: "lead", entity_id: "l9", name: "J", field: "profile", strength: "strong", blocked: false, opportunity_id: null }] }, error: null }));
    renderModal("igp1");
    await screen.findByText(/^Novo\./);
    fireEvent.click(createButton());
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("prospecting_import_lead_safe", expect.anything()));
    await screen.findByText(/Já é lead/);
    expect(from).not.toHaveBeenCalled();
  });
});
