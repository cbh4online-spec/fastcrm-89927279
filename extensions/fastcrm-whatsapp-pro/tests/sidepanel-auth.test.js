import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Executa o painel real sem dependências DOM nem pedidos de rede.
const source = readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?$/gm, "");

async function harness({ configured = true, transportThrows = false } = {}) {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, {
      disabled: false, hidden: false, value: "", textContent: "", className: "",
      listeners: new Map(), replaceChildren() {},
      addEventListener(type, handler) { this.listeners.set(type, handler); },
    });
    return elements.get(id);
  };
  let reply;
  const context = vm.createContext({
    document: { getElementById: element, addEventListener() {} },
    Option: function(text, value) { this.text = text; this.value = value; },
    isOAuthConfigured: () => configured, isLookupReady: () => false,
    chrome: { runtime: {
      lastError: null,
      sendMessage(message, callback) {
        if (message.type === "AUTH_STATUS") return callback({ status: "disconnected" });
        if (transportThrows) throw new Error("transporte inesperado");
        reply = callback;
      },
    } },
  });
  vm.runInContext(source, context, { filename: "sidepanel.js" });
  await vm.runInContext("setupAuth()", context);
  const button = element("btn-auth-login");
  const event = { currentTarget: button };
  const completion = button.listeners.get("click")(event);
  // O Chrome limpa currentTarget ao terminar o dispatch, antes da resposta assíncrona.
  event.currentTarget = null;
  return { context, element, button, completion, reply: (result) => reply(result) };
}

for (const [name, result, configured, expectedStatus] of [
  ["sucesso", { status: "connected" }, true, "connected"],
  ["falha", { status: "disconnected", error: "rede_indisponivel" }, true, "disconnected"],
  ["cancelamento", { status: "disconnected", error: "autorizacao_cancelada" }, true, "disconnected"],
  ["configuração pendente", { status: "config_pending" }, false, "config_pending"],
]) {
  test(`login real: currentTarget limpo; botão reativado após ${name}`, async () => {
    const h = await harness({ configured });
    assert.equal(h.button.disabled, true, "desativado enquanto AUTH_START aguarda resposta");
    h.reply(result);
    await assert.doesNotReject(h.completion);
    assert.equal(h.button.disabled, false);
    assert.equal(vm.runInContext("state.authStatus", h.context), expectedStatus);
    assert.ok(h.element("auth-feedback").textContent.length > 0);
  });
}

for (const configured of [true, false]) {
  test(`login real: transporte inesperado não rejeita; configuração ${configured}`, async () => {
    const unhandled = [];
    const onUnhandled = (error) => unhandled.push(error);
    process.on("unhandledRejection", onUnhandled);
    try {
      const h = await harness({ configured, transportThrows: true });
      await assert.doesNotReject(h.completion);
      await new Promise((resolve) => setImmediate(resolve));
      assert.deepEqual(unhandled, []);
      assert.equal(h.button.disabled, false);
      assert.equal(vm.runInContext("state.authStatus", h.context), configured ? "disconnected" : "config_pending");
      assert.equal(h.element("auth-feedback").className, "feedback feedback-error");
      assert.equal(h.element("auth-feedback").textContent, "Não foi possível ligar. Tente novamente.");
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });
}