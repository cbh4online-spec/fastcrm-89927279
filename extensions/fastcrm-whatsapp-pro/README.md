# FastCRM WhatsApp Pro — extensão Chrome/Edge (MV3) · v0.2.0

Painel lateral para trabalho **manual** junto do WhatsApp Web. Não publicado.

## O que faz
- Três secções: **Início** (atalhos), **Contacto** (validar número), **Configurações** (informação).
- Estado fixo: **«Sem ligação autenticada»** — a autenticação segura é da próxima fase.
- Atalhos para rotas confirmadas no código: Inbox `/dashboard/inbox`, Leads `/dashboard/leads`, Contactos `/dashboard/contacts`, Pipeline `/dashboard/opportunities`, Tarefas `/dashboard/tasks`, Entrar `/auth`, WhatsApp Web.
- Normaliza números para E.164 (9 dígitos PT → +351; prefixos `+` e `00`), copia só após clique e abre a **listagem** de Contactos para pesquisa manual (a página não lê parâmetros de pesquisa do endereço, por isso o número nunca vai no URL).

## O que NÃO faz (ainda)
- Não autentica nem consulta o FastCRM; nunca indica «contacto encontrado».
- Não lê conversas, cookies, sessões nem localStorage; sem content scripts nem scraping.
- Não envia mensagens; não faz pedidos de rede (CSP `connect-src 'none'`).

## Segurança
- Permissões: `storage`, `sidePanel`. Sem `host_permissions`, `tabs`, `cookies`, `scripting`. (`chrome.tabs.create` não exige permissão `tabs`; a cópia usa `navigator.clipboard` com gesto do utilizador.)
- Allowlist em `lib/urls.js`: origem `https://fastcrm.metodopare.ai` + rotas fixas, sem query/hash/credenciais; WhatsApp Web só na raiz. O URL deixou de ser configurável.
- `background.js` rejeita mensagens com `sender.id` diferente, vindas de separadores, tipo desconhecido ou URL fora da allowlist.
- Override DEV: editar `DEV_EXTRA_ORIGINS` numa cópia local; manter vazio no repositório (há teste que o garante).

## Testes automáticos
```bash
cd extensions/fastcrm-whatsapp-pro
node --test tests/*.test.js
for f in background.js sidepanel.js lib/*.js; do node --check "$f"; done
node -e 'JSON.parse(require("fs").readFileSync("manifest.json"))'
```

## Instalação manual (Chrome/Edge 116+)
1. `chrome://extensions` ou `edge://extensions` → ativar **Modo de programador**.
2. **Carregar sem compactação** → escolher `extensions/fastcrm-whatsapp-pro/`.
3. Clicar no ícone → abre o painel lateral.

## Checklist manual (por preencher por quem testar — ainda não executado)
- [ ] Carrega sem erros em Chrome e Edge.
- [ ] Separadores navegáveis por rato e setas.
- [ ] `912345678` → `+351912345678`; `812345678` → erro.
- [ ] «Copiar número» cola o valor certo.
- [ ] Cada atalho abre a página certa do FastCRM.
- [ ] Consola do service worker sem erros.
