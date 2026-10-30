/**
 * Leitura da conversa aberta no WhatsApp Web, só a pedido explícito do utilizador
 * («Guardar conversa no CRM»). Injetada via chrome.scripting na aba do WhatsApp Web;
 * tem de ser autocontida (sem imports nem closures). Lê apenas as mensagens de texto visíveis.
 */
export function readOpenChat() {
  const MAX = 200;
  const out = [];
  let phone = null;
  const rows = document.querySelectorAll("#main div[data-pre-plain-text]");
  for (const el of rows) {
    const meta = el.getAttribute("data-pre-plain-text") || "";
    const m = /^\[(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*[ap]\.?m\.?)?,\s*(\d{1,4})[\/.-](\d{1,2})[\/.-](\d{2,4})\]/i.exec(meta);
    if (!m) continue;
    let [, hh, mm, a, b, c] = m;
    let day = +a, month = +b, year = +c;
    if (a.length === 4) { year = +a; month = +b; day = +c; }
    if (year < 100) year += 2000;
    if (month > 12 && day <= 12) [day, month] = [month, day];
    const d = new Date(year, month - 1, day, +hh, +mm);
    if (isNaN(d.getTime())) continue;
    const bubble = el.closest(".message-out, .message-in");
    if (!bubble) continue;
    const direction = bubble.classList.contains("message-out") ? "outbound" : "inbound";
    const textEl = el.querySelector(".selectable-text");
    const text = (textEl ? textEl.innerText : "").trim();
    if (!text) continue;
    if (!phone) {
      const idEl = el.closest("[data-id]");
      const id = idEl ? idEl.getAttribute("data-id") || "" : "";
      const pm = /_(\d{8,15})@c\.us/.exec(id);
      if (pm) phone = "+" + pm[1];
    }
    out.push({ direction, text: text.slice(0, 4000), sent_at: d.toISOString() });
  }
  const header = document.querySelector("#main header span[dir='auto']");
  return { phone, chatName: header ? header.textContent.trim().slice(0, 120) : null, messages: out.slice(-MAX) };
}
