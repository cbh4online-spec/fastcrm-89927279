import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { requestServerAccess, isServerOriginRemoval, SERVER_ORIGIN_PATTERN } from "../lib/server-permission.js";

// Executa o painel real sem dependências DOM nem pedidos de rede.
const source = readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?$/gm, "");

async function harness({ configured = true, transportThrows = false, action = "btn-auth-login", statusThrows = false, permissions = "grant" } = {}) {
  const log = [];
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
  let removedListener = null;
  const context = vm.createContext({
    document: { getElementById: element, addEventListener() {} },
    Option: function(text, value) { this.text = text; this.value = value; },
    isOAuthConfigured: () => configured, isLookupReady: () => false,
    requestServerAccess, isServerOriginRemoval,
    chrome: {
      permissions: permissions === "missing" ? undefined : {
        request(arg) {
          log.push(["request", JSON.stringify(arg)]);
          if (permissions === "throw") throw new Error("sem gesto");
          if (permissions === "reject") return Promise.reject(new Error("x"));
          return Promise.resolve(permissions === "grant");
        },
        contains() { log.push(["contains"]); return Promise.resolve(true); },
        onRemoved: { addListener(fn) { log.push(["onRemoved"]); removedListener = fn; } },
      },
      runtime: {
      lastError: null,
      sendMessage(message, callback) {
        if (message.type === "AUTH_STATUS") {
          if (statusThrows) throw new Error("estado indisponível");
          return callback({ status: "disconnected" });
        }
        log.push(["send", message.type]);
        if (transportThrows) throw new Error("transporte inesperado");
        reply = callback;
      },
    } },
  });
  vm.runInContext(source, context, { filename: "sidepanel.js" });
  vm.runInContext("setupPermissionWatch()", context);
  await vm.runInContext("setupAuth()", context);
  vm.runInContext("setupPanelLookup()", context);
  if (action === "btn-panel-lookup") vm.runInContext('state.phone = "+351912345678"; state.workspaceId = "workspace-teste"', context);
  const button = element(action);
  const event = { currentTarget: button };
  const before = log.length;
  const completion = Promise.resolve(button.listeners.get("click")(event));
  const syncLog = log.slice(before); // tudo o que o handler fez antes do primeiro await
  // O Chrome limpa currentTarget ao terminar o dispatch, antes da resposta assíncrona.
  event.currentTarget = null;
  return { context, element, button, completion, log, syncLog, removed: (o) => removedListener(o), reply: (result) => reply?.(result) };
}

for (const action of ["btn-auth-logout", "btn-load-workspaces", "btn-panel-lookup"]) {
  test(`${action}: falha inesperada de transporte é tratada no handler real`, async () => {
    const h = await harness({ action, transportThrows: true });
    await assert.doesNotReject(h.completion);
    const feedback = h.element(action === "btn-auth-logout" ? "auth-feedback" : action === "btn-load-workspaces" ? "workspace-feedback" : "lookup-feedback");
    assert.ok(feedback.textContent.length > 0);
    if (action === "btn-load-workspaces") assert.equal(h.button.disabled, false);
    if (action === "btn-auth-logout") assert.equal(vm.runInContext("state.authStatus", h.context), "disconnected");
  });
}

test("estado inicial: transporte inesperado mantém o painel desligado e operacional", async () => {
  const h = await harness({ statusThrows: true });
  assert.equal(vm.runInContext("state.authStatus", h.context), "disconnected");
  await new Promise((r) => setImmediate(r)); // AUTH_START só depois da concessão
  h.reply({ status: "config_pending" });
  await assert.doesNotReject(h.completion);
  assert.equal(h.button.disabled, false);
});

for (const [name, result, configured, expectedStatus] of [
  ["sucesso", { status: "connected" }, true, "connected"],
  ["falha", { status: "disconnected", error: "rede_indisponivel" }, true, "disconnected"],
  ["cancelamento", { status: "disconnected", error: "autorizacao_cancelada" }, true, "disconnected"],
]) {
  test(`login real: currentTarget limpo; botão reativado após ${name}`, async () => {
    const h = await harness({ configured });
    assert.equal(h.button.disabled, true, "desativado enquanto aguarda");
    assert.deepEqual(h.syncLog, [["request", JSON.stringify({ origins: [SERVER_ORIGIN_PATTERN] })]], "request síncrono no gesto, antes de qualquer mensagem");
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(h.log.filter((l) => l[0] === "send").map((l) => l[1]).slice(-1), ["AUTH_START"]);
    h.reply(result);
    await assert.doesNotReject(h.completion);
    assert.equal(h.button.disabled, false);
    assert.equal(vm.runInContext("state.authStatus", h.context), expectedStatus);
    assert.ok(h.element("auth-feedback").textContent.length > 0);
  });
}

for (const configured of [true]) {
  test(`login real: transporte inesperado não rejeita; configuração ${configured}`, async () => {
    const unhandled = [];
    const onUnhandled = (error) => unhandled.push(error);
    process.on("unhandledRejection", onUnhandled);
    try {
      const h = await harness({ configured, transportThrows: true });
      await new Promise((r) => setImmediate(r));
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

test("cliente OAuth vazio: zero permissions.request e zero AUTH_START; estado config_pending", async () => {
  const h = await harness({ configured: false });
  await h.completion;
  await new Promise((r) => setImmediate(r));
  assert.equal(h.log.some((l) => l[0] === "request"), false);
  assert.equal(h.log.some((l) => l[1] === "AUTH_START"), false);
  assert.equal(vm.runInContext("state.authStatus", h.context), "config_pending");
  assert.equal(h.button.disabled, false);
  assert.match(h.element("auth-feedback").textContent, /ainda não está disponível/);
});

for (const permissions of ["deny", "reject", "throw", "missing"]) {
  test(`permissão ${permissions}: desligado, sem AUTH_START, feedback PT-PT, botão reativado, sem rejeição solta`, async () => {
    const unhandled = [];
    const onU = (e) => unhandled.push(e);
    process.on("unhandledRejection", onU);
    try {
      const h = await harness({ permissions });
      await assert.doesNotReject(h.completion);
      await new Promise((r) => setImmediate(r));
      assert.deepEqual(unhandled, []);
      assert.equal(h.log.some((l) => l[1] === "AUTH_START"), false);
      assert.equal(vm.runInContext("state.authStatus", h.context), "disconnected");
      assert.equal(h.button.disabled, false);
      assert.match(h.element("auth-feedback").textContent, /não autorizou/);
    } finally { process.off("unhandledRejection", onU); }
  });
}

test("DOMContentLoaded/estado/lookup nunca pedem permissão", async () => {
  const h = await harness({ action: "btn-panel-lookup" });
  await new Promise((r) => setImmediate(r));
  assert.equal(h.log.some((l) => l[0] === "request"), false);
});

test("revogação no Chrome limpa telefone/workspace e descarta resposta atrasada", async () => {
  const h = await harness({ action: "btn-panel-lookup" });
  await new Promise((r) => setImmediate(r));
  h.removed({ origins: ["https://outro.example/*"] });
  assert.equal(vm.runInContext("state.phone", h.context), "+351912345678", "outra origem não interfere");
  h.removed({ origins: [SERVER_ORIGIN_PATTERN] });
  assert.equal(vm.runInContext("state.phone", h.context), null);
  assert.equal(vm.runInContext("state.workspaceId", h.context), "");
  assert.equal(vm.runInContext("state.authStatus", h.context), "disconnected");
  h.reply({ ok: true, contacts: [{ id: "x", name: "Antigo" }], leads: [] });
  await h.completion;
  assert.equal(h.element("lookup-results").hidden, true);
  assert.match(h.element("auth-feedback").textContent, /retirado/);
});
