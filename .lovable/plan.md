
# Hardening Sprint — FastCRM

## Diagnóstico Inicial
- **508 edge functions** no projecto, apenas 27 têm config explícita em `config.toml` (26 com `verify_jwt=false`, 1 com `true`)
- As restantes ~481 funções usam o default do Lovable Cloud (`verify_jwt=false` implícito)
- O route manifest tem ~100 entradas bem estruturadas com testes existentes
- Testes de navegação existem mas cobrem apenas integridade do manifesto, não fluxos de negócio

## Fase 1 — Segurança de Edge Functions (Prioridade Máxima)

### 1.1 Classificação das 27 funções configuradas explicitamente

| Função | Classificação | Decisão |
|--------|--------------|---------|
| `fastmatch-score` | private-authenticated | Manter verify_jwt=false (padrão Lovable), validar JWT em código |
| `whatsapp-evolution-webhook` | public-webhook | Manter sem JWT, adicionar validação de assinatura |
| `whatsapp-evolution-send` | private-authenticated | Validar JWT em código |
| `whatsapp-qr-sync` | private-authenticated | Validar JWT em código |
| `whatsapp-qr-reconnect` | private-authenticated | Validar JWT em código |
| `google-calendar-sync` | private-authenticated | Validar JWT em código |
| `google-calendar-webhook` | public-webhook | Manter sem JWT, validar assinatura Google |
| `csv-url-fetch` | private-authenticated | Validar JWT em código |
| `public-booking` | public-tokenized | Manter sem JWT, validar token assinado |
| `process-email-queue` | private-authenticated | Já tem verify_jwt=true ✓ |
| `send-transactional-email` | private-authenticated | Validar JWT/service-role em código |
| `preview-transactional-email` | private-authenticated | Validar JWT em código |
| `handle-email-unsubscribe` | public-tokenized | Token de unsubscribe |
| `handle-email-suppression` | public-webhook | Validar assinatura do provider |
| `event-reminder-cron` | internal-cron | Validar service_role |
| `stripe-renewal-webhook` | public-webhook | Validar assinatura Stripe |
| `meta-oauth-start/callback` | public-tokenized | State CSRF token |
| `meta-webhook-hub` | public-webhook | Validar assinatura Meta |
| `meta-lead-processor` | private-authenticated | Validar JWT |
| `meta-messenger-send` | private-authenticated | Validar JWT |
| `meta-health-check` | private-authenticated | Validar JWT |
| `meta-asset-sync` | private-authenticated | Validar JWT |
| `instagram-oauth-start/callback` | public-tokenized | State CSRF token |
| `ebook-generate` | private-authenticated | Validar JWT |
| `marketing-mcp` | private-authenticated | Validar JWT |

### 1.2 Criar módulo partilhado de segurança
- `supabase/functions/_shared/security.ts` — helpers para:
  - `validateJWT(req)` — wrapper de getClaims
  - `validateWebhookSignature(req, secret)` — HMAC validation
  - `rateLimit(key, maxPerMinute)` — rate limiting básico com KV/DB
  - `validatePayload(schema, body)` — Zod validation wrapper
  - `securityLog(event)` — log estruturado

### 1.3 Implementar mitigações nas funções públicas prioritárias
- Webhooks: validação de assinatura + payload + anti-replay
- Tokenized: validação de token JWT/assinado
- Funções privadas: adicionar getClaims() guard

## Fase 2 — Testes Críticos

### 2.1 Testes unitários
- `src/test/guards/ModuleGuard.test.tsx` — testa rendering com/sem módulo
- `src/test/hooks/useMenuPermissions.test.ts` — testa lógica de permissões
- `src/test/security/edgeFunctionClassification.test.ts` — valida classificação

### 2.2 Testes de navegação expandidos
- Verificar que rotas com `:id` params não aparecem no sidebar
- Verificar coerência moduleSlug vs moduleNavRegistry
- Verificar que menuKey referencia chaves válidas em MENU_KEYS

## Fase 3 — Consistência de Navegação

### 3.1 Validações adicionais ao manifesto
- Cross-reference moduleSlug com moduleNavRegistry
- Cross-reference menuKey com MENU_KEYS
- Verificar rotas com params dinâmicos (:id) têm visibleInSidebar=false

## Fase 4 — Qualidade Operacional

### 4.1 Quality Gates
- Documentar no README: `bun run lint`, `bun run test`, `bun run build`
- Garantir que todos passam

## Restrições
- Não alterar comportamento de negócio existente
- Mudanças pequenas, testáveis e reversíveis
- Edge functions: seguir padrão Lovable (verify_jwt=false no deploy, validação em código)
