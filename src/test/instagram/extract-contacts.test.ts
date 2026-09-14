import { describe, it, expect } from "vitest";
import { extractContactsFromBio } from "@/lib/instagram/extractContacts";

describe("extractContactsFromBio", () => {
  it("extrai email da bio", () => {
    expect(extractContactsFromBio("Contacte GERAL@Clinica.PT").email).toBe("geral@clinica.pt");
  });
  it("extrai telefone nacional PT", () => {
    expect(extractContactsFromBio("Marcações 912 345 678").phone).toBe("+351912345678");
  });
  it("extrai telefone de link wa.me", () => {
    const r = extractContactsFromBio("Fala comigo", "https://wa.me/351912345678");
    expect(r.phone).toBe("+351912345678");
    expect(r.source).toBe("whatsapp_link");
  });
  it("não inventa dados", () => {
    const r = extractContactsFromBio("Desde 2019 a cuidar de ti");
    expect(r.email).toBeNull();
    expect(r.phone).toBeNull();
    expect(r.source).toBeNull();
  });
});
