/**
 * FastCRM WhatsApp Pro — Side Panel (Iteração 1, prova de conceito)
 *
 * - Configuração do URL do FastCRM persistida em chrome.storage.local.
 * - Estado fixo "Não ligado": a extensão NÃO verifica nem deduz o estado
 *   da sessão (sem host_permissions, um fetch cross-origin falharia por
 *   CORS e seria indistinguível de indisponibilidade real — por isso foi
 *   removido). A sessão vive no separador do FastCRM.
 * - Todas as ações abrem separadores normais — nada é injetado em páginas.
 *
 * NOTA para iterações futuras: quando existir integração autenticada,
 * o URL base deve ser restringido a uma lista de origens permitidas
 * (ALLOWED_ORIGINS) e não a qualquer origem https arbitrária.
 */

const DEFAULT_FASTCRM_URL = "https://fastcrm.metodopare.ai";
const STORAGE_KEY = "fastcrmBaseUrl";

/**
 * Origens permitidas para o URL base do FastCRM.
 * Nesta iteração (sem integração autenticada) aceitamos qualquer origem
 * https configurada pelo utilizador, normalizada a esquema+host+porta.
 * Na iteração com autenticação, esta validação passará a ser uma
 * lista fechada de origens (allowlist) para impedir que um URL
 * arbitrário receba tokens ou dados do utilizador.
 */
function sanitizeBaseUrl(raw) {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:") return null;
    // Normaliza para a origem — sem path, query nem hash.
    return url.origin;
  } catch {
    return null;
  }
}

async function getBaseUrl() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return sanitizeBaseUrl(stored[STORAGE_KEY]) || DEFAULT_FASTCRM_URL;
}

function openTab(url) {
  chrome.runtime.sendMessage({ type: "OPEN_TAB", url }, (response) => {
    if (chrome.runtime.lastError || !response?.ok) {
      console.error("[FastCRM] Falha ao abrir separador:", response?.error);
    }
  });
}

async function init() {
  const base = await getBaseUrl();
  document.getElementById("input-fastcrm-url").value = base;

  document.getElementById("btn-open-login").addEventListener("click", async () => {
    openTab((await getBaseUrl()) + "/auth");
  });

  document.getElementById("btn-open-fastcrm").addEventListener("click", async () => {
    openTab(await getBaseUrl());
  });

  document.getElementById("btn-open-inbox").addEventListener("click", async () => {
    openTab((await getBaseUrl()) + "/dashboard/inbox");
  });

  document.getElementById("btn-open-whatsapp").addEventListener("click", () => {
    openTab("https://web.whatsapp.com/");
  });

  document.getElementById("btn-save-url").addEventListener("click", async () => {
    const input = document.getElementById("input-fastcrm-url");
    const feedback = document.getElementById("save-feedback");
    const clean = sanitizeBaseUrl(input.value);
    if (!clean) {
      feedback.textContent = "URL inválido. Use um endereço https:// completo.";
      feedback.className = "feedback feedback-error";
      return;
    }
    await chrome.storage.local.set({ [STORAGE_KEY]: clean });
    input.value = clean;
    feedback.textContent = "Configuração guardada.";
    feedback.className = "feedback feedback-ok";
  });
}

document.addEventListener("DOMContentLoaded", init);
