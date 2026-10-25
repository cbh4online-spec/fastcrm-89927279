import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WhatsAppProContactLookup from "./WhatsAppProContactLookup";

const state = vi.hoisted(() => ({
  auth: { user: { id: "user" } as { id: string } | null, loading: false },
  workspace: { currentWorkspace: { id: "ws-a", name: "Workspace A" } as { id: string; name: string } | null, loading: false },
  instance: { workspaceClient: {}, instanceData: null, isLoading: false, error: null as string | null, workspaceStatus: "active" },
  canRead: true,
  query: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => state.auth }));
vi.mock("@/contexts/WorkspaceContext", () => ({ useWorkspace: () => state.workspace }));
vi.mock("@/contexts/WorkspaceInstanceContext", () => ({ useWorkspaceInstance: () => state.instance }));
vi.mock("@/hooks/useCapability", () => ({ useCapability: () => state.canRead }));
vi.mock("@/components/layout/DashboardLayout", () => ({ DashboardLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("./lookup", async importOriginal => ({ ...await importOriginal<typeof import("./lookup")>(), queryLookup: state.query }));

const mount = () => render(<MemoryRouter><WhatsAppProContactLookup /></MemoryRouter>);
const submit = () => {
  fireEvent.change(screen.getByLabelText("Número de telefone"), { target: { value: "912345678" } });
  fireEvent.click(screen.getByRole("button", { name: "Pesquisar" }));
};
const row = { id: "contact-a", workspace_id: "ws-a", name: "Resultado A", phone: "+351912345678", whatsapp_number: null, company: null };
const response = () => ({ contacts: { data: [row, { ...row, id: "foreign", workspace_id: "ws-b", name: "Outro workspace" }], error: null }, leads: { data: [], error: null } });

describe("pesquisa web", () => {
  beforeEach(() => {
    state.auth = { user: { id: "user" }, loading: false };
    state.workspace = { currentWorkspace: { id: "ws-a", name: "Workspace A" }, loading: false };
    state.instance.isLoading = false;
    state.instance.error = null;
    state.instance.workspaceStatus = "active";
    state.canRead = true;
    state.query.mockReset();
    state.query.mockResolvedValue(response());
  });
  it("consulta apenas após clique e nunca apresenta registos de outro workspace", async () => {
    mount();
    expect(state.query).not.toHaveBeenCalled();
    submit();
    await screen.findByText("Resultado A");
    expect(state.query).toHaveBeenCalledWith(state.instance.workspaceClient, "ws-a", "+351912345678", expect.any(AbortSignal));
    expect(screen.queryByText("Outro workspace")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir ficha" })).toHaveAttribute("href", "/dashboard/contacts/contact-a");
  });
  it("limpa telefone e ignora respostas atrasadas após mudar workspace", async () => {
    let resolve: (value: ReturnType<typeof response>) => void = () => {};
    state.query.mockReturnValue(new Promise(r => { resolve = r; }));
    const view = mount();
    submit();
    state.workspace.currentWorkspace = { id: "ws-b", name: "Workspace B" };
    view.rerender(<MemoryRouter><WhatsAppProContactLookup /></MemoryRouter>);
    await act(async () => { resolve(response()); });
    expect(screen.getByLabelText("Número de telefone")).toHaveValue("");
    expect(screen.queryByText("Resultado A")).not.toBeInTheDocument();
  });
  it("bloqueia pesquisa quando a instância está a carregar ou em erro", () => {
    state.instance.error = "resolution_failed";
    mount();
    expect(screen.getByRole("button", { name: "Pesquisar" })).toBeDisabled();
    expect(state.query).not.toHaveBeenCalled();
  });
  it("não monta pesquisa sem capability crm.read", () => {
    state.canRead = false;
    mount();
    expect(screen.queryByRole("button", { name: "Pesquisar" })).not.toBeInTheDocument();
    expect(state.query).not.toHaveBeenCalled();
  });
  it("uma falha de leitura não é tratada como zero resultados", async () => {
    state.query.mockResolvedValue({ contacts: { data: null, error: { message: "denied" } }, leads: { data: [], error: null } });
    mount();
    submit();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível consultar contactos"));
  });
});