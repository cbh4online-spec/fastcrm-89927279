

# Corrigir Necessidades de Compra com Notas de Encomenda

## Problema Confirmado

Os dados atuais ainda mostram duplicação. Exemplo concreto:
- Produto `f9fadc7e` (Access Point): `demand_total = 18` com fontes `proposal(9) + order_note(9)` — deveria ser **9** (apenas order_note)
- Proposta `d8f9f8f3` tem `opportunity_id = 58f94492` que é coberto pela order note, mas os seus itens NÃO estão a ser filtrados

A lógica de deduplicação no código está correta, mas a **versão deployed da edge function** não tinha este código na última execução (14:49). Foi re-deployed no passo anterior mas o recálculo ainda não foi executado.

## Alterações Necessárias

### 1. Atualizar filtro de estados das Notas de Encomenda

**`supabase/functions/procurement-needs-recompute/index.ts`** — linha 49:
- Atual: `["approved", "submitted"]`  
- Novo: `["approved", "submitted", "in_preparation"]`

### 2. Trigger automático no estado da Nota de Encomenda

Criar uma **edge function auxiliar** ou **database trigger** que invoca o recálculo automaticamente quando uma order_note muda para um estado relevante (`submitted`, `approved`, `in_preparation`) ou sai de um estado relevante (`cancelled`, `rejected`).

Abordagem: trigger PostgreSQL + `pg_net` para chamar a edge function automaticamente:
- Criar trigger `after update on order_notes` que verifica mudança de status
- Usar `pg_net.http_post` para invocar `procurement-needs-recompute`

### 3. Re-deploy e recalcular

- Re-deploy da edge function com o filtro corrigido
- O recálculo será feito automaticamente após o deploy

## Ficheiros a editar
- `supabase/functions/procurement-needs-recompute/index.ts` — adicionar `in_preparation` ao filtro
- **Migration SQL** — criar trigger para auto-recompute via `pg_net`

## Resultado Esperado
- Access Point: `demand_total = 9` (apenas order_note)
- Instalação: `demand_total = 1` (apenas order_note)
- Propostas com opportunity coberto por NE: ignoradas automaticamente
- Recálculo automático quando NE muda de estado

