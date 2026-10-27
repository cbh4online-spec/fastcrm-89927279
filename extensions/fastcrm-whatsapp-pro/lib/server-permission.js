/**
 * Acesso opcional ao servidor FastCRM (v0.4.3). Só chrome.permissions (Chrome 116+).
 * O host é optional_host_permissions: o Chrome só o concede após o utilizador aceitar.
 * Todas as funções falham fechadas (API ausente, exceção ou rejeição => sem acesso).
 */
import { AUTH_ORIGIN, isOAuthConfigured, PUBLIC_CLIENT_ID, API_READY } from "./oauth-config.js";

export const SERVER_ORIGIN_PATTERN = AUTH_ORIGIN + "/*";
const REQUEST = () => ({ origins: [SERVER_ORIGIN_PATTERN] });

/**
 * Tem de ser chamada SINCRONAMENTE dentro do gesto do utilizador (antes de qualquer await).
 * Devolve sempre uma Promise<boolean> que nunca rejeita.
 */
export function requestServerAccess(chromeApi) {
  try {
    const fn = chromeApi?.permissions?.request;
    if (typeof fn !== "function") return Promise.resolve(false);
    return Promise.resolve(fn.call(chromeApi.permissions, REQUEST())).then((v) => v === true, () => false);
  } catch {
    return Promise.resolve(false);
  }
}

export async function hasServerAccess(chromeApi) {
  try {
    const fn = chromeApi?.permissions?.contains;
    if (typeof fn !== "function") return false;
    return (await fn.call(chromeApi.permissions, REQUEST())) === true;
  } catch {
    return false;
  }
}

/**
 * Comparação exata com o padrão declarado em optional_host_permissions. O Chrome reporta em
 * onRemoved os padrões tal como foram concedidos/declarados (a origem é sempre pedida com este
 * mesmo padrão em REQUEST()), por isso não se aceitam variantes. Se alguma variante não for
 * reconhecida aqui, a UI não limpa de imediato, mas o SW continua a verificar contains() antes
 * de cada OAuth/token/fetch (falha fechada) — não é preciso ampliar hosts.
 */
export function isServerOriginRemoval(removed) {
  return Array.isArray(removed?.origins) && removed.origins.includes(SERVER_ORIGIN_PATTERN);
}

/**
 * Migração 0.4.2 -> 0.4.3: o host obrigatório antigo pode sobreviver como concedido.
 * Só remove quando clientId === "" E apiReady === false (estritamente). Qualquer outro valor
 * (não vazio, malformado, null, undefined explícito) => skip. Sem override usa as constantes.
 * Resultado: "skipped_configured" | "not_granted" | "removed" | "remove_failed" | "unavailable".
 */
export async function migrateSafeState(chromeApi, opts) {
  let clientId = PUBLIC_CLIENT_ID;
  let apiReady = API_READY;
  if (opts !== undefined) {
    if (opts === null || typeof opts !== "object") return "skipped_configured";
    if (Object.prototype.hasOwnProperty.call(opts, "clientId")) clientId = opts.clientId;
    if (Object.prototype.hasOwnProperty.call(opts, "apiReady")) apiReady = opts.apiReady;
  }
  if (clientId !== "" || apiReady !== false) return "skipped_configured";
  const p = chromeApi?.permissions;
  if (typeof p?.contains !== "function" || typeof p?.remove !== "function") return "unavailable";
  if (!(await hasServerAccess(chromeApi))) return "not_granted";
  try {
    const ok = await p.remove(REQUEST());
    if (ok !== true) return "remove_failed";
  } catch {
    return "remove_failed";
  }
  return (await hasServerAccess(chromeApi)) ? "remove_failed" : "removed";
}
