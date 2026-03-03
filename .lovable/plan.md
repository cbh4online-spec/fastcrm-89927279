

# Corrigir Margens — cost_snapshot desatualizado

## Problema

O item "Instalação, Configuração e formação" tem `cost_snapshot = 1400€` na tabela `proposal_items`, mas o custo real do produto (`direct_cost`) é **650€**. Isto resulta numa margem de -65% quando deveria ser +24%.

O `cost_snapshot` é capturado no momento da criação da proposta e nunca mais é atualizado, mesmo que o custo do produto mude.

## Solução

### 1. Adicionar botão "Atualizar Custos" na vista interna

**Ficheiro: `src/components/proposals/ProposalInternalView.tsx`**

- Adicionar um botão junto ao cabeçalho "Itens da Proposta" que permite re-sincronizar os `cost_snapshot` e `operational_cost_snapshot` com os valores atuais dos produtos
- Ao clicar, busca os custos atuais de cada produto e atualiza os `proposal_items`

### 2. Criar mutation para atualizar snapshots

**Ficheiro: `src/hooks/useProposals.ts`**

- Nova mutation `useRefreshCostSnapshots` que:
  1. Busca os `proposal_items` com os respetivos `product_id`
  2. Busca os custos atuais dos produtos (`direct_cost`, `operational_cost`)
  3. Atualiza cada `proposal_item` com os novos valores de `cost_snapshot` e `operational_cost_snapshot`
  4. Invalida a query de proposal items

### 3. Corrigir dados existentes (one-time fix)

- Executar uma migration que atualiza os `cost_snapshot` de todos os `proposal_items` com os valores atuais dos produtos, para corrigir snapshots errados já existentes

### Ficheiros a editar
- `src/components/proposals/ProposalInternalView.tsx` — botão "Atualizar Custos"
- `src/hooks/useProposals.ts` — mutation `useRefreshCostSnapshots`
- Migration SQL — fix one-time dos snapshots existentes

