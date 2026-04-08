

# Hardening Sprint — Fase 2: Aplicação Progressiva de Segurança

## Diagnóstico Actual

Após análise das 27 edge functions explícitas no `config.toml`, o estado actual é:

| Função | Estado Auth | Acção Necessária |
|--------|------------|------------------|
| **whatsapp-evolution-send** | `getClaims()` via `evolution-api.ts` | Nenhuma (já protegida) |
| **whatsapp-qr-sync** | `validateAuth()` via `evolution-api.ts` | Nenhuma (já protegida) |
| **whatsapp-qr-reconnect** | `validateAuth()` via `evolution-api.ts` | Nenhuma (já protegida) |
| **fastmatch-score** | `getUser()` (padrão antigo) | Migrar para `requireAuth()` |
| **google-calendar-sync** | Sem auth visível nos primeiros 30 linhas | Adicionar `requireAuth()` |
| **csv-url-fetch** | Sem auth | Adicionar `requireAuth()` |
| **ebook-generate** | Sem auth visível | Adicionar `requireAuth()` |
| **meta-lead-processor** | Sem auth (usa service_role directo) | Adicionar `requireAuth()` ou `service_role` guard |
| **meta-messenger-send** | Auth manual (getClaims inline) | Migrar para `requireAuth()` |
| **meta-health-check** | Sem auth (pode ser cron) | Adicionar `requireAuth()` ou `service_role` guard |
| **meta-asset-sync** | Auth manual inline | Migrar para `requireAuth()` |
| **marketing-mcp** | Auth própria inline | Migrar para `requireAuth()` |
| **send-transactional-email** | Sem auth JWT (usa service_role) | Adicionar guard `service_role` |
| **preview-transactional-email** | `LOVABLE_API_KEY` guard | Nenhuma (protegida por API key) |
| **event-reminder-cron** | Sem auth (cron) | Adicionar guard `service_role` |
| **process-email-queue** | `verify_jwt=true` | Nenhuma |

**Webhooks (já com proteção ou a reforçar):**
| Função | Estado | Acção |
|--------|--------|-------|
| **stripe-renewal-webhook** | `constructEvent()` com `STRIPE_RENEWAL_WEBHOOK_SECRET` (condicional!) | Tornar verificação obrigatória |
| **meta-webhook-hub** | `verifySignature()` própria com HMAC-SHA256 | Migrar para `verifyWebhookSignature()` partilhada |
| **whatsapp-evolution-webhook** | Sem verificação de assinatura | Adicionar verificação (Evolution API secret) |
| **google-calendar-webhook** | Sem verificação (usa channel token) | Adequada (Google Push não usa HMAC) |
| **handle-email-suppression** | `verifyWebhookRequest()` da `@lovable.dev/webhooks-js` | Nenhuma (já protegida) |
| **handle-email-unsubscribe** | Token-based via query param | Adequada |

---

## Plano de Implementação

### Tarefa 1 — Reforçar `requireAuth()` nas funções private-authenticated (6 funções)

Aplicar `requireAuth()` do módulo `_shared/security.ts` nas funções que actualmente não têm auth ou usam padrões inconsistentes:

- **csv-url-fetch**: Adicionar `requireAuth()` no início do handler
- **ebook-generate**: Adicionar `requireAuth()` + workspace membership
- **google-calendar-sync**: Adicionar `requireAuth()` no início
- **meta-lead-processor**: Adicionar guard `service_role` (é chamada internamente, não pelo frontend)
- **meta-health-check**: Adicionar guard `service_role` (pode ser cron/interno)
- **event-reminder-cron**: Adicionar guard `service_role` (é cron)

Para funções que já têm auth inline (meta-messenger-send, meta-asset-sync, marketing-mcp, fastmatch-score), migrar para `requireAuth()` numa segunda passagem para consistência.

**Padrão de implementação para funções chamadas pelo frontend:**
```typescript
import { requireAuth, securityLog, getClientIP } from "../_shared/security.ts";

// No início do handler, antes de qualquer lógica:
const auth = await requireAuth(req);
securityLog({ event: "auth_success", functionName: "nome-da-funcao", userId: auth.userId, ip: getClientIP(req) });
```

**Padrão para funções internas (cron/service_role):**
```typescript
const authHeader = req.headers.get("Authorization");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}
```

### Tarefa 2 — Webhook signature verification (3 funções)

**stripe-renewal-webhook**: Tornar a verificação de assinatura obrigatória (actualmente é condicional — se `webhookSecret` não existir, aceita JSON cru sem verificação). Rejeitar se secret não configurado.

**meta-webhook-hub**: Já tem `verifySignature()` funcional. Migrar para usar `verifyWebhookSignature()` partilhada + adicionar anti-replay via `checkReplay()` e `isRateLimited()`.

**whatsapp-evolution-webhook**: Adicionar verificação de assinatura usando o secret da Evolution API (`EVOLUTION_API_KEY` ou token configurado).

**Padrão para cada webhook:**
```typescript
import { verifyWebhookSignature, checkReplay, isRateLimited, securityLog, getClientIP } from "../_shared/security.ts";

const body = await req.text();
const ip = getClientIP(req);

if (isRateLimited(`webhook:${ip}`, 120, 60_000)) {
  securityLog({ event: "rate_limited", functionName: "xxx-webhook", ip });
  return new Response("Too Many Requests", { status: 429 });
}

const signature = req.headers.get("x-hub-signature-256"); // ou stripe-signature, etc.
const secret = Deno.env.get("WEBHOOK_SECRET")!;
const valid = await verifyWebhookSignature(body, signature!, secret, "sha256=");
if (!valid) {
  securityLog({ event: "webhook_invalid", functionName: "xxx-webhook", ip });
  return new Response("Invalid signature", { status: 403 });
}
```

### Tarefa 3 — Testes e2e para fluxo auth → lead → oportunidade → fatura

Criar `src/test/e2e/business-flow.test.ts` com testes de integração que verificam:

1. **Auth flow**: Login com credenciais válidas retorna sessão
2. **Criação de lead**: POST de lead com dados válidos → lead criado na DB
3. **Conversão lead → oportunidade**: Trigger de conversão → oportunidade criada com referência ao lead
4. **Criação de fatura**: A partir de oportunidade ganha → fatura gerada com valores correctos

Estes serão testes unitários/integração contra as funções e hooks existentes (não browser-based), usando mocks para Supabase client.

### Tarefa 4 — Actualizar security.ts para rate limiting distribuído

Adicionar ao módulo `_shared/security.ts` uma versão de rate limiting baseada em tabela Supabase para cenários de produção com múltiplas instâncias:

- Criar tabela `edge_function_rate_limits` (key, count, window_start)
- Função `isRateLimitedDistributed()` que usa essa tabela via service_role
- Manter `isRateLimited()` in-memory como fallback rápido

---

## Ficheiros Afectados

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/csv-url-fetch/index.ts` | Adicionar `requireAuth()` |
| `supabase/functions/ebook-generate/index.ts` | Adicionar `requireAuth()` |
| `supabase/functions/google-calendar-sync/index.ts` | Adicionar `requireAuth()` |
| `supabase/functions/meta-lead-processor/index.ts` | Adicionar service_role guard |
| `supabase/functions/meta-health-check/index.ts` | Adicionar service_role guard |
| `supabase/functions/event-reminder-cron/index.ts` | Adicionar service_role guard |
| `supabase/functions/stripe-renewal-webhook/index.ts` | Tornar signature obrigatória |
| `supabase/functions/meta-webhook-hub/index.ts` | Migrar para helpers partilhados + anti-replay |
| `supabase/functions/whatsapp-evolution-webhook/index.ts` | Adicionar verificação de assinatura |
| `supabase/functions/_shared/security.ts` | Adicionar `isRateLimitedDistributed()` |
| `src/test/e2e/business-flow.test.ts` | Novo: testes do fluxo de negócio |
| Nova migração SQL | Tabela `edge_function_rate_limits` |

## Restrições

- Não alterar lógica de negócio existente
- Apenas adicionar guards de segurança no início de cada handler
- Mudanças reversíveis (cada função é independente)
- CORS headers mantidos em todas as respostas incluindo erros

## Riscos

- **csv-url-fetch** pode ser chamado por fluxos internos sem JWT — verificar antes de aplicar
- **meta-lead-processor** e **meta-health-check** podem ser invocados via pg_cron — usar service_role guard em vez de JWT
- Rate limiting distribuído adiciona latência (~5ms por lookup) — usar apenas onde necessário

