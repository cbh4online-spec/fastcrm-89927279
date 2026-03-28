

## Corrigir faturas de renovação não visíveis no módulo de faturas

### Problemas identificados

Há dois bugs que impedem as faturas de renovação de aparecerem:

1. **`created_by` inválido no webhook** — Quando `owner_user_id` do contrato é `null`, o webhook tenta inserir `"system"` como `created_by`, que é uma coluna `UUID NOT NULL`. Isto causa um erro silencioso (está dentro de `try/catch`) e a fatura nunca é criada.

2. **`document_type` não definido** — O webhook não define `document_type` no insert. A coluna tem `DEFAULT 'invoice'`, mas é boa prática defini-lo explicitamente.

3. **Sem indicação visual** — A página de faturas não distingue faturas geradas por renovação das manuais. Não há filtro nem badge "Renovação".

---

### Correções

**1. Fix webhook (`stripe-renewal-webhook/index.ts`)**
- Buscar o `owner_user_id` do contrato e, se for `null`, buscar o primeiro membro do workspace como fallback para `created_by`
- Definir `document_type: 'invoice'` explicitamente no insert
- Adicionar log de erro mais detalhado

**2. Indicador visual na lista de faturas (`Invoices.tsx`)**
- Incluir `renewal_contract_id` no select query de `useInvoices`
- Mostrar badge "Renovação" ao lado do número da fatura quando `renewal_contract_id` está preenchido
- Adicionar filtro na sidebar para "Faturas de renovação"

### Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `supabase/functions/stripe-renewal-webhook/index.ts` | Fix `created_by` UUID + `document_type` |
| `src/hooks/useInvoices.ts` | Incluir `renewal_contract_id` no tipo e query |
| `src/pages/Invoices.tsx` | Badge "Renovação" + filtro na sidebar |

