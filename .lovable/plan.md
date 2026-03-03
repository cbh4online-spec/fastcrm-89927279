

# Corrigir Duplicação de Quantidades no Cálculo de Procurement Needs

## Problema

O motor `procurement-needs-recompute` agrega procura de **propostas** (won/accepted/paid) e **notas de encomenda** (approved/submitted) separadamente. Quando uma proposta é aceite E uma nota de encomenda é criada para a mesma oportunidade, os mesmos produtos são contados **duas vezes**.

Confirmado na base de dados: existem propostas e notas de encomenda ligadas à mesma `opportunity_id`, duplicando a procura.

## Solução

**Ficheiro: `supabase/functions/procurement-needs-recompute/index.ts`**

Quando ambos os documentos (proposta + nota de encomenda) existem para a mesma oportunidade, a **nota de encomenda tem prioridade** (é o documento operacional que confirma a venda). A proposta é ignorada para efeito de cálculo de procura.

### Lógica de deduplicação:

1. Ao processar **order notes**, recolher os `opportunity_id` de todas as notas de encomenda ativas
2. Ao processar **proposals**, verificar se a proposta tem `opportunity_id` que já foi coberto por uma nota de encomenda — se sim, saltar esses itens
3. Propostas sem `opportunity_id` ou cujo `opportunity_id` não tem nota de encomenda associada continuam a contar normalmente

### Alterações concretas:

- Adicionar `opportunity_id` ao select das propostas (já existe na tabela)
- Criar um `Set<string>` com os `opportunity_id` das order notes processadas
- No loop de proposal items, filtrar: `if (proposal.opportunity_id && coveredOpportunities.has(proposal.opportunity_id)) continue;`

Um único ficheiro a editar. Sem alterações de schema.

