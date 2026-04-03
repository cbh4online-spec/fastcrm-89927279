

# Corrigir Billing & Stripe no Super Admin

## Diagnóstico

A secção Billing & Stripe tem vários problemas:

| Problema | Causa |
|---|---|
| **Stripe IDs vazios** | `workspace_subscriptions` tem `stripe_customer_id` e `stripe_subscription_id` a NULL em todos os 8 registos — os planos foram criados manualmente, nunca via webhook Stripe |
| **Eventos Stripe vazios** | `billing_events` tem 0 registos — o webhook (`stripe-webhook`) existe mas nunca foi chamado (nenhum webhook configurado no Stripe, `stripe_event_log` também vazio) |
| **Dados desactualizados** | `workspace_subscriptions` mostra METODOPARE como "agency" mas em `workspace_plans` é "pro"; "Viagens com Propósito" aparece como "trialing" mas em `workspace_plans` é "free" |
| **Sem Stripe Sync** | O menu "Stripe Sync" aponta para o mesmo `BillingSection` sem nenhuma funcionalidade de sincronização |
| **Sem ações úteis** | Não há botões para sincronizar com Stripe, alterar plano, ou gerir subscrição |
| **`workspace_stripe_config` vazio** | Nenhum workspace tem chave Stripe configurada |

## Solução

Reescrever o `BillingSection` para usar `workspace_plans` como fonte primária (contém dados reais) e adicionar funcionalidades de gestão.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/components/super-admin/BillingSection.tsx` | Reescrever queries + UI |

### Detalhe

1. **Query principal**: Mudar de `workspace_subscriptions` para `workspace_plans` (10 registos activos com dados reais: plano, ciclo, uso de créditos)
   - Join com `workspaces` para nome/slug
   - Join com `workspace_subscriptions` para obter `stripe_customer_id` e `stripe_subscription_id` quando existirem

2. **Corrigir mapeamento de colunas**:
   - Plano: `workspace_plans.plan` (fonte de verdade)
   - Estado: `workspace_plans.status`
   - Ciclo: `workspace_plans.cycle_end`
   - Stripe IDs: de `workspace_subscriptions` (quando disponíveis, caso contrário mostrar "Não vinculado")

3. **Tab "Eventos Stripe"**: Manter, mas mostrar estado vazio informativo ("Nenhum evento registado. Configure o webhook Stripe para receber eventos.") em vez de tabela vazia

4. **Acções por workspace** (menu `...`):
   - "Ver no Stripe" (se tiver `stripe_customer_id`)
   - "Alterar Plano" (dropdown: starter/growth/scale → actualiza `workspace_plans` e `workspace_subscriptions`)
   - "Sincronizar com Stripe" (chama `check-subscription` edge function para re-verificar estado)

5. **KPIs no header**:
   - Total subscrições activas
   - Receita estimada (baseada nos planos)
   - Workspaces sem Stripe vinculado

6. **Stripe Sync tab** (3º tab): Painel com botão "Sincronizar Todos" que chama `check-subscription` para cada workspace, mostrando progresso

