import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mutateAsync = vi.fn();
let proActive = false;
vi.mock("@/hooks/useWhatsAppMessage", () => ({
  applyTemplateVariables: (s: string) => s,
  useEntityWhatsAppConversation: () => ({ data: null }),
  useGHLWhatsAppAvailable: () => ({ data: false }),
  useSendWhatsAppMessage: () => ({ mutateAsync, isPending: false }),
  WHATSAPP_MESSAGE_MAX_LENGTH: 4000,
}));
vi.mock("@/hooks/useWhatsAppPro", () => ({
  useWhatsAppProviderInstance: () => ({ data: proActive ? { active: true } : null, isLoading: false }),
  useWhatsAppProTemplates: () => ({ data: [] }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

import { WhatsAppMessageDialog } from "@/components/whatsapp/WhatsAppMessageDialog";

const renderDialog = (onSent: (i: { message: string }) => Promise<void>) =>
  render(
    <MemoryRouter>
      <WhatsAppMessageDialog open onOpenChange={() => {}} phone="+351912345678" entityType="lead" entityId="l1"
        initialMessage="Olá https://www.instagram.com/reel/X/" onSent={onSent} />
    </MemoryRouter>,
  );

describe("WhatsAppMessageDialog: aberto vs enviado", () => {
  beforeEach(() => { mutateAsync.mockReset(); mutateAsync.mockResolvedValue({}); proActive = false; vi.spyOn(window, "open").mockReturnValue(null); });

  it("abrir wa.me não regista envio nem chama onSent até «Já enviei»", async () => {
    const onSent = vi.fn().mockResolvedValue(undefined);
    renderDialog(onSent);
    fireEvent.click(await screen.findByRole("button", { name: "Abrir no WhatsApp" }));
    expect(window.open).toHaveBeenCalledTimes(1);
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(onSent).not.toHaveBeenCalled();
    await screen.findByText(/Ainda não foi registado nenhum envio/);
    fireEvent.click(screen.getByRole("button", { name: "Já enviei" }));
    await waitFor(() => expect(onSent).toHaveBeenCalledWith({ message: "Olá https://www.instagram.com/reel/X/", channel: "link" }));
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ channel: "link" }));
  });

  it("canal fornecedor: onSent só após sucesso e nunca reenvia se o registo falhar", async () => {
    proActive = true;
    const onSent = vi.fn().mockRejectedValueOnce(new Error("queue")).mockResolvedValueOnce(undefined);
    renderDialog(onSent);
    fireEvent.click(await screen.findByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    fireEvent.click(await screen.findByRole("button", { name: /Registar novamente/ }));
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(2));
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("falha do fornecedor não chama onSent", async () => {
    proActive = true;
    mutateAsync.mockRejectedValueOnce(new Error("down"));
    const onSent = vi.fn();
    renderDialog(onSent);
    fireEvent.click(await screen.findByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(onSent).not.toHaveBeenCalled();
  });
});
