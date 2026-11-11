// WAScript (WhatsApp Web) — cliente partilhado. Token só no servidor.
export const WASCRIPT_BASE = "https://api-whatsapp.wascript.com.br/api";
export const WASCRIPT_MAX_MEDIA_BYTES = 15 * 1024 * 1024;

/** Número só com dígitos, com indicativo (PT por defeito para 9 dígitos). */
export function toWascriptPhone(raw: string | null | undefined, defaultCc = "351"): string | null {
  let d = String(raw ?? "").replace(/@.*$/, "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9 && /^[239]/.test(d)) d = `${defaultCc}${d}`;
  if (d.length < 8 || d.length > 15) return null;
  return d;
}

export interface WascriptResult { ok: boolean; status: number; message: string; code?: string; body?: Record<string, unknown> }

export function mapWascriptError(status: number, message?: string): { code: string; message: string } {
  if (status === 404) return { code: "WASCRIPT_TOKEN_INVALID", message: "O token da WAScript não é válido." };
  if (status === 501) return { code: "WASCRIPT_OFFLINE", message: "O WhatsApp Web ligado à WAScript não está aberto. Abra-o e tente novamente." };
  if (status === 400) return { code: "WASCRIPT_BAD_REQUEST", message: message || "Pedido inválido para a WAScript." };
  return { code: "WASCRIPT_ERROR", message: message || "A WAScript não respondeu. Tente mais tarde." };
}

async function call(path: string, token: string, init: RequestInit): Promise<WascriptResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const res = await fetch(`${WASCRIPT_BASE}/${path}/${encodeURIComponent(token)}`, { ...init, signal: ctrl.signal });
    let body: { success?: boolean; message?: string; [k: string]: unknown } = {};
    try { body = await res.json(); } catch { /* corpo não JSON */ }
    if (res.ok && body.success !== false) return { ok: true, status: res.status, message: body.message ?? "ok", body };
    const m = mapWascriptError(res.status, body.message);
    return { ok: false, status: res.status, message: m.message, code: m.code };
  } catch (e) {
    const aborted = (e as Error).name === "AbortError";
    return { ok: false, status: 0, code: "WASCRIPT_UNREACHABLE", message: aborted ? "A WAScript demorou demasiado a responder." : "Não foi possível contactar a WAScript." };
  } finally { clearTimeout(timer); }
}

export function testWascript(token: string) {
  return call("listar-etiquetas", token, { method: "GET" });
}

export interface WascriptLabel { id: string; name: string; hexColor: string | null; count: number }

/** Normaliza a resposta de «listar-etiquetas». */
export function parseWascriptLabels(body: unknown): WascriptLabel[] {
  const list = (body && typeof body === "object" ? (body as Record<string, unknown>).etiquetas : null);
  if (!Array.isArray(list)) return [];
  return list.flatMap((e) => {
    if (!e || typeof e !== "object") return [];
    const o = e as Record<string, unknown>;
    const id = str(o.id); if (!id) return [];
    const hex = str(o.hexColor);
    return [{ id, name: (str(o.name) ?? id).slice(0, 80), hexColor: hex && /^#[0-9a-fA-F]{3,8}$/.test(hex) ? hex : null, count: Number(o.count) || 0 }];
  });
}

export async function listWascriptLabels(token: string): Promise<WascriptResult & { labels: WascriptLabel[] }> {
  const r = await call("listar-etiquetas", token, { method: "GET" });
  return { ...r, labels: r.ok ? parseWascriptLabels(r.body) : [] };
}

/** Corpo de «modificar-etiquetas»: telefones + ações add/remove (sem duplicados). */
export function buildLabelActions(phone: string, add: string[], remove: string[]) {
  const seen = new Set<string>();
  const actions: { labelId: string; type: "add" | "remove" }[] = [];
  for (const [ids, type] of [[add, "add"], [remove, "remove"]] as const) {
    for (const id of ids) { const k = id.trim(); if (k && !seen.has(k)) { seen.add(k); actions.push({ labelId: k, type }); } }
  }
  return { phone: [phone], actions };
}

export function modifyWascriptLabels(token: string, phone: string, add: string[], remove: string[]) {
  return call("modificar-etiquetas", token, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildLabelActions(phone, add, remove)),
  });
}

export function createWascriptNote(token: string, phone: string, text: string) {
  return call("criar-nota", token, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userID: phone, text: text.slice(0, 4000) }),
  });
}

export function isWascriptOfflineError(lastError: string | null | undefined) {
  return !!lastError && lastError === mapWascriptError(501).message;
}

export function sendWascript(token: string, kind: "texto" | "imagem" | "documento" | "audio" | "video", body: Record<string, unknown>) {
  return call(`enviar-${kind}`, token, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

/** Tipo de envio WAScript a partir do tipo de mensagem / mime. */
export function wascriptKind(messageType: string, mime?: string | null): "texto" | "imagem" | "documento" | "audio" | "video" {
  const t = (messageType || "").toLowerCase(); const m = (mime || "").toLowerCase();
  if (t === "image" || m.startsWith("image/")) return "imagem";
  if (t === "audio" || t === "ptt" || m.startsWith("audio/")) return "audio";
  if (t === "video" || m.startsWith("video/")) return "video";
  if (t === "document" || t === "file" || m) return "documento";
  return "texto";
}

export async function fetchAsDataUri(url: string): Promise<{ dataUri: string; mime: string } | { error: string }> {
  try {
    const res = await fetch(url);
    if (!res.ok) return { error: "Não foi possível obter o anexo." };
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > WASCRIPT_MAX_MEDIA_BYTES) return { error: "O anexo excede 15 MB." };
    const mime = res.headers.get("content-type")?.split(";")[0] || "application/octet-stream";
    let bin = ""; const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) bin += String.fromCharCode(...buf.subarray(i, i + chunk));
    return { dataUri: `data:${mime};base64,${btoa(bin)}`, mime };
  } catch { return { error: "Não foi possível obter o anexo." }; }
}

export interface WascriptInbound {
  phone: string | null;
  name: string | null;
  text: string;
  fromMe: boolean;
  isGroup: boolean;
  messageId: string | null;
  photo: string | null;
  timestamp: string | null;
}

function pick(o: Record<string, unknown> | undefined, keys: string[]): unknown {
  if (!o) return undefined;
  for (const k of keys) { const v = o[k]; if (v !== undefined && v !== null && v !== "") return v; }
  return undefined;
}
const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : null);
const truthy = (v: unknown) => v === true || v === "true" || v === 1 || v === "1";

/**
 * Normaliza o evento «Mensagens» da WAScript. O formato não está documentado,
 * por isso aceita as variantes mais comuns (pt/en, aninhado em data/evento/message).
 */
export function parseWascriptInbound(raw: unknown): WascriptInbound {
  const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const layers: Record<string, unknown>[] = [root];
  for (const k of ["data", "dados", "evento", "event", "dadosEvento", "dados_evento", "message", "mensagem", "contato", "contact"]) {
    const v = root[k]; if (v && typeof v === "object" && !Array.isArray(v)) layers.push(v as Record<string, unknown>);
  }
  const find = (keys: string[]) => { for (const l of layers) { const v = pick(l, keys); if (v !== undefined) return v; } return undefined; };
  const phoneRaw = str(find(["numero", "number", "phone", "telefone", "from", "chatId", "remoteJid", "userID", "userId"]));
  const isGroup = !!phoneRaw && /@g\.us$/.test(phoneRaw) || truthy(find(["isGroup", "grupo", "is_group"]));
  const textRaw = find(["mensagem", "message", "text", "texto", "body", "conteudo", "content", "caption"]);
  const text = typeof textRaw === "string" ? textRaw : (textRaw && typeof textRaw === "object" ? str(pick(textRaw as Record<string, unknown>, ["text", "body", "message"])) ?? "" : "");
  const dir = str(find(["direcao", "direction", "tipo_envio"]))?.toLowerCase();
  return {
    phone: phoneRaw ? toWascriptPhone(phoneRaw) : null,
    name: str(find(["nome", "name", "pushName", "senderName", "notifyName"])),
    text: (text ?? "").slice(0, 8000),
    fromMe: truthy(find(["fromMe", "from_me", "enviada", "enviadoPorMim", "isFromMe"])) || dir === "outbound" || dir === "enviada" || dir === "sent",
    isGroup,
    messageId: str(find(["id", "messageId", "message_id", "idMensagem", "msgId"])),
    photo: str(find(["foto", "photo", "profilePic", "avatar"])),
    timestamp: str(find(["timestamp", "data_hora", "date", "momment", "createdAt"])),
  };
}
