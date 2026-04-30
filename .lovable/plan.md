## Auditoria de Consumo de Créditos AI — Estado Final

### Diagnóstico inicial
- 530 edge functions no projecto, das quais ~90 chamam Lovable AI Gateway.
- 18 funções com bug **ReferenceError silencioso** (variável `workspace_id` referenciada quando só `workspaceId` foi destructurada) — gerava erros há ~22 dias sem que o utilizador soubesse, **bloqueando** registos de consumo no `ai_usage_logs`.
- 45 funções a usar Lovable AI **sem instrumentação** (`logAIUsage` não chamado).

### Fase 1 — OCR (concluída em loop anterior)
- `product-ocr-extract`, `product-ocr-generate-content` instrumentados.

### Fase 2 — Lotes 1+2 (concluída em loops anteriores)
- Lote 1: `ai-copilot`, `ai-analyze-lead`, `ai-auto-tags`.
- Lote 2: `conversation-summary`, `conversation-intelligence`, `compute-conversation-signals`, `context-ai-assist`.
- Frontend hooks actualizados: `useAskAI`, `useAutoTags`, `useConversationSummary`, `useConversationIntelligence`, `ConversationIntelligencePanel`.

### Fase 2 — Lote 3 (varrimento completo automatizado, este loop)
Script Python aplicou correcções nas 15 funções com bug DEAD_VAR confirmado:

**Padrões corrigidos automaticamente:**
1. `typeof workspace_id !== 'undefined' ? workspace_id : null` → `workspaceId ?? null`
2. `if (workspace_id)` → `if (workspaceId)`
3. `aiGate(workspace_id, …)` → `aiGate(workspaceId, …)`
4. `workspace_id: workspace_id` (em logs) → `workspace_id: workspaceId`
5. Fallback ternário aninhado removido: `: (typeof workspace_id !== 'undefined' ? workspace_id : null)` → `: null`

**Funções corrigidas (15):**
- `ai-automation-suggestions`, `ai-cart-recommendations`, `ai-dashboard-insights`, `ai-product-assistant`, `ai-revenue-engine`
- `bio-generate-image`, `bio-smart-link`, `contact-enrich`, `productivity-coach`, `vision-ai-copilot`
- `ai-diagnostic-assistant`, `ai-field-suggestions`, `knowledge-query`, `sj-copilot`, `sj-course-recommendations`

**Falsos positivos confirmados (3, sem alteração):**
- `flow-engine`, `ghl-webhook-message`, `knowledge-document-process` — destructuram `workspace_id` (snake_case) noutro escopo, uso correcto.

### Resultado pós-Lote 3
- DEAD_VAR: 18 → **0 reais** (3 falsos positivos validados manualmente).
- Funções OK (com instrumentação válida): 119 → **134**.
- Todos os 15 ficheiros alterados passam `deno check`.

### Fase 3 — Instrumentação automática (concluída)
- Script Python injectou wrapper `__loggedAIFetch` em **33 funções AI** que chamavam o gateway sem registar consumo.
- Helper local mede latência, captura `usage.prompt_tokens` / `usage.completion_tokens`, regista erros HTTP/network e nunca bloqueia o flow principal (fire-and-forget).
- Bonus: detectado typo `ai-gateway.lovable.dev` (com hífen) em `account-brief-corporate-lookup` — corrigido para `ai.gateway.lovable.dev` via wrapper.
- Bug pré-existente em `_shared/ai-instrumentation.ts` (`.catch()` em `PostgrestFilterBuilder`) — corrigido envolvendo em `Promise.resolve(...)`.

**Funções instrumentadas (33):** account-brief-{compare-accounts, corporate-lookup, extract-structured, generate-brief}, ai-{batch-estimate-weights, catalog-suggest, market-price-research, shipping-suggest}, builder-ai{,-image}, compare-prices, ebook-{ai-assist, generate}, email-campaign-wizard, generate-{blueprint, bot-comments, executive-brief, flow-ai, objective-plan}, hr-{buddy-match-ai, candidate-score-ai, cv-parse-ai, face-verify, job-ai-assist, portal-auto-import, review-ai-suggest-rating, talent-search}, marketing-ai-copilot, process-{portfolio-allocation, strategy-layer, workspace-memory}, supplier-web-search, ticket-ai-reply.

### Resultado Final (Fases 1+2+3)
| Categoria | Antes | Depois |
|---|---|---|
| Funções OK (instrumentadas) | 119 | **167** (+48) |
| MISSING_LOG (sem registo) | 45 | **12** (todas hooks não-AI legítimos) |
| DEAD_VAR (bug silencioso) | 18 | **0 reais** |

12 MISSING_LOG restantes são todas justificadas: `auth-email-hook`, `billing-assistant`, `ebook-lead-welcome`, `firecrawl-market-search`, `handle-email-suppression`, `preview-transactional-email`, `process-email-queue`, `system-run-smoke-tests`, `telegram-poll`, `telegram-send`, `twilio-send-sms`, `vision-duo-invite` — não fazem chamadas a modelos AI directos.

### Fases pendentes
- **Fase 4** — Ligar `ai_usage_logs` ao `credit_ledger` para reconciliação automática de billing.
- **Monitorização** — Dashboard interno com funções sem registo nos últimos 7 dias para detectar regressões.

