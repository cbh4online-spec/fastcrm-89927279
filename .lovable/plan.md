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

### Próximos passos sugeridos
- **Fase 3** — Adicionar instrumentação às 45 funções `MISSING_LOG` que são genuinamente IA (filtrar fora hooks como `auth-email-hook`, `telegram-send`, `process-email-queue`).
- **Fase 4** — Ligar `ai_usage_logs` ao `credit_ledger` para reconciliação automática de billing.
- **Monitorização** — Criar dashboard interno mostrando funções sem registo nos últimos 7 dias (detecta regressões deste padrão).
