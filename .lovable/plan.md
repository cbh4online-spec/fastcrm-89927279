

# Meta Module — Fase 1: Connect + Leads + Inbox + Health

Este é um módulo gigante. A implementação será faseada. Este plano cobre **apenas a Fase 1** (o core comercial mínimo), que é o bloco com maior retorno imediato e menor risco técnico.

## Contexto existente no FastCRM

O projecto já tem infraestrutura reutilizável:
- **Instagram OAuth + webhook** (`instagram-oauth-callback`, `instagram-webhook`) — base parcial para o Meta Connect, mas limitada a 1 page/1 IG account e Graph API v18
- **Normalize layer** (`normalize-message.ts`) — inbox omnicanal pronto para novos canais
- **Kernel event bus** (`emitKernelEvent`) — sistema de eventos internos
- **Marketplace modules** (`workspace_modules`, `moduleNavRegistry`) — registo e ativação de módulos
- **Feature flags** (`workspace_feature_flags`) — controlo por plano

## Escopo da Fase 1

```text
Meta Module (Fase 1)
├── Connect Core (multi-page, multi-IG, asset discovery, health)
├── Leads (webhook leadgen, field mapping, dedup, reprocessamento)
├── Inbox (Messenger + IG DM via normalize layer existente)
└── Health & Logs (estado de ligação, webhook events, diagnóstico)
```

## 1. Schema de Base de Dados

### Tabelas novas (6)

| Tabela | Descrição |
|---|---|
| `meta_connections` | Ligações OAuth com token cifrado, scopes, health status |
| `meta_assets` | Pages, IG accounts, ad accounts, lead forms, pixels |
| `meta_leads` | Leads recebidos via Lead Ads com raw + normalized payload |
| `meta_webhook_events` | Log bruto de todos os webhooks recebidos |
| `meta_lead_field_mappings` | Mapeamento configurável campo Meta → campo CRM |
| `meta_module_config` | Config por workspace (feature flags, limites, preferências) |

Todas com `workspace_id`, RLS por workspace member, e índices nos campos de lookup.

A inbox (Messenger + IG DM) reutiliza as tabelas `conversations` e `messages` existentes via `normalize-message.ts`, com `channel = 'messenger' | 'instagram'`.

### Migrações
- Criar as 6 tabelas com RLS
- Registar `meta-module` na tabela `marketplace_modules` (seed data via insert tool)
- Ativar `pg_cron` para health check periódico

## 2. Edge Functions (7 novas)

| Função | Descrição |
|---|---|
| `meta-oauth-start` | Inicia Facebook Login for Business com scopes configuráveis, suporta multi-page |
| `meta-oauth-callback` | Troca code por token, descobre assets (Pages, IG, Lead Forms), guarda tudo |
| `meta-webhook-hub` | Endpoint único para todos os webhooks Meta (leadgen, messaging, page) com validação de assinatura e persistência bruta |
| `meta-lead-processor` | Processa leads da fila: recupera dados completos, normaliza, deduplica, cria/atualiza contacto e opcionalmente oportunidade |
| `meta-messenger-send` | Envia mensagens via Messenger/IG DM (reutiliza graph API com page token) |
| `meta-health-check` | Verifica tokens, permissões, webhook subscriptions, e atualiza `meta_connections.health_status` |
| `meta-asset-sync` | Sincroniza assets disponíveis da conta Meta (pages, forms, IG accounts) |

### Reutilização
- `meta-webhook-hub` substitui e expande o `instagram-webhook` existente para cobrir leadgen + messaging + page events
- Messenger/IG DM messages passam pelo `normalize-message.ts` existente
- `meta-messenger-send` segue o mesmo padrão do `instagram-send-message`

## 3. Páginas e Componentes UI

### Navegação
Registar no `moduleNavRegistry.ts`:
```
{ slug: "meta-module", label: "Meta", icon: Facebook, href: "/dashboard/meta", order: 43 }
```

### Rotas (em novo ficheiro `src/routes/MetaModuleRoutes.tsx`)
| Rota | Página |
|---|---|
| `/dashboard/meta` | Visão Geral (dashboard de KPIs) |
| `/dashboard/meta/connections` | Ligações (wizard de connect, lista de assets) |
| `/dashboard/meta/leads` | Leads (tabela com filtros, reprocessamento) |
| `/dashboard/meta/inbox` | Redireciona para inbox existente com filtro `?channel=messenger` |
| `/dashboard/meta/health` | Health & Logs (estado, webhook events, diagnóstico) |
| `/dashboard/meta/field-mapping` | Mapeamento de campos |

### Componentes principais (~15)
| Componente | Descrição |
|---|---|
| `MetaOverviewDashboard` | KPIs: leads 24h/7d/30d, mensagens por responder, health status |
| `MetaConnectWizard` | Wizard 3 passos: autenticar → selecionar assets → confirmar permissões |
| `MetaConnectionsList` | Lista de ligações com estado, ações (revalidar, desligar) |
| `MetaAssetSelector` | Seletor multi-page/multi-IG com checkboxes |
| `MetaLeadsTable` | Tabela com colunas: data, nome, form, campanha, estado, contacto CRM, ações |
| `MetaLeadDetailDrawer` | Drawer com raw payload, mapping aplicado, erros |
| `MetaFieldMappingEditor` | Interface visual para mapear campos Meta → campos CRM |
| `MetaHealthPanel` | Estado de cada ligação, último check, tokens, permissões |
| `MetaWebhookLog` | Tabela de webhook events com filtros e payload viewer |
| `MetaPermissionsCheck` | Checklist visual de permissões por bloco funcional |
| `MetaTokenStatus` | Badge com tempo até expiração + botão renovar |
| `MetaLeadReprocessButton` | Reprocessar leads falhados individualmente ou em batch |
| `MetaModuleLayout` | Layout com sidebar de navegação interna do módulo |
| `MetaEmptyState` | Estado vazio com CTA para ligar conta |
| `MetaConnectionCard` | Card individual de ligação (padrão do `InstagramConnectionCard` existente) |

## 4. Eventos Kernel

Registar no event bus:
- `META.CONNECTION_CREATED` / `META.CONNECTION_HEALTH_FAILED`
- `META.LEAD_RECEIVED` / `META.LEAD_PROCESSED` / `META.LEAD_FAILED`
- `META.MESSAGE_RECEIVED` / `META.MESSAGE_SENT`

## 5. Deduplicação de Leads

Hierarquia de match (configurável por workspace):
1. Email exato
2. Telefone normalizado
3. External social ID (Meta user ID)
4. Nome + telefone parcial + origem

Política: nunca apagar, fundir tags/notas, manter source lineage.

## 6. Segurança

- Tokens guardados na BD (campo `encrypted_access_token`); a cifra real via `pgcrypto` ou vault
- Webhook signature validation com `X-Hub-Signature-256` e `META_APP_SECRET`
- Rate limiting por workspace nos endpoints de envio
- RLS: workspace members podem ler, apenas service_role escreve webhook events
- Auditoria via `activity_logs` em ações críticas (connect, disconnect, reprocess)

## 7. Ficheiros a criar/editar

| Ficheiro | Tipo |
|---|---|
| `supabase/migrations/xxx_create_meta_module_tables.sql` | Migration |
| `supabase/functions/meta-oauth-start/index.ts` | Edge Function |
| `supabase/functions/meta-oauth-callback/index.ts` | Edge Function |
| `supabase/functions/meta-webhook-hub/index.ts` | Edge Function |
| `supabase/functions/meta-lead-processor/index.ts` | Edge Function |
| `supabase/functions/meta-messenger-send/index.ts` | Edge Function |
| `supabase/functions/meta-health-check/index.ts` | Edge Function |
| `supabase/functions/meta-asset-sync/index.ts` | Edge Function |
| `src/routes/MetaModuleRoutes.tsx` | Routes |
| `src/pages/meta/*.tsx` (6 páginas) | Pages |
| `src/components/meta/*.tsx` (~15 componentes) | Components |
| `src/hooks/useMeta*.ts` (5-6 hooks) | Hooks |
| `src/config/moduleNavRegistry.ts` | Edit (add entry) |
| `src/routes/CRMRoutes.tsx` | Edit (add MetaModuleRoutes) |
| `supabase/config.toml` | Edit (verify_jwt = false for meta functions) |

## 8. Sequência de implementação

Dado o volume, a Fase 1 será implementada em **3 blocos**:

**Bloco A** — Schema + Connect Core
- Criar todas as tabelas
- Edge functions de OAuth e asset discovery
- UI de Connect Wizard + lista de ligações

**Bloco B** — Leads + Webhook
- Webhook hub com signature validation
- Lead processor com dedup e field mapping
- UI de leads table + field mapping editor

**Bloco C** — Inbox integration + Health
- Expandir webhook hub para messaging
- Integrar Messenger/IG DM no normalize layer
- Meta send message
- Health check + health panel UI
- Dashboard overview

## Fases futuras (fora deste plano)

- Fase 2: Publisher + Comments + Calendário editorial
- Fase 3: Ads Manager Lite + Conversions API
- Fase 4: IA (classificação, reply assist, recommendations)

