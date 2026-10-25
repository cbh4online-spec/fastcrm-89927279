/**
 * FastCRM WhatsApp Pro — Side Panel (v0.3.0)
 * Uso manual: atalhos, validação local de números, cópia explícita.
 * Não faz pedidos de rede nem lê dados de páginas.
 */
import { normalizePhone } from "./lib/phone.js";
import { FASTCRM_ORIGIN, WHATSAPP_WEB_ORIGIN, fastcrmUrl, isAllowedUrl } from "./lib/urls.js";

const $ = (id) => document.getElementById(id);

function setFeedback(el, text, kind) {
  el.textContent = text;
  el.className = "feedback" + (kind ? " feedback-" + kind : "");
}

function openTab(url, feedbackEl, successText) {
  if (!url || !isAllowedUrl(url)) {
    setFeedback(feedbackEl, "Esta página não está disponível.", "error");
    return;
  }
  chrome.runtime.sendMessage({ type: "OPEN_TAB", url }, (response) => {
    if (chrome.runtime.lastError || !response?.ok) {
      setFeedback(feedbackEl, "Não foi possível abrir a página.", "error");
    } else if (successText) {
      setFeedback(feedbackEl, successText, "ok");
    }
  });
}

function resolveRoute(key) {
  return key === "whatsapp" ? WHATSAPP_WEB_ORIGIN + "/" : fastcrmUrl(key);
}

function setupTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const select = (tab) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
    }
    tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") select(tabs[(i + 1) % tabs.length]);
      if (e.key === "ArrowLeft") select(tabs[(i - 1 + tabs.length) % tabs.length]);
    });
  });
}

function setupRoutes() {
  for (const btn of document.querySelectorAll("[data-route]")) {
    const url = resolveRoute(btn.dataset.route);
    const feedback = btn.closest("section").querySelector(".feedback");
    if (!url || !isAllowedUrl(url)) {
      btn.disabled = true;
      btn.title = "Página indisponível";
      continue;
    }
    btn.addEventListener("click", () => openTab(url, feedback));
  }
}

function setupPhone() {
  let current = null;
  const feedback = $("phone-feedback");
  const actions = $("phone-actions");

  $("input-phone").addEventListener("input", () => {
    current = null;
    actions.hidden = true;
    setFeedback(feedback, "");
  });

  $("phone-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const r = normalizePhone($("input-phone").value);
    if (!r.ok) {
      current = null;
      actions.hidden = true;
      setFeedback(feedback, r.error, "error");
      return;
    }
    current = r.e164;
    $("phone-normalized").textContent = r.e164;
    actions.hidden = false;
    setFeedback(feedback, "Formato válido. Não foi feita nenhuma pesquisa no FastCRM.", "ok");
  });

  $("btn-copy-phone").addEventListener("click", async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current);
      setFeedback(feedback, "Número copiado.", "ok");
    } catch {
      setFeedback(feedback, "Não foi possível copiar. Selecione o número e copie manualmente.", "error");
    }
  });

  $("btn-copy-lookup").addEventListener("click", async () => {
    if (!current) return;
    const snapshot = current;
    const button = $("btn-copy-lookup");
    button.disabled = true;
    try {
      await navigator.clipboard.writeText(snapshot);
      if (current !== snapshot) return;
      openTab(fastcrmUrl("lookup"), feedback, "Abri o FastCRM. Cola o número e clica Pesquisar.");
    } catch {
      setFeedback(feedback, "Não foi possível copiar. Copie o número manualmente e abra «Pesquisar no FastCRM» no Início.", "error");
    } finally {
      button.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  $("config-origin").textContent = FASTCRM_ORIGIN;
  setupTabs();
  setupRoutes();
  setupPhone();
});
