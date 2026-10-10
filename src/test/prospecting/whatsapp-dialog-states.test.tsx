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

const VIDEO = "https://cdn.example.com/v.mp4?token=abc";
const renderDialog = (onSent: (i: { message: string }) => Promise<void>, requiredLink: string | null = null) =>
  render(
    <MemoryRouter>
      <WhatsAppMessageDialog open onOpenChange={() => {}} phone="+351912345678" entityType="lead" entityId="l1"
        initialMessage="Olá https://www.instagram.com/reel/X/" onSent={onSent} requiredLink={requiredLink} />
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
    await waitFor(() => expect(onSent).toHaveBeenCalledWith({ message: "Olá https://www.instagram.com/reel/X/", channel: "link", linkIncluded: false }));
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

  it("resposta rápida apaga o texto, mas o URL congelado volta a entrar uma vez e conta como incluído", async () => {
    const onSent = vi.fn().mockResolvedValue(undefined);
    renderDialog(onSent, VIDEO);
    const quick = (await screen.findByRole("group", { name: /Respostas rápidas/ })).querySelector("button")!;
    fireEvent.click(quick);
    fireEvent.click(screen.getByRole("button", { name: "Abrir no WhatsApp" }));
    const opened = decodeURIComponent(String((window.open as unknown as { mock: { calls: string[][] } }).mock.calls[0][0]));
    expect(opened.split(VIDEO).length - 1).toBe(1);
    fireEvent.click(await screen.findByRole("button", { name: "Já enviei" }));
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
    const arg = onSent.mock.calls[0][0];
    expect(arg.linkIncluded).toBe(true);
    expect(arg.message.split(VIDEO).length - 1).toBe(1);
  });

  it("editar depois de abrir limpa o estado «aberto»", async () => {
    const onSent = vi.fn().mockResolvedValue(undefined);
    renderDialog(onSent);
    fireEvent.click(await screen.findByRole("button", { name: "Abrir no WhatsApp" }));
    await screen.findByRole("button", { name: "Já enviei" });
    fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: "Outro texto" } });
    expect(screen.queryByRole("button", { name: "Já enviei" })).toBeNull();
    expect(screen.getByRole("button", { name: "Abrir no WhatsApp" })).toBeTruthy();
    expect(onSent).not.toHaveBeenCalled();
  });

  it("assistido: fila confirmada antes da atividade; falha da atividade não repete nada", async () => {
    const order: string[] = [];
    const onSent = vi.fn(async () => { order.push("queue"); });
    mutateAsync.mockImplementation(async () => { order.push("activity"); throw new Error("act"); });
    renderDialog(onSent);
    fireEvent.click(await screen.findByRole("button", { name: "Abrir no WhatsApp" }));
    fireEvent.click(await screen.findByRole("button", { name: "Já enviei" }));
    await waitFor(() => expect(order).toEqual(["queue", "activity"]));
    expect(onSent).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("assistido: se a fila falhar, a atividade message_sent não é gravada", async () => {
    const onSent = vi.fn().mockRejectedValue(new Error("queue"));
    renderDialog(onSent);
    fireEvent.click(await screen.findByRole("button", { name: "Abrir no WhatsApp" }));
    fireEvent.click(await screen.findByRole("button", { name: "Já enviei" }));
    await waitFor(() => expect(onSent).toHaveBeenCalled());
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("modo prospeção (assistedOnly): nunca oferece envio direto, mesmo com canal ligado", async () => {
    proActive = true;
    const onSent = vi.fn();
    render(
      <MemoryRouter>
        <WhatsAppMessageDialog open onOpenChange={() => {}} phone="+351912345678" entityType="lead" entityId="l1"
          initialMessage="Olá" onSent={onSent} assistedOnly />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("button", { name: "Abrir no WhatsApp" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Enviar" })).toBeNull();
    expect(screen.queryByText("FastCRM WhatsApp")).toBeNull();
    expect(screen.queryByText("WhatsApp (GHL)")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Abrir no WhatsApp" }));
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(onSent).not.toHaveBeenCalled();
  });
});

describe("Painel de prospeção", () => {
  it("abre sempre o diálogo WhatsApp em modo assistido (sem provider)", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/professional-prospecting/PendingOutreachPanel.tsx", "utf8");
    const uses = src.match(/<WhatsAppMessageDialog[\s\S]*?\/>/g) ?? [];
    expect(uses.length).toBeGreaterThan(0);
    for (const u of uses) expect(u).toMatch(/\bassistedOnly\b(?!=\{false\})/);
    const all = (await import("node:child_process")).execSync("rg -l WhatsAppMessageDialog src/components/professional-prospecting src/pages/Prospecting* src/components/prospecting || true").toString().trim().split("\n").filter(Boolean);
    for (const f of all) {
      const code = readFileSync(f, "utf8");
      for (const u of code.match(/<WhatsAppMessageDialog[\s\S]*?\/>/g) ?? []) expect(u).toMatch(/\bassistedOnly\b/);
    }
  });
});
