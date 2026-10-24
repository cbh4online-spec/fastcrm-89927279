# FastCRM WhatsApp Pro — Registo de Implementação

## Iteração 1 — Extensão Chrome/Edge (prova de conceito)

Data: 2026-10-24 (recriada após perda de ficheiros por incidente da plataforma)

### Estado base do repositório (verificado antes de editar)

- Projeto: CRM SaaS multi-tenant (React 18 + Vite 5 + TS 5, backend Lovable Cloud/Supabase).
- Autenticação: `src/contexts/AuthContext.tsx` (Supabase Auth, `onAuthStateChange` antes de `getSession`).
- Workspace/RBAC: `src/contexts/WorkspaceContext.tsx`, capabilities em `src/lib/permissions/capabilities.ts` (SSoT, espelhada em `supabase/functions/_shared/capabilities.ts`).
- WhatsApp existente: `src/integrations/whatsapp/*` (adapters Z-API/Zapy/Mock), edge function canónica `whatsapp-pro-send`, hook `useSendWhatsApp`; omnichannel em `src/integrations/communication/*`.
- Inbox, leads, contactos, oportunidades, Kanban, templates e motor WhatsApp já em produção.
- **Não existia** nenhuma extensão de browser no repositório (sem `extensions/`, sem `manifest_version` em lado nenhum).

### Decisões de arquitetura desta iteração

1. Diretório isolado `extensions/fastcrm-whatsapp-pro/` — fora de `src/`, sem impacto no build Vite principal.
2. JavaScript puro, zero dependências npm, sem build step — carrega diretamente como unpacked extension.
3. Manifest V3 com `side_panel` nativo (Chrome 114+, Edge 114+) e `default_locale: pt_PT` com `_locales/pt_PT/messages.json` correspondente.
4. Permissões mínimas: `storage` + `sidePanel`. Sem `host_permissions`, sem content scripts.
5. Estado fixo **«Não ligado»**: sem `host_permissions`, um fetch cross-origin falharia por CORS e seria indistinguível de indisponibilidade real — a «verificação de sessão» por HEAD foi removida. A sessão vive no separador da app e nunca é lida nem deduzida pela extensão. O painel oferece apenas «Abrir página de entrada do FastCRM» (`/auth`).
6. URL do FastCRM configurável, validado (`https://` apenas, normalizado a origem), persistido em `chrome.storage.local`. Na iteração autenticada passará a lista fechada de origens (allowlist).
7. Abertura de separadores mediada pelo service worker com validação de esquema (`https://` apenas).

### Limites de segurança respeitados

- Sem cookies/tokens em content scripts (não há content scripts de todo).
- Sem scraping de mensagens.
- Sem automação de DOM no WhatsApp Web.
- Sem envio automático (envios futuros serão assistidos, via motor WhatsApp do FastCRM).
- Sem fetch cross-origin nem chamadas ao backend nesta fase.
- Sem URLs privados nem segredos no código.
- Nenhuma alteração a schema, migrations, SQL, edge functions, `.env` ou operações existentes.

### Ficheiros criados

| Ficheiro | Função |
| --- | --- |
| `extensions/fastcrm-whatsapp-pro/manifest.json` | Manifest V3 (side panel, permissões mínimas, locale pt_PT) |
| `extensions/fastcrm-whatsapp-pro/background.js` | Service worker: abrir painel, abrir separadores https |
| `extensions/fastcrm-whatsapp-pro/sidepanel.html` | UI do painel (PT-PT) |
| `extensions/fastcrm-whatsapp-pro/sidepanel.js` | Lógica: config, ações seguras |
| `extensions/fastcrm-whatsapp-pro/sidepanel.css` | Estilos |
| `extensions/fastcrm-whatsapp-pro/icons/icon16/48/128.png` | Ícones gerados |
| `extensions/fastcrm-whatsapp-pro/_locales/pt_PT/messages.json` | Locale por omissão |
| `extensions/fastcrm-whatsapp-pro/README.md` | Build, teste, roadmap de integração |
| `docs/fastcrm-whatsapp-pro/IMPLEMENTACAO.md` | Este registo |

### Testes executados

- Validação estática: `manifest.json` e `messages.json` parseados como JSON válido; asserções de `manifest_version == 3`, permissões == `{storage, sidePanel}`, `host_permissions` vazio, sem `content_scripts`.
- Sintaxe JS verificada com `node --check` em `background.js` e `sidepanel.js`.
- Existência dos ficheiros confirmada em disco após escrita.

**Não verificado:** instalação real em Chrome/Edge (requer browser com GUI fora do sandbox). O passo «Load unpacked» está documentado no README e deve ser executado manualmente antes de se considerar a extensão testada.

### Checklist verificável

- [x] Manifest V3 válido com `side_panel` e `default_locale` + `_locales/pt_PT`
- [x] Permissões mínimas (`storage`, `sidePanel`)
- [x] Zero content scripts / zero host_permissions / zero fetch cross-origin
- [x] Interface PT-PT
- [x] Estado «Não ligado» fixo — nenhuma rotulagem de sessão deduzida
- [x] URL FastCRM configurável e validado (https apenas, normalizado a origem)
- [x] Sem segredos nem URLs privados
- [x] Sem alterações a backend/schema/operações
- [x] Documentação de build e teste
- [ ] Instalação real em Chrome/Edge (pendente — manual)
- [ ] Integração autenticada com backend (Iteração 2)

### Próximos passos (Iteração 2, não iniciada)

1. Teste manual «Load unpacked» e captura de evidências.
2. Desenho do fluxo de autenticação seguro (login via página FastCRM, token de curta duração via fluxo oficial, allowlist de origens).
3. API oficial de leitura de contexto (contacto/lead) para o painel, via edge functions com JWT e RBAC por workspace.
4. Ações assistidas com confirmação explícita (criar lead/tarefa; envios sempre via motor WhatsApp do FastCRM).
