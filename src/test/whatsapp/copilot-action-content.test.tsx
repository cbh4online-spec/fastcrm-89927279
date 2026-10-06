import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import { CopilotActionContent } from "@/components/copilot/CopilotActionContent";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const message = "Olá, podemos falar sobre a proposta?";

function renderAction() {
  render(<MemoryRouter><CopilotActionContent content={`[[acao|contact:945bc9e1-9923-49eb-a964-8232770948e7|Contacto|912345678|${message}]]`} /></MemoryRouter>);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("WhatsApp do Copilot", () => {
  it("inicia a cópia da mensagem exata antes de abrir o link com o mesmo texto", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue({ writeText } as unknown as Clipboard);
    renderAction();
    const link = screen.getByRole("link", { name: "Enviar por WhatsApp" });
    const navigation = vi.fn((event: Event) => {
      expect(writeText).toHaveBeenCalledWith(message);
      event.preventDefault();
    });
    document.addEventListener("click", navigation, { once: true });
    fireEvent.click(link);
    expect(navigation).toHaveBeenCalledOnce();
    expect(link.getAttribute("href")).toBe(`https://wa.me/351912345678?text=${encodeURIComponent(message)}`);
    await waitFor(() => expect(toast.success).toHaveBeenCalledOnce());
  });

  it("não anuncia uma cópia bem-sucedida quando a permissão é recusada", async () => {
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue({ writeText: vi.fn().mockRejectedValue(new Error("NotAllowedError")) } as unknown as Clipboard);
    renderAction();
    fireEvent.click(screen.getByRole("button", { name: "Copiar mensagem" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledOnce());
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("não anuncia uma cópia bem-sucedida sem acesso à área de transferência", async () => {
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue(undefined as unknown as Clipboard);
    renderAction();
    fireEvent.click(screen.getByRole("button", { name: "Copiar mensagem" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledOnce());
    expect(toast.success).not.toHaveBeenCalled();
  });
});