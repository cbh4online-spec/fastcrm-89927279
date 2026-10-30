/**
 * FastCRM WhatsApp Pro — Side Panel (v0.4.3)
 * Uso manual: atalhos, validação local de números, cópia explícita.
 * Não faz pedidos de rede nem lê dados de páginas.
 */
import { normalizePhone } from "./lib/phone.js";
import { FASTCRM_ORIGIN, WHATSAPP_WEB_ORIGIN, fastcrmUrl, isAllowedUrl, detailUrl } from "./lib/urls.js";
import { isLookupReady, isOAuthConfigured } from "./lib/oauth-config.js";
import { oauthRedirectUri } from "./lib/oauth-pkce.js";
import { requestServerAccess, isServerOriginRemoval } from "./lib/server-permission.js";
import { readOpenChat } from "./lib/whatsapp-reader.js";

/** Estado só em memória; nunca persistido. */
const state = { phone: null, workspaceId: "", nonce: 0, authStatus: "disconnected" };

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
    state.phone = null;
    clearResults();
    actions.hidden = true;
    setFeedback(feedback, "");
  });

  $("phone-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const r = normalizePhone($("input-phone").value);
    if (!r.ok) {
      current = null;
      state.phone = null;
      clearResults();
      actions.hidden = true;
      setFeedback(feedback, r.error, "error");
      return;
    }
    current = r.e164;
    state.phone = r.e164;
    clearResults();
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

const AUTH_TEXT = {
  config_pending: ["Versão desatualizada", "Esta instalação não está ligada ao FastCRM. Remova-a e instale a versão 0.5.0 ou superior.", "dot-off"],
  disconnected: ["Desligado", "Ligue-se para preparar a futura pesquisa no painel.", "dot-off"],
  connected: ["Ligado ao FastCRM", "Sessão válida só até fechar o browser.", "dot-on"],
};
const AUTH_ERRORS = {
  autorizacao_cancelada: "Janela de autorização fechada antes de concluir.",
  pagina_autorizacao_indisponivel: "A página de autorização do FastCRM não abriu (endereço de regresso não autorizado ou sem rede).",
  autorizacao_falhou: "A autorização não foi concluída. Confirme que tem sessão iniciada no FastCRM e tente de novo.",
  autorizacao_recusada: "Autorização recusada.",
  rede_indisponivel: "Servidor indisponível. Tente mais tarde.",
  sem_permissao_servidor: "O Chrome não autorizou o acesso ao servidor FastCRM. Clique «Ligar» e aceite o pedido.",
};

function sendAuth(type) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type }, (r) => resolve(chrome.runtime.lastError || !r ? { ok: false, status: "disconnected", error: "erro_interno" } : r));
  });
}

const LOOKUP_ERRORS = {
  sessao_expirada: "Sessão expirada. Ligue-se novamente.",
  acesso_negado: "Acesso negado a este workspace.",
  instancia_nao_suportada: "Este workspace está noutra instância e não é suportado na extensão.",
  limite_excedido: "Demasiados pedidos. Aguarde um minuto.",
  servico_desativado: "Serviço de pesquisa desativado pelo administrador.",
  api_nao_configurada: "Pesquisa no painel ainda não configurada.",
  desligado: "Ligue-se ao FastCRM primeiro.",
  workspace_invalido: "Escolha um workspace carregado.",
  telefone_invalido: "Número inválido.",
  rede_indisponivel: "Servidor indisponível. Tente mais tarde.",
  sem_permissao_servidor: "Sem autorização do Chrome para contactar o FastCRM. Ligue-se novamente.",
};
const lookupError = (e) => LOOKUP_ERRORS[e] ?? "Não foi possível concluir a pesquisa.";

function clearResults() {
  state.nonce++;
  $("list-contacts").replaceChildren();
  $("list-leads").replaceChildren();
  $("lookup-results").hidden = true;
  setFeedback($("lookup-feedback"), "");
  updateLookupButton();
}

function resetSession() {
  state.workspaceId = "";
  state.phone = null;
  const sel = $("select-workspace");
  sel.replaceChildren(new Option("— carregue as empresas —", ""));
  sel.disabled = true;
  $("input-phone").value = "";
  $("phone-actions").hidden = true;
  setFeedback($("phone-feedback"), "");
  setFeedback($("workspace-feedback"), "");
  clearResults();
}

function updateLookupButton() {
  const enabled = state.authStatus === "connected" && isLookupReady();
  $("panel-lookup").hidden = !enabled;
  $("panel-lookup-pending").hidden = enabled;
  $("workspace-block").hidden = !enabled;
  $("btn-panel-lookup").disabled = !(enabled && state.phone && state.workspaceId);
  const sync = document.getElementById("btn-sync-chat");
  if (sync) sync.disabled = !(enabled && state.workspaceId);
}

function renderList(el, rows, kind, extraKey) {
  el.replaceChildren();
  if (!rows.length) {
    const li = document.createElement("li");
    li.textContent = "Nenhum resultado.";
    el.append(li);
    return;
  }
  for (const r of rows.slice(0, 10)) {
    const li = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = [r.name, r[extraKey], r.phone].filter(Boolean).join(" · ");
    li.append(text);
    const url = detailUrl(kind, r.id);
    if (url && isAllowedUrl(url)) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-secondary";
      b.textContent = "Abrir ficha";
      b.addEventListener("click", () => openTab(url, $("lookup-feedback")));
      li.append(b);
    }
    el.append(li);
  }
}

function setupPanelLookup() {
  $("btn-load-workspaces").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const epoch = state.authEpoch; // sessão de autenticação no momento do clique
    btn.disabled = true;
    const fb = $("workspace-feedback");
    setFeedback(fb, "A carregar…");
    const r = await send({ type: "LIST_WORKSPACES" });
    btn.disabled = false;
    if (epoch !== state.authEpoch) return; // logout/revogação entretanto: não reabrir lista
    const sel = $("select-workspace");
    state.workspaceId = "";
    clearResults();
    if (!r.ok) {
      sel.replaceChildren(new Option("— indisponível —", ""));
      sel.disabled = true;
      setFeedback(fb, lookupError(r.error), "error");
      if (r.error === "sessao_expirada") { state.authStatus = "disconnected"; renderAuth("disconnected"); }
      return;
    }
    sel.replaceChildren(new Option("— escolha —", ""), ...(r.workspaces ?? []).map((w) => new Option(w.name || "Workspace sem nome", w.id)));
    sel.disabled = !(r.workspaces ?? []).length;
    setFeedback(fb, (r.workspaces ?? []).length ? "Escolha o workspace." : "Sem workspaces disponíveis para o piloto.", (r.workspaces ?? []).length ? "ok" : "error");
  });

  $("select-workspace").addEventListener("change", (e) => {
    state.workspaceId = e.currentTarget.value;
    clearResults();
  });

  $("btn-panel-lookup").addEventListener("click", async () => {
    if (!state.phone || !state.workspaceId) return;
    const nonce = ++state.nonce;
    const btn = $("btn-panel-lookup");
    btn.disabled = true;
    setFeedback($("lookup-feedback"), "A pesquisar…");
    const r = await send({ type: "CONTACT_LOOKUP", workspaceId: state.workspaceId, phone: state.phone });
    if (nonce !== state.nonce) return; // resposta atrasada: descartar
    updateLookupButton();
    if (!r.ok) {
      setFeedback($("lookup-feedback"), lookupError(r.error), "error");
      if (r.error === "sessao_expirada") { state.authStatus = "disconnected"; renderAuth("disconnected"); }
      return;
    }
    renderList($("list-contacts"), r.contacts ?? [], "contacts", "company");
    renderList($("list-leads"), r.leads ?? [], "leads", "status");
    $("lookup-results").hidden = false;
    setFeedback($("lookup-feedback"), "Pesquisa concluída.", "ok");
  });
}

function send(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (r) => resolve(chrome.runtime.lastError || !r ? { ok: false, error: "erro_interno" } : r));
  }).catch(() => ({ ok: false, error: "erro_interno" }));
}

function renderAuth(status) {
  if (status !== state.authStatus) resetSession();
  state.authStatus = status;
  const [title, hint, dot] = AUTH_TEXT[status] ?? AUTH_TEXT.disconnected;
  $("auth-title").textContent = title;
  $("auth-hint").textContent = hint;
  $("auth-dot").className = "dot " + dot;
  $("btn-auth-login").hidden = status !== "disconnected";
  $("btn-auth-logout").hidden = status !== "connected";
  updateLookupButton();
}

/**
 * Sessão de autenticação da UI (v0.4.3): cada estado inicial, clique «Ligar», logout e
 * revogação abre uma nova época. Continuações assíncronas antigas são descartadas.
 * `loginOwner` = época dona do botão «Ligar» (só essa o reativa).
 */
state.authEpoch = 0;
state.loginOwner = 0;
const newAuthEpoch = () => ++state.authEpoch;
const isCurrentAuth = (epoch) => epoch === state.authEpoch;

function releaseLoginButton() {
  state.loginOwner = 0;
  $("btn-auth-login").disabled = false;
}

async function setupAuth() {
  const fb = $("auth-feedback");
  // Listeners registados primeiro: um estado inicial lento/antiquado não os impede.
  $("btn-auth-login").addEventListener("click", (e) => {
    const btn = e.currentTarget; // guardado sincronamente: o Chrome limpa currentTarget após o dispatch
    if (!isOAuthConfigured()) {
      // Build atual (inativa): nada é pedido ao Chrome nem ao service worker.
      newAuthEpoch();
      renderAuth("config_pending");
      setFeedback(fb, "A ligação ao FastCRM ainda não está disponível nesta versão. Use o fluxo manual.", "error");
      return;
    }
    const epoch = newAuthEpoch();
    state.loginOwner = epoch;
    btn.disabled = true;
    // Pedido de permissão DIRETAMENTE no gesto, antes de qualquer await ou mensagem.
    const granted = requestServerAccess(globalThis.chrome);
    return finishLogin(btn, granted, fb, epoch);
  });
  $("btn-auth-logout").addEventListener("click", async () => {
    const epoch = newAuthEpoch();
    releaseLoginButton();
    resetSession();
    try {
      const r = await sendAuth("AUTH_LOGOUT");
      if (!isCurrentAuth(epoch)) return;
      renderAuth(r.status);
      setFeedback(fb, "Ligação terminada.", "ok");
    } catch {
      if (!isCurrentAuth(epoch)) return;
      renderAuth(isOAuthConfigured() ? "disconnected" : "config_pending");
      setFeedback(fb, "Não foi possível confirmar o fim da ligação. Tente novamente.", "error");
    }
  });
  // Sem client_id público, o estado é sempre «configuração pendente» (não depende do SW).
  if (!isOAuthConfigured()) { renderAuth("config_pending"); return; }
  const epoch = newAuthEpoch();
  renderAuth("disconnected");
  let r;
  try { r = await sendAuth("AUTH_STATUS"); } catch { r = { status: "disconnected" }; }
  if (isCurrentAuth(epoch)) renderAuth(r.status);
}

async function finishLogin(btn, granted, fb, epoch) {
  try {
    const ok = await granted;
    if (!isCurrentAuth(epoch)) return; // logout/revogação/nova tentativa durante o pedido
    if (!ok) {
      renderAuth("disconnected");
      setFeedback(fb, AUTH_ERRORS.sem_permissao_servidor, "error");
      return;
    }
    const r = await sendAuth("AUTH_START");
    if (!isCurrentAuth(epoch)) return; // resposta antiga: nunca reabre «connected»
    renderAuth(r.status);
    setFeedback(fb, r.status === "connected" ? "Ligação estabelecida." : AUTH_ERRORS[r.error] ?? "Não foi possível ligar.", r.status === "connected" ? "ok" : "error");
  } catch {
    if (!isCurrentAuth(epoch)) return;
    renderAuth(isOAuthConfigured() ? "disconnected" : "config_pending");
    setFeedback(fb, "Não foi possível ligar. Tente novamente.", "error");
  } finally {
    if (state.loginOwner === epoch) { state.loginOwner = 0; btn.disabled = false; }
  }
}

/** Revogação no Chrome: limpar telefone, resultados e workspaces; respostas atrasadas descartadas. */
function onServerAccessRemoved(removed) {
  if (!isServerOriginRemoval(removed)) return;
  newAuthEpoch();
  releaseLoginButton();
  resetSession();
  state.authStatus = "";
  renderAuth(isOAuthConfigured() ? "disconnected" : "config_pending");
  setFeedback($("auth-feedback"), "O acesso ao servidor foi retirado no Chrome. Ligação terminada.", "error");
}

function setupPermissionWatch() {
  try { globalThis.chrome?.permissions?.onRemoved?.addListener(onServerAccessRemoved); } catch { /* sem API: nada a vigiar */ }
}

function setupRedirectUri() {
  const uri = oauthRedirectUri(globalThis.chrome);
  const fb = $("config-feedback");
  if (!uri) {
    $("config-redirect").textContent = "Indisponível neste contexto (abra o painel da extensão instalada).";
    return;
  }
  $("config-redirect").textContent = uri;
  const btn = $("btn-copy-redirect");
  btn.disabled = false;
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(uri);
      setFeedback(fb, "URI copiado.", "ok");
    } catch {
      setFeedback(fb, "Não foi possível copiar. Selecione e copie manualmente.", "error");
    }
  });
}

const SYNC_ERRORS = {
  sem_whatsapp: "Abra o WhatsApp Web num separador e escolha a conversa.",
  sem_permissao_whatsapp: "Sem autorização para ler o WhatsApp Web. Carregue de novo e aceite.",
  sem_mensagens: "Não encontrei mensagens de texto visíveis nesta conversa.",
  sem_numero: "Não consegui obter o número. Escreva-o no campo «Número» acima e tente de novo.",
};

function setupSync() {
  const btn = $("btn-sync-chat");
  const fb = $("sync-feedback");
  btn.addEventListener("click", async () => {
    if (!state.workspaceId) return;
    btn.disabled = true;
    try {
      const origin = "https://web.whatsapp.com/*";
      let granted = false;
      try { granted = await chrome.permissions.request({ origins: [origin] }); } catch { granted = false; }
      if (!granted) return setFeedback(fb, SYNC_ERRORS.sem_permissao_whatsapp, "error");
      const tabs = await chrome.tabs.query({ url: origin });
      const tab = tabs.find((t) => t.active) ?? tabs[0];
      if (!tab?.id) return setFeedback(fb, SYNC_ERRORS.sem_whatsapp, "error");
      setFeedback(fb, "A ler a conversa…");
      const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readOpenChat });
      const chat = res?.result;
      if (!chat?.messages?.length) return setFeedback(fb, SYNC_ERRORS.sem_mensagens, "error");
      const phone = chat.phone || state.phone;
      if (!phone) return setFeedback(fb, SYNC_ERRORS.sem_numero, "error");
      setFeedback(fb, `A guardar ${chat.messages.length} mensagens…`);
      const r = await send({ type: "SYNC_MESSAGES", workspaceId: state.workspaceId, phone, chatName: chat.chatName, messages: chat.messages });
      if (!r.ok) {
        setFeedback(fb, SYNC_ERRORS[r.error] ?? lookupError(r.error), "error");
        if (r.error === "sessao_expirada") { state.authStatus = "disconnected"; renderAuth("disconnected"); }
        return;
      }
      const who = r.linked === "contact" ? "ligada ao contacto" : r.linked === "lead" ? "ligada à lead" : "sem ficha associada";
      setFeedback(fb, `Guardadas ${r.inserted} novas (${r.skipped} já existiam), ${who}. Veja na Caixa de Entrada.`, "ok");
    } catch {
      setFeedback(fb, "Não foi possível guardar a conversa.", "error");
    } finally {
      updateLookupButton();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupSync();
  setupRedirectUri();
  $("config-origin").textContent = FASTCRM_ORIGIN;
  setupTabs();
  setupRoutes();
  setupPhone();
  setupPanelLookup();
  setupPermissionWatch();
  setupAuth();
});
