# FastCRM WhatsApp Pro — extensão Chrome/Edge (MV3) · v0.3.0

Painel lateral para trabalho **manual** junto do WhatsApp Web. Não publicado.

## O que faz
- Três secções: **Início** (atalhos), **Contacto** (validar número), **Configurações** (informação).
- Estado fixo: **«Sem ligação autenticada»** — a autenticação segura é da próxima fase.
- Atalhos para rotas confirmadas no código: Inbox `/dashboard/inbox`, Leads `/dashboard/leads`, Contactos `/dashboard/contacts`, Pipeline `/dashboard/opportunities`, Tarefas `/dashboard/tasks`, Entrar `/auth`, WhatsApp Web.
- Normaliza números para E.164 (9 dígitos PT → +351; prefixos `+` e `00`). «Copiar e pesquisar no FastCRM» copia por gesto explícito e abre `/dashboard/whatsapp-pro/lookup`, **sem telefone no URL**. Se a cópia falhar, não abre a página.
- Na nova página nativa, cole o número e clique **Pesquisar**. A sessão web existente consulta contactos/leads do workspace selecionado, sem carregar todos os registos. Os resultados e «Abrir ficha» existem apenas no website.

## O que NÃO faz (ainda)
- Não autentica nem consulta o FastCRM; nunca indica «contacto encontrado».
- Não lê conversas, cookies, sessões nem localStorage; sem content scripts nem scraping.
- Não envia mensagens; não faz pedidos de rede (CSP `connect-src 'none'`).
- A extensão continua sem autenticação. OAuth/PKCE é uma fase futura; não é necessário para este fluxo no website.
- Números guardados com espaços/separadores podem não corresponder. Zero resultados não prova inexistência.

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
- [ ] «Copiar e pesquisar no FastCRM» abre a página; colar e Pesquisar devolve dados reais do workspace com sessão iniciada.
- [ ] Recusar a cópia não abre a página nem mostra sucesso.
- [ ] Mudar workspace limpa telefone/resultados; consultas em atraso não reaparecem.
- [ ] Cada atalho abre a página certa do FastCRM.
- [ ] Consola do service worker sem erros.

## Validação v0.3.0 realizada nesta entrega
- Node: 8 testes passaram; sintaxe `node --check` passou; manifest MV3/paths/locale/ícones verificados.
- Vitest: 10 testes dedicados passaram (variantes, filtros server-side, limites, permissões, isolamento, erros e respostas tardias).
- ESLint focado: passou. Compilação gerida do preview: `build OK` (não se executou build/typecheck global manual).
- Chromium controlado com APIs Chrome simuladas: cópia correta, abertura só do destino fixo, recusa de clipboard sem abertura, sem overflow a 360px. **Não equivale a extensão instalada.**
- Sem sessão: o website redirecionou para `/auth?redirect=%2Fdashboard%2Fwhatsapp-pro%2Flookup`, sem telefone; nenhum erro JS observado.
- **Não executado:** pesquisa autenticada com dados reais, teste de RLS entre contas, instalação nativa Chrome/Edge e verificação visual da página autenticada em mobile. Não foi criada sessão/conta nem alterado qualquer dado.
