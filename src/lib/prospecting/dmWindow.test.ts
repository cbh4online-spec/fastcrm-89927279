import { describe, it, expect, vi, beforeEach } from "vitest";
const warning = vi.fn(); const error = vi.fn();
vi.mock("sonner", () => ({ toast: { warning: (...a: unknown[]) => warning(...a), error: (...a: unknown[]) => error(...a) } }));
import { reserveDmWindow, finishDmOpen, openDmDirect, safeDmUrl } from "./dmWindow";

beforeEach(() => { warning.mockReset(); error.mockReset(); vi.restoreAllMocks(); });

describe("abertura de DM", () => {
  it("popup bloqueado: não marca aberto e só o clique explícito bem-sucedido ativa a confirmação", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const onOpened = vi.fn();
    expect(finishDmOpen(reserveDmWindow(), "https://ig.me/m/x", onOpened)).toBe(false);
    expect(onOpened).not.toHaveBeenCalled();
    const action = warning.mock.calls[0][1].action;
    action.onClick(); // continua bloqueado
    expect(onOpened).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    open.mockReturnValue({ opener: null } as unknown as Window);
    action.onClick();
    expect(onOpened).toHaveBeenCalledTimes(1);
  });

  it("janela reservada no clique é encaminhada só depois das verificações", () => {
    const replace = vi.fn();
    const win = { closed: false, opener: {}, location: { replace }, close: vi.fn() } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(win);
    const reserved = reserveDmWindow();
    expect(window.open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(replace).not.toHaveBeenCalled();
    const onOpened = vi.fn();
    expect(finishDmOpen(reserved, "https://ig.me/m/x", onOpened)).toBe(true);
    expect(replace).toHaveBeenCalledWith("https://ig.me/m/x");
    expect(onOpened).toHaveBeenCalled();
  });

  it("janela fechada pelo utilizador antes do fim: não confirma", () => {
    const win = { closed: true, location: { replace: vi.fn() }, close: vi.fn() } as unknown as Window;
    const onOpened = vi.fn();
    expect(finishDmOpen(win, "https://ig.me/m/x", onOpened)).toBe(false);
    expect(onOpened).not.toHaveBeenCalled();
  });
});

describe("validação de ligação da DM", () => {
  const bad = ["javascript:alert(1)", "data:text/html,<script>1</script>", "http://ig.me/m/x", "", "   ",
    "file:///etc/passwd", "https://user:pw@ig.me/m/x", "https://evil.com/ig.me", "https://instagram.com.evil.com/x", "https://ig.me:8443/m/x"];
  it.each(bad)("rejeita %s: fecha janela, não navega nem marca aberto", (url) => {
    const replace = vi.fn(); const close = vi.fn();
    const win = { closed: false, location: { replace }, close } as unknown as Window;
    const open = vi.spyOn(window, "open");
    const onOpened = vi.fn();
    expect(safeDmUrl(url)).toBeNull();
    expect(finishDmOpen(win, url, onOpened)).toBe(false);
    expect(replace).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
    expect(onOpened).not.toHaveBeenCalled();
    expect(warning).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    expect(openDmDirect(url)).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
  it("aceita https do Instagram/ig.me", () => {
    expect(safeDmUrl("https://ig.me/m/abc")).toBe("https://ig.me/m/abc");
    expect(safeDmUrl("https://www.instagram.com/abc/")).toBe("https://www.instagram.com/abc/");
  });
});
