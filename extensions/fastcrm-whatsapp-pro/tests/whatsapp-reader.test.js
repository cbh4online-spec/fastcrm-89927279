import { test } from "node:test";
import assert from "node:assert/strict";
import { readOpenChat } from "../lib/whatsapp-reader.js";

function row(meta, text, out, id) {
  const bubble = { classList: { contains: (c) => c === (out ? "message-out" : "message-in") } };
  const idEl = { getAttribute: () => id };
  return {
    getAttribute: () => meta,
    closest: (sel) => (sel.includes("message-") ? bubble : sel === "[data-id]" ? idEl : null),
    querySelector: () => ({ innerText: text }),
  };
}

function withDom(rows, fn) {
  const main = { querySelectorAll: () => rows };
  globalThis.document = {
    querySelector: (s) => (s === "#main" ? main : s.startsWith("#main header") ? { getAttribute: () => null, textContent: "Daniel Metodopare" } : null),
  };
  try { return fn(); } finally { delete globalThis.document; }
}

test("lê mensagens com marcas Unicode invisíveis do WhatsApp Web", () => {
  const r = withDom([
    row("[\u200e18:18\u200e, \u200e30\u200e/\u200e10\u200e/\u200e2026] Daniel: ", "Então?", false, "false_351912345678@c.us_ABC"),
    row("[\u202f18:02, 30/10/2026] Eu: ", "mais ou menos", true, "true_351912345678@c.us_DEF"),
  ], readOpenChat);
  assert.equal(r.hasChat, true);
  assert.equal(r.messages.length, 2);
  assert.equal(r.messages[0].direction, "inbound");
  assert.equal(r.messages[1].direction, "outbound");
  assert.equal(r.phone, "+351912345678");
  assert.equal(r.chatName, "Daniel Metodopare");
  assert.equal(new Date(r.messages[0].sent_at).getHours(), 18);
});

test("formato 12h com PM converte para 18h", () => {
  const r = withDom([row("[6:18 PM, 10/30/2026] D: ", "ok", false, "false_351912345678@c.us_X")], readOpenChat);
  const d = new Date(r.messages[0].sent_at);
  assert.equal(d.getHours(), 18);
  assert.equal(d.getDate(), 30);
});

test("aceita data antes da hora e balões message-in/out", () => {
  const mk = (out, meta, text, id) => {
    const metaEl = { getAttribute: () => meta, hasAttribute: () => true, querySelector: () => ({ innerText: text }) };
    return {
      classList: { contains: (c) => c === (out ? "message-out" : "message-in") },
      hasAttribute: () => false,
      querySelector: (s) => (s === "[data-pre-plain-text]" ? metaEl : s === "[data-id]" ? null : null),
      closest: (s) => (s === "[data-id]" ? { getAttribute: () => id } : null),
    };
  };
  const main = { querySelectorAll: (s) => (s.includes("message-") ? [mk(false, "[30/10/2026, 18:18] Daniel: ", "Então?", "false_351912345678@c.us_A"), mk(true, "[30/10/2026, 18:25] Eu: ", "e sim tenho", "true_351912345678@c.us_B")] : []) };
  globalThis.document = { querySelector: (s) => (s === "#main" ? main : null) };
  try {
    const r = readOpenChat();
    assert.equal(r.messages.length, 2);
    assert.equal(r.messages[1].direction, "outbound");
    assert.equal(new Date(r.messages[0].sent_at).getHours(), 18);
    assert.equal(r.phone, "+351912345678");
  } finally { delete globalThis.document; }
});
