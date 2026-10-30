import { describe, it, expect, vi } from "vitest";
import { buildWhatsAppWebUrl, openWhatsAppChat, WHATSAPP_WEB_WINDOW_NAME } from "@/lib/whatsapp/openWhatsAppChat";

describe("openWhatsAppChat", () => {
  it("número PT sem indicativo ganha 351 e abre web.whatsapp.com", () => {
    expect(buildWhatsAppWebUrl("932 380 092", "Olá")).toBe("https://web.whatsapp.com/send?phone=351932380092&text=Ol%C3%A1");
  });
  it("número inválido não abre nada", () => {
    expect(buildWhatsAppWebUrl("123")).toBeNull();
  });
  it("reutiliza sempre o mesmo separador (nome fixo)", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    openWhatsAppChat("+351932380092");
    openWhatsAppChat("+351912345678");
    expect(open.mock.calls.every((c) => c[1] === WHATSAPP_WEB_WINDOW_NAME)).toBe(true);
  });
});
