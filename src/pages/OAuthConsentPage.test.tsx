import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OAuthConsentPage from "./OAuthConsentPage";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  oauth: {
    getAuthorizationDetails: vi.fn(),
    approveAuthorization: vi.fn(),
    denyAuthorization: vi.fn(),
  },
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));

const mount = (query = "?authorization_id=pilot-request") => render(
  <MemoryRouter initialEntries={[`/.lovable/oauth/consent${query}`]}><OAuthConsentPage /></MemoryRouter>,
);
const details = (scope?: string) => ({ data: { client: { name: "FastCRM WhatsApp Pro" }, scope }, error: null });

describe("Consentimento OAuth", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.history.replaceState({}, "", "/.lovable/oauth/consent?authorization_id=pilot-request");
    auth.getSession.mockResolvedValue({ data: { session: {} }, error: null });
    auth.oauth.getAuthorizationDetails.mockResolvedValue(details("email"));
    auth.oauth.approveAuthorization.mockResolvedValue({ data: { redirect_url: "#approved" }, error: null });
    auth.oauth.denyAuthorization.mockResolvedValue({ data: { redirect_url: "#denied" }, error: null });
  });

  it.each([
    ["email", "Endereço de email"],
    ["profile", "Informações do perfil"],
    ["phone", "Número de telefone"],
    ["openid", "Identificação da conta (OpenID)"],
  ])("interpreta o scope singular %s", async (scope, label) => {
    auth.oauth.getAuthorizationDetails.mockResolvedValue(details(scope));
    mount();
    expect(await screen.findByText(label, { exact: false })).toBeInTheDocument();
    expect(auth.oauth.getAuthorizationDetails).toHaveBeenCalledWith("pilot-request");
  });

  it("separa por espaços, remove duplicados e apresenta scopes desconhecidos como texto", async () => {
    auth.oauth.getAuthorizationDetails.mockResolvedValue(details(" email\tprofile email <img/src=x/onerror=alert(1)> "));
    const { container } = mount();
    await screen.findByText("<img/src=x/onerror=alert(1)>");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(container.querySelector("img")).toBeNull();
  });

  it("não interpreta o nome do cliente como HTML", async () => {
    auth.oauth.getAuthorizationDetails.mockResolvedValue({ data: { client: { name: "<script>unsafe</script>" }, scope: "email" }, error: null });
    const { container } = mount();
    await screen.findByRole("heading", { name: "Ligar <script>unsafe</script> ao FastCRM" });
    expect(container.querySelector("script")).toBeNull();
  });

  it("não inventa scopes quando o campo singular está ausente", async () => {
    auth.oauth.getAuthorizationDetails.mockResolvedValue(details());
    mount();
    await screen.findByRole("button", { name: "Autorizar" });
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it.each(["returned", "thrown"])("não expõe erros de carregamento %s", async mode => {
    if (mode === "returned") auth.oauth.getAuthorizationDetails.mockResolvedValue({ data: null, error: { message: "private-server-details" } });
    else auth.oauth.getAuthorizationDetails.mockRejectedValue(new Error("private-server-details"));
    mount();
    await screen.findByRole("alert");
    expect(screen.queryByText(/private-server-details/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Autorizar" })).not.toBeInTheDocument();
  });

  it("preserva o redirect do SDK sem cliente para consentimento já concedido", async () => {
    auth.oauth.getAuthorizationDetails.mockResolvedValue({ data: { redirect_url: "#already-granted" }, error: null });
    mount();
    await waitFor(() => expect(window.location.hash).toBe("#already-granted"));
    expect(auth.oauth.approveAuthorization).not.toHaveBeenCalled();
  });

  it.each([["Autorizar", "approveAuthorization", "#approved"], ["Recusar", "denyAuthorization", "#denied"]] as const)("%s usa a API existente", async (label, method, hash) => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: label }));
    await waitFor(() => expect(window.location.hash).toBe(hash));
    expect(auth.oauth[method]).toHaveBeenCalledWith("pilot-request");
  });

  it.each(["approveAuthorization", "denyAuthorization"] as const)("oculta erro bruto em %s", async method => {
    auth.oauth[method].mockRejectedValue(new Error("private-decision-details"));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: method === "approveAuthorization" ? "Autorizar" : "Recusar" }));
    await screen.findByRole("alert");
    expect(screen.queryByText(/private-decision-details/)).not.toBeInTheDocument();
  });

  it("não consulta pedidos sem authorization_id", async () => {
    mount("");
    await screen.findByRole("alert");
    expect(auth.getSession).not.toHaveBeenCalled();
    expect(auth.oauth.getAuthorizationDetails).not.toHaveBeenCalled();
  });
});