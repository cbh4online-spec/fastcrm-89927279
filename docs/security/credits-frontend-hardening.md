# 🔒 Auditoria de Segurança — Consumo de Créditos & Pricing

> **Data:** 2026-04-30
> **Estado:** Auditoria + barreiras de proteção (sem refactor de features)
> **Próximo passo:** Migrar progressivamente cada feature da lista para
> edge functions dedicadas (pattern já provado em `product-ocr-extract`).

---

## 🎯 Princípio arquitetural

> **O frontend nunca decide preços nem debita créditos.**
> Toda a economia (pricing, débito, refund, autorização) corre **server-side**
> em edge functions (Control Plane). O cliente apenas:
> 1. Lê o saldo (`credit_wallets`) para mostrar UI.
> 2. Lê o histórico (`credit_ledger`) para a página de histórico.
> 3. Invoca `supabase.functions.invoke("<feature>")` para executar uma ação.
> 4. Reage ao resultado (sucesso, `insufficient_credits`, erro) e refaz queries.

---

## ✅ Barreiras adicionadas nesta sprint

### 1. ESLint custom rule — `eslint.config.js`
Bloqueia, em ficheiros sob `src/**`, qualquer chamada a:

| Tipo | Identificador | Razão |
|---|---|---|
| RPC | `consume_funnel_credits` | débito tem de ser server-side |
| RPC | `refund_funnel_credits` | estorno tem de ser atómico no servidor |
| RPC | `admin_assign_credits` | privilegiada, exclusivo para edge admin |
| Table | `credit_pricing_rules` | preços não podem ser confiados ao cliente |

Excluídos: `src/integrations/supabase/types.ts` (gerado), `src/test/**`,
`supabase/functions/**`, `trigger/**`.

### 2. Smoke test vitest
`src/test/security/credit-rpc-isolation.test.ts` — falha o build se algum
ficheiro do frontend voltar a referenciar uma das chamadas proibidas.

### 3. Página `CreditHistoryPage` (já criada)
Lê apenas tabelas **read-scoped** (`credit_ledger`, `credit_wallets`,
`credit_pricing_rules`). A leitura de pricing aqui **será removida** quando
migrarmos para o endpoint `get-action-cost` (ver §Plano).

---

## 🟢 Padrão correto (referência)

`supabase/functions/product-ocr-extract/index.ts` é a SSoT:

1. Valida JWT do utilizador.
2. Chama `consume_funnel_credits` com `idempotency_key = "<doc>:extract"`.
3. Se `success=false` devolve `{ code: "insufficient_credits" }` com 200 OK.
4. Executa o trabalho real (chamada à AI).
5. Em falha pós-débito chama `refund_funnel_credits` (RPC idempotente).
6. Logga em `ai_usage_logs` via `logAIUsage`.

**Toda a feature nova de IA tem de seguir este padrão.**

---

## 🟡 Inventário de violações atuais

Detetadas por `rg` no commit atual. Cada linha é trabalho a fazer.

### A. Débito de créditos client-side — **ALTA prioridade**

| Ficheiro | Linha | Ação | Plano |
|---|---|---|---|
| `src/hooks/useCreditWallet.ts` | 136 | `consume_funnel_credits` (mutation genérica) | Manter como **fallback legacy** até todas as features serem migradas. Marcar `@deprecated`. |
| `src/hooks/useAskFastCRM.ts` | 137 | `consume_funnel_credits` (`ai_copilot_chat`) | Mover para edge function `ask-fastcrm` (já existe — ver se debita lá; senão acrescentar). |
| `src/hooks/useLandingPageCopy.ts` | 36 | `consume_funnel_credits` (`funnel_ai_copy`) | Mover para edge function `generate-landing-copy`. |
| `src/hooks/useLeadEnrichment.ts` | 62 | `consume_funnel_credits` (`lead_enrich_single/batch`) | Mover para edge function `enrich-lead`. |
| `src/pages/GoogleLocalProspecting.tsx` | 662 | usa `consumeCredits.mutateAsync` | Mover para edge function `prospecting-google-local-search`. |
| `src/pages/ProductOCRCreate.tsx` | 60 | usa `consumeCredits.mutateAsync` (geração de conteúdo) | Já parcialmente migrado (`product-ocr-extract`); migrar também `product_ocr_generate_content`. |
| `src/pages/client/ClientPlanCreatePage.tsx` | 34 | usa `consumeCredits.mutateAsync` | Mover para edge function `create-client-plan`. |
| `src/pages/client/ClientPlanDetailPage.tsx` | 34 | usa `consumeCredits.mutateAsync` | Mover para edge function dedicada. |

### B. Leitura de pricing client-side — **MÉDIA prioridade**

Sempre que o frontend faz `.from("credit_pricing_rules").select(...)` está a
expor a tabela completa de custos a qualquer utilizador autenticado. Embora
não seja diretamente explorável (não permite alterar custos), **viola o
princípio**.

| Ficheiro | Linha | Plano |
|---|---|---|
| `src/hooks/useCreditWallet.ts` | 74 | Substituir por edge function `pricing-actions` que devolve apenas `{action_key, label, credits_cost}` filtrado por módulos visíveis ao utilizador. Cache 5 min via React Query. |
| `src/pages/CreditHistoryPage.tsx` | (via `pricingRules`) | Passa a usar o mesmo endpoint. |

### C. Leitura direta de `credit_wallets` — **BAIXA prioridade**

Permitida apenas para o próprio workspace via RLS — risco baixo, mas:

| Ficheiro | Linha | Plano |
|---|---|---|
| `src/hooks/useCreditWallet.ts` | 58 | Manter (precisamos de ler saldo no UI). Confirmar política RLS escopada por `workspace_id`. |
| `src/components/super-admin/WorkspacesSection.tsx` | 229 | OK — secção super-admin protegida por `is_super_admin`. |

### D. Outras RPCs sensíveis identificadas (fora do escopo desta auditoria)

A audit listou várias RPCs invocadas client-side que merecem revisão própria
em sprints futuras: `admin_assign_credits` (já bloqueado), `log_admin_action`
(super-admin), `consume_trial_usage`, `award_xp`, `submit_quiz_attempt`. Não
são de pricing puro mas seguem o mesmo princípio.

---

## 🛣️ Plano de migração recomendado

### Fase 1 — Já feito ✅
- [x] OCR extract: 100% server-side com idempotência e refund automático
- [x] Página de histórico de créditos
- [x] ESLint rule + smoke test

### Fase 2 — Próxima sprint (1 dia)
- [ ] Edge function `pricing-actions` (devolve catálogo filtrado de pricing)
- [ ] Refactor `useCreditWallet.pricingRules` para consumir a edge function
- [ ] Marcar `consumeCredits.mutateAsync` como `@deprecated` no hook

### Fase 3 — Sprint+1 (2-3 dias)
Migrar uma feature por dia, na ordem de impacto:
1. `enrich-lead` (mais usado)
2. `prospecting-google-local-search`
3. `generate-landing-copy`
4. `product-ocr-generate-content`
5. `ask-fastcrm` (validar)
6. `client-plan-*`

Por cada migração:
- Mover RPC `consume_funnel_credits` para a edge function
- Implementar `refund_funnel_credits` em caso de falha pós-débito
- Adicionar `idempotency_key` consistente
- Substituir `consumeCredits.mutateAsync` por `supabase.functions.invoke`
- Tratar `code: "insufficient_credits"` no caller

### Fase 4 — Quando lista A=0
- [ ] Remover `consumeCredits` do `useCreditWallet`
- [ ] Revogar `EXECUTE` em `consume_funnel_credits` ao role `authenticated`
      (apenas `service_role`)
- [ ] Revogar `SELECT` em `credit_pricing_rules` ao role `authenticated`
- [ ] Atualizar este documento marcando Fase 4 como ✅

---

## 📐 Como adicionar uma nova feature de IA

```ts
// ❌ NUNCA — bloqueado por ESLint + teste
await supabase.rpc("consume_funnel_credits", { ... });

// ✅ SEMPRE
const { data, error } = await supabase.functions.invoke("my-ai-feature", {
  body: { entity_id: "..." },
});

if (data?.code === "insufficient_credits") {
  triggerNoCreditsDialog({ actionLabel: "...", creditsNeeded: data.cost });
  return;
}
```

E na edge function, copia o esqueleto de `product-ocr-extract` (débito ↦
trabalho ↦ refund-on-failure ↦ logAIUsage).

---

## 🔁 Como verificar que estamos OK

```bash
bunx vitest run src/test/security/credit-rpc-isolation.test.ts
bun run lint
```

Ambos têm de passar a verde **antes de qualquer PR ser merged**.
