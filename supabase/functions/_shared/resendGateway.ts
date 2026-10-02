/**
 * Resend via Lovable connector gateway.
 * O RESEND_API_KEY ligado pelo conector é uma chave de ligação ao gateway,
 * não uma chave direta da API do Resend — todos os envios passam por aqui.
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

function gatewayHeaders(extra?: HeadersInit): Headers {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!resendKey) throw new Error("RESEND_API_KEY is not configured");
  const h = new Headers(extra);
  h.set("Authorization", `Bearer ${lovableKey}`);
  h.set("X-Connection-Api-Key", resendKey);
  if (!h.has("Content-Type")) h.set("Content-Type", "application/json");
  return h;
}

/** Substituto de fetch("https://api.resend.com/<path>", init). */
export function resendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const clean = path.replace(/^https:\/\/api\.resend\.com/, "");
  return fetch(`${GATEWAY_URL}${clean.startsWith("/") ? clean : `/${clean}`}`, {
    ...init,
    headers: gatewayHeaders(init.headers),
  });
}

type SendResult = { data: { id: string } | null; error: { message: string; statusCode?: number } | null };

async function post(path: string, payload: unknown): Promise<SendResult> {
  try {
    const res = await resendFetch(path, { method: "POST", body: JSON.stringify(payload) });
    const text = await res.text();
    if (!res.ok) {
      console.error(`Resend gateway failed [${res.status}]: ${text}`);
      return { data: null, error: { message: text || `HTTP ${res.status}`, statusCode: res.status } };
    }
    return { data: text ? JSON.parse(text) : null, error: null };
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
  }
}

/** Compatível com `new Resend(key).emails.send(...)` do SDK oficial. */
export class Resend {
  // deno-lint-ignore no-unused-vars
  constructor(_key?: string | null) {}
  emails = { send: (payload: Record<string, unknown>) => post("/emails", payload) };
  batch = { send: (payload: Record<string, unknown>[]) => post("/emails/batch", payload) };
}
