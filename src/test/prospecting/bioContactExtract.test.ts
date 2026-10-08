import { describe, it, expect } from "vitest";
import { extractBioContacts, isSafePublicUrl } from "../../../supabase/functions/_shared/bioContactExtract";

describe("extractBioContacts", () => {
  it("lê o número de um botão wa.me", () => {
    expect(extractBioContacts('<a href="https://wa.me/351913428951">WhatsApp</a>').phone).toBe("351913428951");
  });
  it("lê api.whatsapp.com com phone=", () => {
    expect(extractBioContacts('<a href="https://api.whatsapp.com/send?phone=351925990000&amp;text=Ola">').phone).toBe("351925990000");
  });
  it("número PT de 9 dígitos em tel: recebe prefixo 351", () => {
    expect(extractBioContacts('<a href="tel:913 428 951">Ligar</a>').phone).toBe("351913428951");
  });
  it("não inventa contactos quando não existem", () => {
    expect(extractBioContacts("<p>Ligue-nos 2023</p>")).toEqual({ phone: null, email: null });
  });
  it("lê email de mailto e ignora emails técnicos", () => {
    expect(extractBioContacts('<a href="mailto:Geral@Clinica.pt">').email).toBe("geral@clinica.pt");
    expect(extractBioContacts('<a href="mailto:noreply@site.pt">').email).toBeNull();
  });
});

describe("isSafePublicUrl", () => {
  it("rejeita endereços internos e IPs", () => {
    expect(isSafePublicUrl("http://localhost/x")).toBe(false);
    expect(isSafePublicUrl("http://169.254.169.254/")).toBe(false);
    expect(isSafePublicUrl("ftp://site.pt")).toBe(false);
    expect(isSafePublicUrl("https://linktr.ee/clinica")).toBe(true);
  });
});
