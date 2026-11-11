import { describe, it, expect } from "vitest";
import { toWascriptPhone, parseWascriptInbound, mapWascriptError, wascriptKind } from "../../../supabase/functions/_shared/wascript";

describe("WAScript", () => {
  it("adiciona 351 a números PT de 9 dígitos", () => {
    expect(toWascriptPhone("912 345 678")).toBe("351912345678");
    expect(toWascriptPhone("+351912345678")).toBe("351912345678");
    expect(toWascriptPhone("00351912345678")).toBe("351912345678");
    expect(toWascriptPhone("123")).toBeNull();
  });
  it("mensagem enviada por nós nunca é tratada como recebida", () => {
    expect(parseWascriptInbound({ numero: "351912345678", mensagem: "olá", fromMe: true }).fromMe).toBe(true);
    expect(parseWascriptInbound({ data: { phone: "351912345678@c.us", message: "oi" } }).fromMe).toBe(false);
  });
  it("ignora grupos", () => {
    expect(parseWascriptInbound({ from: "12036302@g.us", text: "x" }).isGroup).toBe(true);
  });
  it("WhatsApp Web fechado dá mensagem clara", () => {
    expect(mapWascriptError(501).code).toBe("WASCRIPT_OFFLINE");
    expect(mapWascriptError(404).code).toBe("WASCRIPT_TOKEN_INVALID");
  });
  it("escolhe o tipo de envio pelo anexo", () => {
    expect(wascriptKind("text")).toBe("texto");
    expect(wascriptKind("document", "application/pdf")).toBe("documento");
    expect(wascriptKind("image")).toBe("imagem");
  });
});

import { buildLabelActions, parseWascriptLabels, isWascriptOfflineError } from "../../../supabase/functions/_shared/wascript";
describe("WAScript etiquetas e sessão", () => {
  it("monta ações add/remove sem duplicados", () => {
    expect(buildLabelActions("351912345678", ["1", "1", "2"], ["2", "3"])).toEqual({
      phone: ["351912345678"], actions: [{ labelId: "1", type: "add" }, { labelId: "2", type: "add" }, { labelId: "3", type: "remove" }],
    });
  });
  it("lê etiquetas e ignora cores inválidas", () => {
    expect(parseWascriptLabels({ etiquetas: [{ id: "5", name: "Cliente", hexColor: "red", count: 2 }, { name: "sem id" }] }))
      .toEqual([{ id: "5", name: "Cliente", hexColor: null, count: 2 }]);
  });
  it("erro 501 conta como WhatsApp Web fechado", () => {
    expect(isWascriptOfflineError(mapWascriptError(501).message)).toBe(true);
    expect(isWascriptOfflineError(mapWascriptError(404).message)).toBe(false);
  });
});
