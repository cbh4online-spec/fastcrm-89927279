import { describe, it, expect } from "vitest";
import { instagramEnrichmentUsername } from "../enrichTarget";

describe("instagramEnrichmentUsername", () => {
  it.each(["https://instagram.com/reel/ABC", "https://www.instagram.com/reel/ABC/", "https://evilinstagram.com/joao", "https://instagram.com.evil.com/joao", "https://instagram.com/p/XYZ"])(
    "não pede enriquecimento para %s", (u) => expect(instagramEnrichmentUsername("instagram", u)).toBeNull());
  it("aceita perfil válido", () => expect(instagramEnrichmentUsername("instagram", "https://www.instagram.com/joao.silva/")).toBe("joao.silva"));
  it("outra plataforma", () => expect(instagramEnrichmentUsername("linkedin", "https://instagram.com/joao")).toBeNull());
});
