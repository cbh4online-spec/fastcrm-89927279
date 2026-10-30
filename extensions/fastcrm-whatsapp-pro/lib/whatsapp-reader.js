/**
 * Leitura da conversa aberta no WhatsApp Web (só leitura, nunca envia nada).
 * Injetada via chrome.scripting na aba do WhatsApp Web; tem de ser autocontida
 * (sem imports nem closures). Lê apenas mensagens de texto já mostradas no ecrã.
 * v0.7.1: aceita data antes/depois da hora e balões sem data-pre-plain-text.
 */
export function readOpenChat() {
  const MAX = 200;
  const INVISIBLE = /[\u200e\u200f\u202a-\u202e\u2066-\u2069\u202f\u00a0]/g;
  const clean = (s) => (s || "").replace(INVISIBLE, " ").replace(/\s+/g, " ").trim();
  const parseStamp = (meta) => {
    const s = clean(meta);
    const t = /(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])?\.?\s*m?\.?/i.exec(s);
    const dm = /(\d{1,4})[\/.-](\d{1,2})[\/.-](\d{2,4})/.exec(s);
    if (!t) return null;
    let hour = +t[1];
    const ampm = t[3];
    if (ampm) { const pm = ampm.toLowerCase() === "p"; if (pm && hour < 12) hour += 12; if (!pm && hour === 12) hour = 0; }
    const now = new Date();
    let day = now.getDate(), month = now.getMonth() + 1, year = now.getFullYear();
    if (dm) {
      let [, a, b, c] = dm;
      day = +a; month = +b; year = +c;
      if (a.length === 4) { year = +a; month = +b; day = +c; }
      else if (ampm && day <= 12 && month <= 31) { [day, month] = [month, day]; }
      if (year < 100) year += 2000;
      if (month > 12 && day <= 12) [day, month] = [month, day];
    }
    const d = new Date(year, month - 1, day, hour, +t[2]);
    return isNaN(d.getTime()) ? null : d;
  };
  const out = [];
  let phone = null;
  const main = document.querySelector("#main");
  const root = main || document;
  let bubbles = [...root.querySelectorAll(".message-in, .message-out")];
  if (!bubbles.length) bubbles = [...root.querySelectorAll("[data-pre-plain-text]")];
  const seen = new Set();
  for (const node of bubbles) {
    const metaEl = node.hasAttribute && node.hasAttribute("data-pre-plain-text") ? node : node.querySelector?.("[data-pre-plain-text]");
    const bubble = node.classList && (node.classList.contains("message-in") || node.classList.contains("message-out")) ? node : node.closest?.(".message-out, .message-in");
    const idEl = node.closest?.("[data-id]") || (node.querySelector?.("[data-id]"));
    const id = idEl ? idEl.getAttribute("data-id") || "" : "";
    let direction = bubble ? (bubble.classList.contains("message-out") ? "outbound" : "inbound") : null;
    if (!direction && /^(true|false)_/.test(id)) direction = id.startsWith("true_") ? "outbound" : "inbound";
    if (!direction) continue;
    const scope = metaEl || node;
    const textEl = scope.querySelector?.(".selectable-text, .copyable-text span[dir], span[dir='ltr'], span[dir='auto']");
    const text = clean(textEl ? textEl.innerText || textEl.textContent : "");
    if (!text) continue;
    const d = (metaEl && parseStamp(metaEl.getAttribute("data-pre-plain-text"))) || new Date();
    const key = id || `${direction}|${text}|${d.getTime()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!phone) {
      const pm = /_(\d{8,15})@c\.us/.exec(id);
      if (pm) phone = "+" + pm[1];
    }
    out.push({ direction, text: text.slice(0, 4000), sent_at: d.toISOString() });
  }
  const header = document.querySelector("#main header span[dir='auto']") || document.querySelector("#main header span[title]");
  const chatName = header ? clean(header.getAttribute("title") || header.textContent || "").slice(0, 120) : null;
  return { hasChat: !!main, phone, chatName, messages: out.slice(-MAX) };
}
