/**
 * Utilitários de browser tolerantes a ambientes limitados (iOS antigo, browsers
 * embutidos em apps, modo privado, contextos não seguros). Nunca lançam erro:
 * as páginas públicas não podem falhar por causa de identificadores ou
 * armazenamento local usados apenas para métricas.
 */

export function safeRandomId(): string {
  try {
    const c: Crypto | undefined = typeof globalThis !== "undefined" ? (globalThis as any).crypto : undefined;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
    if (c && typeof c.getRandomValues === "function") {
      const b = c.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 0x0f) | 0x40;
      b[8] = (b[8] & 0x3f) | 0x80;
      const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    }
  } catch {
    /* recorre ao fallback */
  }
  const r = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  return `${r()}${r()}-${r()}-4${r().slice(1)}-${((8 + Math.random() * 4) | 0).toString(16)}${r().slice(1)}-${r()}${r()}${r()}`;
}

type StorageKind = "local" | "session";

function getStorage(kind: StorageKind): Storage | null {
  try {
    const s = kind === "local" ? window.localStorage : window.sessionStorage;
    return s ?? null;
  } catch {
    return null;
  }
}

export function safeStorageGet(kind: StorageKind, key: string): string | null {
  try {
    return getStorage(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function safeStorageSet(kind: StorageKind, key: string, value: string): void {
  try {
    getStorage(kind)?.setItem(key, value);
  } catch {
    /* armazenamento indisponível ou cheio */
  }
}

/** ID de sessão persistente; em memória quando o armazenamento não existe. */
let memorySessionId: string | null = null;
export function getOrCreateSessionId(key: string): string {
  const existing = safeStorageGet("local", key);
  if (existing) return existing;
  const sid = memorySessionId ?? safeRandomId();
  memorySessionId = sid;
  safeStorageSet("local", key, sid);
  return sid;
}
