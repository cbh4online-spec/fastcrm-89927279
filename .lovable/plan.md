# Auditoria somente leitura — RLS 0079, extensão MV3 e especificação da Iteração 2

Nenhuma alteração foi feita nesta auditoria. Este plano só propõe passos; nada é executado sem aprovação explícita por item.

## 1. Impacto real da migração 0079 (aplicada em produção indevidamente)

Origem: commit `cb58ef57d` (merge «Validou persistência iter 1»). Inclui `drizzle/migrations/0079_tighten_rls_tautology_policies.sql`, o snapshot e o journal. Políticas atuais confirmadas por leitura em `pg_policy`.

| Tabela | Antes | Depois | Quem a usa | Impacto | Gravidade |
|---|---|---|---|---|---|
| `event_registry` | SELECT para qualquer `authenticated` | SELECT só `is_super_admin` | `useEventRegistry` → `EventMapPage` (`/dashboard/system/events`, sem guard de super admin na rota), `KernelAdminPage`. Edge functions `kernel-*` usam service_role e não são afetadas. | Admins de workspace que não sejam super admin passam a ver o mapa de eventos vazio, sem mensagem de erro. Por confirmar: se algum cliente usa esta página. | Médio (falha silenciosa, sem perda de dados) |
| `fastmatch_reputation_reviews` | SELECT `USING (true)` («Anyone can view reviews») | membros do workspace, super admin, avaliador ou avaliado | `useFastMatchReviews` (`ConnectionCard`, `ReputationReviewDialog`) | **Regressão real.** Depois de inserir uma avaliação, o cliente recalcula a média com `select rating where reviewed_profile_id = X` e escreve `fastmatch_profiles.reputation_score`. Quem avalia de outro workspace já só vê as suas próprias avaliações, por isso a média fica errada (por exemplo, a de 1 avaliação) e é gravada no perfil. A lista de avaliações de um perfil de outro workspace também fica incompleta. | **Alto** (corrompe dados que se veem) |
| `c2c_public_offers` | INSERT `WITH CHECK (true)` para anon/authenticated | INSERT com validação (nome 1–200, email regex, preços ≥0, moeda 1–8, telefone ≤30, mensagem ≤2000, status permitido) | `useCreateC2CPublicOffer` ← `C2CPublicOfferDialog` | O formulário já envia campos compatíveis (nome com trim, email com regex equivalente, status omitido). Sem regressão esperada. **Problema anterior à 0079:** o insert faz `.select().single()`, mas o anon não tem política SELECT (só o vendedor tem). Por isso, para compradores sem sessão, a oferta pode falhar ou devolver erro. O mesmo acontece com o insert seguinte em `c2c_notifications`. Por verificar com dados reais. | Baixo (0079) / Médio (bug anterior) |

Conclusões:
- Nenhum aviso de segurança deve ser marcado como resolvido. Os três achados ficam «em revisão».
- Não foi feito rollback nem nova migração, como pedido.
- Correção recomendada (a aprovar à parte):
  - fastmatch: mover o recálculo da reputação para o servidor (trigger ou RPC SECURITY DEFINER que agrega todas as avaliações), em vez de reabrir o SELECT.
  - event_registry: decidir se é catálogo para admins de workspace e, se for, permitir SELECT a `authenticated`, porque não contém dados de tenant. Ou então proteger a rota com guard de super admin.
  - c2c: trocar `.select().single()` por insert sem returning (ou RPC) e mover a notificação para o servidor.

## 2. Auditoria da extensão MV3 (commit cb58ef57d)

Ficheiros reais em `extensions/fastcrm-whatsapp-pro/`: `manifest.json`, `background.js`, `sidepanel.html/js/css`, `_locales/pt_PT/messages.json`, `README.md`, `icons/icon16.png`, `icon48.png` e `icon128.png` (incluídos no commit), e ainda `docs/fastcrm-whatsapp-pro/IMPLEMENTACAO.md`.

- Manifest: `manifest_version: 3`, versão 0.1.1, `default_locale pt_PT`, `permissions: ["storage","sidePanel"]`, `host_permissions: []`, sem content scripts, service worker `background.js`, `side_panel.default_path: sidepanel.html`. Os ícones referenciados existem.
- Caminhos usados pela extensão: `/auth` existe (`DashboardCoreRoutes.tsx:64`), `/dashboard/inbox` existe (`CommunicationRoutes.tsx:52`). URL base por omissão: `https://fastcrm.metodopare.ai`.
- `background.js` só abre separadores `https://`. Não lê cookies nem tokens e não faz fetch cross-origin.
- Pontos fracos para corrigir na Iteração 2:
  - A URL base é configurável e só valida `https://`. Deve passar a usar uma allowlist fixa: `fastcrm.metodopare.ai`, `fastcrm.lovable.app` e o preview.
  - O handler `onMessage` não verifica `sender.id`. Baixo risco, porque não há `externally_connectable`, mas convém validar.
- Chrome 114+ e Edge 114+ suportam `sidePanel`. A instalação é por «Load unpacked».
- **Não foi feito nenhum teste em browser real.** O carregamento só foi validado de forma estática (JSON e sintaxe).

## 3. Especificação mínima da Iteração 2

### Autenticação: authorization code + PKCE com `chrome.identity.launchWebAuthFlow`

```text
Painel -> launchWebAuthFlow(https://fastcrm.metodopare.ai/ext/authorize?client_id=fastcrm-wa-pro
          &redirect_uri=https://<ext-id>.chromiumapp.org/cb&code_challenge=S256(..)&state=..)
FastCRM (/ext/authorize, utilizador com sessão normal) -> ecrã de consentimento -> edge function
          ext-auth-issue-code: grava code de uso único (hash, TTL 60s, user_id, workspace_id, challenge, ext_id)
Redirect -> https://<ext-id>.chromiumapp.org/cb?code=..&state=..
Painel -> POST ext-auth-token {code, code_verifier} -> valida challenge, consome code (atómico)
          -> devolve token de acesso próprio da extensão (curto, 15 min, scope contacts:read)
             + refresh rotativo (hash em BD, revogável)
```

- Nunca ler o localStorage nem o JWT da app web. Nunca usar service_role no browser. O token fica em `chrome.storage.session` (o refresh fica em `storage.local`).
- `host_permissions` ficam limitadas ao domínio das edge functions e da app (allowlist fixa).
- Backend necessário (a aprovar):
  - tabelas `extension_auth_codes` e `extension_sessions` (RLS ligado e sem políticas para clientes; acesso só por service_role, com GRANT a service_role);
  - página `/ext/authorize`;
  - edge functions `ext-auth-issue-code`, `ext-auth-token`, `ext-auth-revoke`;
  - registo de auditoria em `activity_logs`;
  - ecrã «Sessões de extensão» com botão para revogar.

### Consulta só de leitura de contactos

- Edge function `ext-contact-lookup` (POST `{phone}`):
  - valida o token da extensão (assinatura, expiração, revogação);
  - confirma que o utilizador ainda é membro do workspace e tem a capacidade de ler contactos (`requireCapability`);
  - normaliza o número com `phoneOptOutVariants`;
  - devolve só campos mínimos: nome, empresa, gestor, próxima tarefa, link para a ficha e estado de opt-out (WhatsApp).
- Os dados ficam limitados ao workspace do token. Para respeitar a RLS, a consulta corre com o cliente criado a partir do JWT do utilizador, ou com service_role com filtro explícito de `workspace_id` e verificação de membro.
- Limite de pedidos por utilizador (por exemplo, 30 por minuto) e registo de cada pesquisa.
- Na UI, o utilizador escreve ou cola o número e confirma manualmente antes de pesquisar. Sem scraping do WhatsApp, sem content scripts e sem envios.

### Critérios de aceitação
- O code só serve uma vez e expira em 60s. Um PKCE errado é recusado.
- Um token revogado deixa de funcionar de imediato. Mudar de workspace invalida o token.
- Um utilizador do workspace A não obtém contactos do workspace B (testes com dois utilizadores).
- Instalação manual registada em Chrome e Edge, com capturas, antes de se dar como testada.

## 4. Parecer

- **Extensão, Iteração 2 (só frontend e allowlist): GO**, com allowlist fixa e verificação de `sender.id`.
- **Backend da Iteração 2 (auth e consulta): GO condicionado.** Só arranca com aprovação explícita da migração e das edge functions listadas acima, testadas primeiro num rascunho isolado.
- **Plataforma, antes de mais nada: NO-GO a novas mudanças de RLS** até ser corrigida a regressão de reputação do fastmatch (Alto) e decidida a visibilidade do `event_registry`. Cada uma é uma alteração separada e precisa de autorização própria.
