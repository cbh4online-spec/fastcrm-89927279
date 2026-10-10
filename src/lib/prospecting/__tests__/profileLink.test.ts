import { describe, it, expect } from "vitest";
import { safeProfileLink } from "../profileLink";

describe("safeProfileLink", () => {
  it.each(["javascript:alert(1)", "data:text/html,x", "http://instagram.com/joao", "https://evilinstagram.com/joao",
    "https://instagram.com.evil.com/joao", "https://instagram.com/reel/ABC", "https://instagram.com/p/ABC/", "https://instagram.com/stories/joao/1", "", null])(
    "Instagram rejeita %s", (u) => expect(safeProfileLink("instagram", u)).toBeNull());
  it("Instagram aceita perfil e devolve https canónico", () => {
    expect(safeProfileLink("instagram", "https://m.instagram.com/Joao.Silva?hl=pt")).toBe("https://www.instagram.com/joao.silva/");
  });
  it.each(["javascript:alert(1)", "http://linkedin.com/in/x", "https://u:p@linkedin.com/in/x"])("outra rede rejeita %s", (u) =>
    expect(safeProfileLink("linkedin", u)).toBeNull());
  it("outra rede aceita https", () => expect(safeProfileLink("linkedin", "https://www.linkedin.com/in/x")).toBe("https://www.linkedin.com/in/x"));
});
