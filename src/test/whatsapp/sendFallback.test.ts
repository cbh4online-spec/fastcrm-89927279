import { describe, it, expect } from "vitest";
import { readFunctionError, WhatsAppWebFallbackError } from "@/lib/whatsapp/sendFallback";

describe("readFunctionError", () => {
  it("extrai motivo e código do corpo JSON da resposta", async () => {
    const err = { message: "Edge Function returned a non-2xx status code", context: new Response(JSON.stringify({ error: "Canal inativo", code: "CHANNEL_NOT_ACTIVE" }), { status: 403 }) };
    expect(await readFunctionError(err, "x")).toEqual({ message: "Canal inativo", code: "CHANNEL_NOT_ACTIVE" });
  });
  it("usa o texto simples quando o corpo não é JSON", async () => {
    const err = { message: "non-2xx", context: new Response("Unauthorized", { status: 401 }) };
    expect((await readFunctionError(err, "x")).message).toBe("Unauthorized");
  });
});

describe("WhatsAppWebFallbackError", () => {
  it("guarda telefone e texto para abrir o WhatsApp Web", () => {
    const e = new WhatsAppWebFallbackError("351912345678", "teste", "linha desligada");
    expect(e.phone).toBe("351912345678");
    expect(e.text).toBe("teste");
  });
});
