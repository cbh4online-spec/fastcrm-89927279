

# Corrigir Navegação Billing: Pagamentos como Tab Separado

## Diagnóstico

O sidebar tem 3 itens (Subscrições, Pagamentos, Stripe Sync) que todos abrem o mesmo `BillingSection` sem seleccionar o tab correcto. O tab "Pagamentos" não existe — só há "Subscrições", "Eventos Stripe" e "Stripe Sync".

A tabela `payments` existe na BD (com colunas: id, workspace_id, opportunity_id, stripe_payment_id, amount, currency, status) mas tem 0 registos. Mesmo assim, deve existir a UI para quando houver dados.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/components/super-admin/BillingSection.tsx` | Aceitar prop `initialTab`, adicionar tab "Pagamentos" com query à tabela `payments` |
| `src/pages/SuperAdmin.tsx` | Passar `initialTab` ao `BillingSection` conforme o item clicado no sidebar |

### Detalhe

1. **`BillingSection`** recebe prop opcional `initialTab: "subscriptions" | "payments" | "events" | "sync"` e usa-a como valor inicial do `activeTab`

2. **Novo tab "Pagamentos"**: Query à tabela `payments` com join a `workspaces` para nome. Tabela com colunas: Workspace, Montante, Moeda, Estado, Stripe ID, Data. Estado vazio informativo quando sem dados.

3. **`SuperAdmin.tsx`**: Mapear os 3 section IDs para o mesmo componente mas com tabs diferentes:
   - `"subscriptions"` → `<BillingSection initialTab="subscriptions" />`
   - `"payments"` → `<BillingSection initialTab="payments" />`
   - `"stripe-sync"` → `<BillingSection initialTab="sync" />`

4. **Tabs finais**: Subscrições | Pagamentos | Eventos Stripe | Stripe Sync

