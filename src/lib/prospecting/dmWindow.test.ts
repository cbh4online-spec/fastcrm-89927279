import { describe, it, expect, vi, beforeEach } from "vitest";
const warning = vi.fn(); const error = vi.fn();
vi.mock("sonner", () => ({ toast: { warning: (...a: unknown[]) => warning(...a), error: (...a: unknown[]) => error(...a) } }));
import { reserveDmWindow, finishDmOpen } from "./dmWindow";

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
