/**
 * Leitura da conversa aberta no WhatsApp Web (só leitura, nunca envia nada).
 * Injetada via chrome.scripting na aba do WhatsApp Web; tem de ser autocontida
 * (sem imports nem closures). Lê apenas mensagens de texto já mostradas no ecrã.
 * v0.7.2: várias estratégias em cascata (balões clássicos, data-id, linhas role=row com
 * ícones de cauda/visto) e diagnóstico só com contagens (nunca conteúdo) quando nada é lido.
 */
export function readOpenChat() {
  const MAX = 200;
  const INVISIBLE = /[\u200e\u200f\u202a-\u202e\u2066-\u2069\u202f\u00a0]/g;
  const TIME_RE = /(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])?\.?\s*m?\.?/i;
  const ONLY_TIME = /^\s*\d{1,2}:\d{2}(\s*[ap]\.?\s*m\.?)?\s*$/i;
  const clean = (s) => (s || "").replace(INVISIBLE, " ").replace(/\s+/g, " ").trim();
  const txt = (el) => clean(el ? (el.innerText || el.textContent || "") : "");
  // Lê dd/mm/aaaa, aaaa-mm-dd ou (com AM/PM) mm/dd/aaaa.
  const parseDate = (s, us) => {
    const dm = /(\d{1,4})[\/.-](\d{1,2})[\/.-](\d{2,4})/.exec(s);
    if (!dm) return null;
    const [, a, b, c] = dm;
    let day = +a, month = +b, year = +c;
    if (a.length === 4) { year = +a; month = +b; day = +c; }
    else if (us && day <= 12) { [day, month] = [month, day]; }
    if (year < 100) year += 2000;
    if (month > 12 && day <= 12) [day, month] = [month, day];
    return { day, month, year };
  };
  const build = (time, date) => {
    const t = TIME_RE.exec(time);
    if (!t) return null;
    let hour = +t[1];
    const ampm = t[3];
    if (ampm) { const pm = ampm.toLowerCase() === "p"; if (pm && hour < 12) hour += 12; if (!pm && hour === 12) hour = 0; }
    const now = new Date();
    const { day, month, year } = date || { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
    const d = new Date(year, month - 1, day, hour, +t[2]);
    return isNaN(d.getTime()) ? null : d;
  };
  const parseStamp = (meta) => {
    const s = clean(meta);
    const t = TIME_RE.exec(s);
    return build(s, parseDate(s, !!(t && t[3])));
  };
  const dirFromId = (id) => (/^true_/.test(id) ? "outbound" : /^false_/.test(id) ? "inbound" : null);
  const isQuoted = (el) => !!el.closest?.(".quoted-mention, [data-testid*='quoted'], [aria-label*='uot']");
  const pickText = (scope) => {
    if (!scope?.querySelectorAll) return "";
    const sel = [...scope.querySelectorAll(".selectable-text")].filter((e) => !isQuoted(e));
    for (const e of sel) { const t = txt(e); if (t && !ONLY_TIME.test(t)) return t; }
    let best = "";
    for (const e of scope.querySelectorAll("span[dir='ltr'], span[dir='auto'], span[dir='rtl']")) {
      if (isQuoted(e) || e.closest?.("header")) continue;
      const t = txt(e);
      if (!t || ONLY_TIME.test(t) || /^\d{1,2}:\d{2}$/.test(t)) continue;
      if (t.length > best.length) best = t;
    }
    return best;
  };

  const main = document.querySelector("#main");
  const root = main || document;
  const diag = { meta: 0, bubbles: 0, ids: 0, rows: 0, strategy: "" };
  const out = [];
  const seen = new Set();
  let phone = null;
  const push = (direction, text, d, id) => {
    const key = id || `${direction}|${text}|${d.getTime()}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (!phone && id) { const pm = /_(\d{8,15})@c\.us/.exec(id); if (pm) phone = "+" + pm[1]; }
    out.push({ direction, text: text.slice(0, 4000), sent_at: d.toISOString() });
  };
  const idOf = (node) => {
    const own = node.getAttribute?.("data-id");
    if (own && dirFromId(own)) return own;
    const up = node.closest?.("[data-id]");
    const upId = up?.getAttribute?.("data-id") || "";
    if (dirFromId(upId)) return upId;
    const down = node.querySelector?.("[data-id]");
    return down?.getAttribute?.("data-id") || upId || "";
  };
  const dirOf = (node, id) => {
    const b = node.closest?.(".message-out, .message-in");
    if (b) return b.classList.contains("message-out") ? "outbound" : "inbound";
    if (node.querySelector?.(".message-out")) return "outbound";
    if (node.querySelector?.(".message-in")) return "inbound";
    const fromId = dirFromId(id);
    if (fromId) return fromId;
    if (node.querySelector?.("[data-icon='tail-out'], [data-icon^='msg-dblcheck'], [data-icon='msg-check'], [data-icon^='msg-time']")) return "outbound";
    if (node.querySelector?.("[data-icon='tail-in']")) return "inbound";
    return null;
  };

  // 1) Estratégia clássica: data-pre-plain-text (traz hora e data exatas).
  const metas = [...root.querySelectorAll("[data-pre-plain-text]")];
  diag.meta = metas.length;
  for (const m of metas) {
    if (isQuoted(m)) continue;
    const id = idOf(m);
    const direction = dirOf(m, id);
    if (!direction) continue;
    const text = pickText(m);
    if (!text) continue;
    push(direction, text, parseStamp(m.getAttribute("data-pre-plain-text")) || new Date(), id);
  }
  if (out.length) diag.strategy = "meta";

  // 2) Linhas de mensagem sem data-pre-plain-text (data-id, role=row, balões).
  if (!out.length) {
    const rows = new Set([
      ...root.querySelectorAll("[data-id]"),
      ...root.querySelectorAll(".message-in, .message-out"),
    ]);
    diag.ids = root.querySelectorAll("[data-id]").length;
    diag.bubbles = root.querySelectorAll(".message-in, .message-out").length;
    let candidates = [...rows].filter((n) => dirFromId(n.getAttribute?.("data-id") || "") || n.classList?.contains("message-in") || n.classList?.contains("message-out"));
    if (!candidates.length) candidates = [...root.querySelectorAll("[role='row']")];
    diag.rows = root.querySelectorAll("[role='row']").length;
    let currentDate = null;
    for (const node of candidates) {
      const all = txt(node);
      const id = idOf(node);
      const direction = dirOf(node, id);
      if (!direction) {
        const sep = parseDate(all);
        if (sep && all.length < 40) currentDate = sep;
        else if (/^ontem$|^yesterday$/i.test(all)) { const y = new Date(Date.now() - 864e5); currentDate = { day: y.getDate(), month: y.getMonth() + 1, year: y.getFullYear() }; }
        else if (/^hoje$|^today$/i.test(all)) currentDate = null;
        continue;
      }
      const text = pickText(node);
      if (!text) continue;
      const times = all.match(/\d{1,2}:\d{2}(\s*[ap]\.?\s*m\.?)?/gi);
      const d = (times && build(times[times.length - 1], currentDate)) || new Date();
      push(direction, text, d, id);
    }
    if (out.length) diag.strategy = "rows";
  }

  const header = (main && (main.querySelector("header span[dir='auto']") || main.querySelector("header span[title]")))
    || document.querySelector("#main header span[dir='auto']") || document.querySelector("#main header span[title]");
  const chatName = header ? clean(header.getAttribute?.("title") || header.textContent || "").slice(0, 120) : null;
  return { hasChat: !!main, phone, chatName, messages: out.slice(-MAX), diag };
}
