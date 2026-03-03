

# Corrigir Dados Duplicados — Recalcular Necessidades de Compra

## Problema

Os dados na tabela de Necessidades de Compra continuam duplicados porque a correção de deduplicação (proposta vs nota de encomenda) foi **implementada no código** mas os dados **não foram recalculados**. Exemplo:

- Access Point RG-RAP1261: mostra `demand_total = 18` (9 da proposta + 9 da nota de encomenda), quando deveria ser **9** (apenas a nota de encomenda conta)
- Instalação: mostra `demand_total = 2` (1+1), deveria ser **1**

O `demand_sources_json` confirma a duplicação: contém entradas `proposal` e `order_note` para a mesma oportunidade.

## Solução

### 1. Verificar e corrigir a edge function

**Ficheiro: `supabase/functions/procurement-needs-recompute/index.ts`**

Verificar se o código de deduplicação está correto — confirmar que:
- As `order_notes` recolhem os `opportunity_id`
- As `proposals` cujo `opportunity_id` já está coberto por uma order note são ignoradas

Pode ser necessário verificar que o campo `opportunity_id` está sendo corretamente extraído nos selects de `proposal_items` e `order_note_items`.

### 2. Re-deploy e executar

- Re-deploy da edge function (caso necessário ajustes)
- O utilizador precisa de clicar no botão "Recalcular" na interface para regenerar os dados com a lógica correta

### Ficheiros a verificar/editar
- `supabase/functions/procurement-needs-recompute/index.ts`

