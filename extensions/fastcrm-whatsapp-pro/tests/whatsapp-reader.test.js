import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readOpenChat } from "../lib/whatsapp-reader.js";

const require = createRequire(import.meta.url);
let JSDOM;
try { ({ JSDOM } = require("jsdom")); } catch { ({ JSDOM } = require("/dev-server/node_modules/jsdom")); }

function withHtml(html, fn) {
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`);
  globalThis.document = dom.window.document;
  try { return fn(); } finally { delete globalThis.document; }
}

const header = `<header><span dir="auto" title="Daniel Metodopare">Daniel Metodopare</span></header>`;

test("DOM clássico: data-pre-plain-text com marcas invisíveis, citações e áudios", () => {
  const html = `<div id="main">${header}
    <div role="row"><div data-id="false_351912345678@c.us_A" class="message-in">
      <div class="copyable-text" data-pre-plain-text="[\u200e18:18\u200e, \u200e30\u200e/\u200e10\u200e/\u200e2026] Daniel: ">
        <span dir="ltr" class="selectable-text copyable-text"><span>Então?</span></span>
      </div><span dir="auto">18:18</span></div></div>
    <div role="row"><div data-id="false_351912345678@c.us_AUD" class="message-in">
      <span data-icon="audio-play"></span><span dir="auto">0:13</span><span dir="auto">18:22</span></div></div>
    <div role="row"><div data-id="true_351912345678@c.us_B" class="message-out">
      <div class="copyable-text" data-pre-plain-text="[\u202f18:25, 30/10/2026] Eu: ">
        <div class="quoted-mention"><span class="selectable-text">mas quem ia fazer os videos?</span></div>
        <span dir="ltr" class="selectable-text copyable-text"><span>e sim tenho</span></span>
      </div></div></div>
  </div>`;
  const r = withHtml(html, readOpenChat);
  assert.equal(r.hasChat, true);
  assert.equal(r.chatName, "Daniel Metodopare");
  assert.equal(r.phone, "+351912345678");
  assert.deepEqual(r.messages.map((m) => [m.direction, m.text]), [["inbound", "Então?"], ["outbound", "e sim tenho"]]);
  const d = new Date(r.messages[0].sent_at);
  assert.equal(d.getHours(), 18);
  assert.equal(d.getDate(), 30);
  assert.equal(d.getMonth(), 9);
});

test("formato 12h com PM converte para 18h (mês/dia)", () => {
  const html = `<div id="main"><div data-id="false_351912345678@c.us_X" class="message-in">
    <div data-pre-plain-text="[6:18 PM, 10/30/2026] D: "><span class="selectable-text">ok</span></div></div></div>`;
  const r = withHtml(html, readOpenChat);
  const d = new Date(r.messages[0].sent_at);
  assert.equal(d.getHours(), 18);
  assert.equal(d.getDate(), 30);
});

test("DOM novo sem data-pre-plain-text nem message-in/out: usa linhas e ícones", () => {
  const html = `<div id="main">${header}
    <div role="row"><span>30/10/2026</span></div>
    <div role="row"><div><span data-icon="tail-in"></span><span dir="auto">Então?</span><span dir="auto">18:18</span></div></div>
    <div role="row"><div><span data-icon="tail-out"></span><span dir="ltr">primeiro tens de ter ata</span><span dir="auto">18:23</span><span data-icon="msg-dblcheck"></span></div></div>
    <div role="row"><div><span data-icon="tail-in"></span><span data-icon="audio-play"></span><span dir="auto">0:04</span><span dir="auto">18:25</span></div></div>
  </div>`;
  const r = withHtml(html, readOpenChat);
  assert.equal(r.diag.strategy, "rows");
  assert.deepEqual(r.messages.map((m) => [m.direction, m.text]), [["inbound", "Então?"], ["outbound", "primeiro tens de ter ata"]]);
  const d = new Date(r.messages[1].sent_at);
  assert.equal(d.getHours(), 18);
  assert.equal(d.getMinutes(), 23);
  assert.equal(d.getDate(), 30);
  assert.equal(r.phone, null);
});

test("ID privado @lid não inventa número", () => {
  const html = `<div id="main"><div data-id="true_123456789012345@lid_Z" class="message-out">
    <div data-pre-plain-text="[19:36, 30/10/2026] Eu: "><span class="selectable-text">mais ou menos sim</span></div></div></div>`;
  const r = withHtml(html, readOpenChat);
  assert.equal(r.messages.length, 1);
  assert.equal(r.messages[0].direction, "outbound");
  assert.equal(r.phone, null);
});

test("sem mensagens devolve diagnóstico só com contagens", () => {
  const r = withHtml(`<div id="main">${header}<div role="row"><span>Hoje</span></div></div>`, readOpenChat);
  assert.equal(r.messages.length, 0);
  assert.equal(r.diag.rows, 1);
  assert.equal(r.diag.meta, 0);
  assert.ok(!JSON.stringify(r.diag).includes("Hoje"));
});
