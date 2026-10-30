/**
 * Leitura da conversa aberta no WhatsApp Web (só leitura, nunca envia nada).
 * Injetada via chrome.scripting na aba do WhatsApp Web; tem de ser autocontida
 * (sem imports nem closures). Lê apenas mensagens de texto já mostradas no ecrã.
 */
export function readOpenChat() {
  const MAX = 200;
  const INVISIBLE = /[\u200e\u200f\u202a-\u202e\u2066-\u2069\u202f\u00a0]/g;
  const out = [];
  let phone = null;
  const main = document.querySelector("#main") || document;
  const rows = main.querySelectorAll("[data-pre-plain-text]");
  for (const el of rows) {
    const meta = (el.getAttribute("data-pre-plain-text") || "").replace(INVISIBLE, " ").replace(/\s+/g, " ").trim();
    const m = /^\[\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])?\.?\s*m?\.?\s*,\s*(\d{1,4})[\/.-](\d{1,2})[\/.-](\d{2,4})\s*\]/i.exec(meta);
    if (!m) continue;
    let [, hh, mm, ampm, a, b, c] = m;
    let hour = +hh;
    if (ampm) { const pm = ampm.toLowerCase() === "p"; if (pm && hour < 12) hour += 12; if (!pm && hour === 12) hour = 0; }
    let day = +a, month = +b, year = +c;
    if (a.length === 4) { year = +a; month = +b; day = +c; }
    else if (ampm && month <= 31 && day <= 12) { [day, month] = [month, day]; } // formato EUA m/d/a
    if (year < 100) year += 2000;
    if (month > 12 && day <= 12) [day, month] = [month, day];
    const d = new Date(year, month - 1, day, hour, +mm);
    if (isNaN(d.getTime())) continue;
    const bubble = el.closest(".message-out, .message-in");
    let direction = bubble ? (bubble.classList.contains("message-out") ? "outbound" : "inbound") : null;
    const idEl = el.closest("[data-id]");
    const id = idEl ? idEl.getAttribute("data-id") || "" : "";
    if (!direction && /^(true|false)_/.test(id)) direction = id.startsWith("true_") ? "outbound" : "inbound";
    if (!direction) continue;
    const textEl = el.querySelector(".selectable-text, .copyable-text span[dir]") || el.querySelector("span[dir]");
    const text = (textEl ? textEl.innerText : "").replace(INVISIBLE, " ").trim();
    if (!text) continue;
    if (!phone) {
      const pm = /_(\d{8,15})@c\.us/.exec(id);
      if (pm) phone = "+" + pm[1];
    }
    out.push({ direction, text: text.slice(0, 4000), sent_at: d.toISOString() });
  }
  const header = document.querySelector("#main header span[dir='auto']") || document.querySelector("#main header span[title]");
  const chatName = header ? (header.getAttribute("title") || header.textContent || "").replace(INVISIBLE, " ").trim().slice(0, 120) : null;
  const hasChat = !!document.querySelector("#main");
  return { hasChat, phone, chatName, messages: out.slice(-MAX) };
}
