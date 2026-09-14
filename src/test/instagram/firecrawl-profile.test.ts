import { describe, it, expect } from "vitest";
import {
  extractUsernameFromUrl,
  parseCount,
  parseInstagramMetaDescription,
} from "@/lib/instagram/instagramSearch";

describe("extractUsernameFromUrl", () => {
  it("aceita URLs de perfil", () => {
    expect(extractUsernameFromUrl("https://www.instagram.com/diogotricologia/")).toBe(
      "diogotricologia",
    );
  });

  it("rejeita publicações e caminhos reservados", () => {
    expect(extractUsernameFromUrl("https://www.instagram.com/p/Cabc123/")).toBeNull();
    expect(extractUsernameFromUrl("https://www.instagram.com/explore/tags/tricologia/")).toBeNull();
  });

  it("rejeita outros domínios", () => {
    expect(extractUsernameFromUrl("https://facebook.com/perfil")).toBeNull();
  });
});

describe("parseCount", () => {
  it("lê milhares e milhões", () => {
    expect(parseCount("12.3K")).toBe(12300);
    expect(parseCount("2M")).toBe(2_000_000);
    expect(parseCount("1,234")).toBe(1234);
  });

  it("devolve null para valores desconhecidos", () => {
    expect(parseCount("muitos")).toBeNull();
    expect(parseCount(null)).toBeNull();
  });
});

describe("parseInstagramMetaDescription", () => {
  it("lê métricas e nome em inglês", () => {
    const meta = parseInstagramMetaDescription(
      "12.3K Followers, 456 Following, 78 Posts - See Instagram photos and videos from Diogo Amorim (@diogotricologia)",
    );
    expect(meta.followers).toBe(12300);
    expect(meta.following).toBe(456);
    expect(meta.posts).toBe(78);
    expect(meta.fullName).toBe("Diogo Amorim");
  });

  it("não inventa nada quando a descrição está vazia", () => {
    const meta = parseInstagramMetaDescription(null, null);
    expect(meta).toEqual({ fullName: null, followers: null, following: null, posts: null });
  });
});
