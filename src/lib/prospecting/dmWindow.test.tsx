import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { buildDmUrl, parseInstagramProfileUsername, safeDmUrl, tryCopyText } from "./dmWindow";
import { PreparedDmPanel } from "@/components/professional-prospecting/PreparedDmPanel";

beforeEach(() => { vi.restoreAllMocks(); });

const bad = ["javascript:alert(1)", "data:text/html,<script>1</script>", "http://ig.me/m/x", "", "   ",
  "file:///etc/passwd", "https://user:pw@ig.me/m/x", "https://evil.com/ig.me", "https://instagram.com.evil.com/x", "https://ig.me:8443/m/x"];

describe("validação de ligação da DM", () => {
  it.each(bad)("rejeita %s", (url) => {
    expect(safeDmUrl(url)).toBeNull();
    expect(buildDmUrl(url)).toBeNull();
  });
  it("aceita https do Instagram/ig.me e rejeita username malicioso", () => {
    expect(safeDmUrl("https://ig.me/m/abc")).toBe("https://ig.me/m/abc");
  });
  it.each([
    "https://evilinstagram.com/joao", "https://instagram.com.evil.com/joao", "https://ig.me/m/joao",
    "http://instagram.com/joao", "https://instagram.com/reel/ABC", "https://instagram.com/reels/ABC",
    "https://www.instagram.com/p/ABC/", "https://instagram.com/stories/joao/123", "https://instagram.com/explore",
    "https://instagram.com/direct/inbox", "https://instagram.com/accounts/login", "https://instagram.com/reel",
    "https://instagram.com/p", "https://instagram.com/joao/reels", "https://instagram.com/", "https://user@instagram.com/joao",
    "https://instagram.com:444/joao", "https://instagram.com/jo..ao", "javascript:alert(1)",
  ])("origem que não é perfil %s: sem DM", (src) => {
    expect(parseInstagramProfileUsername(src)).toBeNull();
    expect(buildDmUrl(src)).toBeNull();
  });
  it.each([
    ["https://instagram.com/joao", "joao"], ["https://www.instagram.com/Joao.Silva_/", "joao.silva_"],
    ["https://m.instagram.com/joao?hl=pt", "joao"],
  ])("perfil válido %s", (src, user) => {
    expect(buildDmUrl(src)).toBe(`https://ig.me/m/${user}`);
  });
});

describe("cópia", () => {
  it("falha do clipboard devolve false sem lançar", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("NotAllowed")) } });
    await expect(tryCopyText("x")).resolves.toBe(false);
  });
});

describe("PreparedDmPanel", () => {
  const base = { text: "Olá https://ig.me/v", mediaUrl: null, dmUrl: "https://ig.me/m/abc", copied: false };

  it("clipboard falhado: mostra texto exato selecionável e permite copiar com novo clique", async () => {
    const writeText = vi.fn().mockRejectedValueOnce(new Error("NotAllowed")).mockResolvedValueOnce(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const onCopied = vi.fn();
    render(<PreparedDmPanel prepared={base} onCopied={onCopied} onOpened={vi.fn()} />);
    expect((screen.getByLabelText("Mensagem preparada") as HTMLTextAreaElement).value).toBe(base.text);
    expect(screen.getByRole("status")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Copiar/ }));
    await waitFor(() => expect(onCopied).toHaveBeenLastCalledWith(false));
    fireEvent.click(screen.getByRole("button", { name: /Copiar/ }));
    await waitFor(() => expect(onCopied).toHaveBeenLastCalledWith(true));
    expect(writeText).toHaveBeenCalledWith(base.text);
  });

  it("link real com href validado; só o clique marca aberto; sem about:blank", () => {
    const open = vi.spyOn(window, "open");
    const onOpened = vi.fn();
    render(<PreparedDmPanel prepared={base} onCopied={vi.fn()} onOpened={onOpened} />);
    const link = screen.getByRole("link", { name: /Abrir conversa/ });
    expect(link.getAttribute("href")).toBe("https://ig.me/m/abc");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(onOpened).not.toHaveBeenCalled();
    fireEvent.click(link);
    expect(onOpened).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
  });

  it.each(bad)("URL inválido %s: sem link e sem marcar aberto", (url) => {
    const onOpened = vi.fn();
    render(<PreparedDmPanel prepared={{ ...base, dmUrl: url }} onCopied={vi.fn()} onOpened={onOpened} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(onOpened).not.toHaveBeenCalled();
  });
});
