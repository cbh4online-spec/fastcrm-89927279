/**
 * Preflight administrativo do piloto OAuth (v0.4.1). Só Node standard, sem rede, sem segredos.
 * Lê ficheiros locais e indica PASS/FAIL. Nunca imprime valores de client_id, chaves ou tokens.
 *
 * Uso: node scripts/pilot-preflight.mjs [--expect=safe|pilot]
 *   safe  (omissão): exige o estado fail-closed (PUBLIC_CLIENT_ID vazio, API_READY=false).
 *   pilot: só para uma build piloto aprovada; exige client_id com formato válido.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "https://eumnfkccyvlyoyjchiwe.supabase.co";
const EXPECTED_PERMISSIONS = ["storage", "sidePanel", "identity"];
const EXPECTED_CSP = `script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; connect-src ${HOST}; form-action 'none'`;

const read = async (p) => { try { return await fs.readFile(p, "utf8"); } catch { return null; } };
const constValue = (src, name) => {
  const m = src?.match(new RegExp(`export const ${name}\\s*=\\s*([^;\\n]+)`));
  return m ? m[1].trim() : null;
};

export async function runPreflight({ root = here, repoRoot = path.resolve(root, "../.."), expect = "safe" } = {}) {
  const checks = [];
  const add = (group, name, ok, detail = "") => checks.push({ group, name, ok: !!ok, detail });

  const manifestRaw = await read(path.join(root, "manifest.json"));
  let m = null;
  try { m = JSON.parse(manifestRaw); } catch { /* fica null */ }
  add("manifest", "Manifest V3 válido", m?.manifest_version === 3);
  add("manifest", "Permissões exatas storage+sidePanel+identity", JSON.stringify(m?.permissions) === JSON.stringify(EXPECTED_PERMISSIONS));
  add("manifest", "host_permissions só o backend FastCRM", JSON.stringify(m?.host_permissions) === JSON.stringify([`${HOST}/*`]));
  add("manifest", "CSP exata (connect-src só backend)", m?.content_security_policy?.extension_pages === EXPECTED_CSP);
  add("manifest", "Sem content scripts / externally_connectable / key ad hoc", m && !m.content_scripts && !m.externally_connectable && !m.key);
  add("manifest", "Service worker e side panel definidos", m?.background?.service_worker === "background.js" && m?.side_panel?.default_path === "sidepanel.html");
  const pkg = JSON.parse((await read(path.join(root, "package.json"))) ?? "{}");
  add("manifest", "Versão manifest = package.json", m?.version && m.version === pkg.version, m?.version ?? "");

  const cfg = await read(path.join(root, "lib/oauth-config.js"));
  const clientRaw = constValue(cfg, "PUBLIC_CLIENT_ID");
  const apiReady = constValue(cfg, "API_READY");
  const requiresKey = constValue(cfg, "API_REQUIRES_PUBLIC_KEY");
  const scopes = constValue(cfg, "SCOPES");
  const clientEmpty = clientRaw === '""' || clientRaw === "''";
  const clientFormatOk = /^["'][A-Za-z0-9._-]{8,128}["']$/.test(clientRaw ?? "");
  add("config", "Scope apenas \"email\"", scopes === '"email"');
  add("config", "Endpoints OAuth fixos no backend", cfg?.includes('AUTH_ORIGIN = "' + HOST + '"') && cfg.includes('"/auth/v1/oauth/authorize"') && cfg.includes('"/auth/v1/oauth/token"'));
  add("config", "Sem client_secret/service_role no código", !/client_secret\s*[:=]\s*["'][^"']+|service_role|sb_secret_/i.test(cfg ?? ""));
  if (expect === "safe") {
    add("fail-closed", "PUBLIC_CLIENT_ID vazio", clientEmpty);
    add("fail-closed", "API_READY=false", apiReady === "false");
  } else {
    add("pilot", "PUBLIC_CLIENT_ID com formato válido", clientFormatOk);
    add("pilot", "API_READY explícito (true/false)", apiReady === "true" || apiReady === "false");
  }
  add("config", "API_REQUIRES_PUBLIC_KEY=false (sem chave embutida)", requiresKey === "false");

  const oauthClient = await read(path.join(root, "lib/oauth-client.js"));
  add("segurança", "Tokens só em storage.session", oauthClient?.includes("storage.session") && !/storage\.(local|sync)/.test(oauthClient));
  add("segurança", "Proteção de corrida login/logout (geração + fila)", oauthClient?.includes("generation") && oauthClient.includes("login_em_curso") && oauthClient.includes("serial("));
  const messages = await read(path.join(root, "lib/messages.js"));
  add("segurança", "Nenhuma mensagem expõe token", messages && !/TOKEN/.test(messages.match(/MESSAGE_TYPES[^\n]+/)?.[0] ?? "TOKEN"));

  for (const f of ["scripts/package-extension.mjs", "background.js", "sidepanel.html", "sidepanel.js", "lib/oauth-pkce.js", "lib/sw-handlers.js", "lib/extension-api.js"]) {
    add("ficheiros", `Existe ${f}`, (await read(path.join(root, f))) !== null);
  }

  // Opcional: só quando corrido dentro do repositório (não depende de src/ ao distribuir).
  const consent = await read(path.join(repoRoot, "src/pages/OAuthConsentPage.tsx"));
  const docs = await read(path.join(repoRoot, "docs/fastcrm-whatsapp-pro/PILOTO-OAUTH-ATIVACAO.md"));
  const repoChecks = consent !== null || docs !== null;
  if (repoChecks) {
    add("repositório", "Página de consentimento existe", consent !== null);
    add("repositório", "Guia PILOTO-OAUTH-ATIVACAO.md existe", docs !== null);
  }

  const active = {
    oauth: clientFormatOk ? "configurado (client_id presente)" : "inativo (config_pending)",
    apiPainel: apiReady === "true" && clientFormatOk ? "ativo na build" : "inativo",
    backend: "não verificado (o preflight não contacta o servidor)",
  };
  return { ok: checks.every((c) => c.ok), expect, checks, active, repoChecks };
}

export function formatReport(r) {
  const lines = [`FastCRM WhatsApp Pro — preflight do piloto (modo: ${r.expect === "safe" ? "estado seguro" : "build piloto"})`, ""];
  for (const c of r.checks) lines.push(`${c.ok ? "PASS" : "FAIL"}  [${c.group}] ${c.name}${c.detail ? ` (${c.detail})` : ""}`);
  if (!r.repoChecks) lines.push("INFO  Verificações do repositório ignoradas (pasta src/docs não disponível).");
  lines.push("", "Estado:", `  Login OAuth: ${r.active.oauth}`, `  Pesquisa no painel: ${r.active.apiPainel}`, `  Backend: ${r.active.backend}`);
  lines.push("", r.ok ? "RESULTADO: PASS" : "RESULTADO: FAIL");
  return lines.join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv.find((a) => a.startsWith("--expect="));
  const expect = arg?.split("=")[1] === "pilot" ? "pilot" : "safe";
  runPreflight({ expect }).then((r) => { console.log(formatReport(r)); process.exitCode = r.ok ? 0 : 1; })
    .catch(() => { console.error("Preflight falhou ao ler ficheiros."); process.exitCode = 1; });
}
