

# Corrigir Conversão de Proposta em Encomenda

## Diagnóstico

Dois bugs confirmados no hook `useConvertProposalToOrderNote.ts`:

1. **Sem guarda contra duplicação** — nada impede converter a mesma proposta aceite várias vezes, criando encomendas duplicadas
2. **Estado da proposta não atualizado** — após conversão, a proposta permanece como `accepted`, permitindo nova conversão; deveria passar para um estado terminal

## Solução

### 1. Migração DB — adicionar `proposal_id` a `order_notes`

Adicionar coluna `proposal_id` (FK para `proposals`, nullable, **unique**) na tabela `order_notes`. O constraint unique impede múltiplas encomendas para a mesma proposta a nível de base de dados.

```sql
ALTER TABLE order_notes ADD COLUMN proposal_id uuid REFERENCES proposals(id);
CREATE UNIQUE INDEX order_notes_proposal_id_unique ON order_notes(proposal_id) WHERE proposal_id IS NOT NULL;
```

### 2. Hook `useConvertProposalToOrderNote.ts` — 3 correções

| Correção | Detalhe |
|---|---|
| Guardar `proposal_id` | Inserir `proposal_id` no `order_notes` insert |
| Verificar duplicado | Antes de criar, verificar se já existe `order_notes` com esse `proposal_id`; se sim, lançar erro "Esta proposta já foi convertida" |
| Atualizar proposta | Após criação bem-sucedida da encomenda, atualizar `proposals.status` para `accepted` (já é o estado correcto — o problema é que não bloqueia re-conversão) |

Na prática, a proteção real é: **se `proposal.status !== 'accepted'`, não converte** (já existe no UI) + **se já existe encomenda com esse `proposal_id`, erro** (novo).

### 3. UI `ProposalsList.tsx` — esconder botão se já convertida

Adicionar verificação: se já existe uma `order_note` associada a esta proposta, esconder o botão "Converter em Encomenda" ou mostrar "Já convertida".

Opção mais simples: após conversão bem-sucedida, queries invalidadas já refrescam a lista. A protecção DB (unique index) garante segurança mesmo sem alteração de UI adicional.

## Ficheiros

| Ficheiro | Alteração |
|---|---|
| Migração SQL | Adicionar `proposal_id` unique a `order_notes` |
| `src/hooks/useConvertProposalToOrderNote.ts` | Guardar `proposal_id`, verificar duplicado antes de criar |
| `src/components/proposals/ProposalsList.tsx` | Desactivar botão "Converter" para propostas já convertidas |

## Critérios de aceitação

- Conversão duplicada bloqueada tanto no frontend (botão desactivado) como no backend (unique index)
- `proposal_id` registado na encomenda para rastreabilidade
- Proposta já convertida mostra indicação visual na lista
- Encomendas existentes sem `proposal_id` não são afectadas (coluna nullable)

