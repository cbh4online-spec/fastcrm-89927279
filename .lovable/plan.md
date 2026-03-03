

# Corrigir Cálculo de Margens na Vista Interna da Proposta

## Problema Identificado

No `ProposalInternalView.tsx`, existem dois bugs no cálculo de margens:

1. **Margem usa `item.total_price` (valor guardado na DB)** em vez de `item.unit_price * item.quantity`. Quando o utilizador edita o preço ou quantidade nos inputs, o `total_price` não se atualiza, resultando em margens calculadas com valores desatualizados.

2. **Coluna "Custo" mostra custo total** (`(directCost + opCost) * qty`) enquanto a coluna "Preço" mostra preço unitário — inconsistência visual que confunde a leitura.

## Correções

**Ficheiro: `src/components/proposals/ProposalInternalView.tsx`**

### A. Recalcular subtotal/margem dinamicamente (linhas 97-109)
- Substituir `item.total_price` por `item.unit_price * item.quantity` nos cálculos de `itemsTotal`
- Garantir que totais e margens refletem os valores atuais dos inputs

### B. Corrigir cálculo por item (linhas 299-303)
- `itemSubtotal = item.unit_price * item.quantity` (em vez de `item.total_price`)
- `itemMargin = itemSubtotal - itemCost`
- `itemMarginPct = itemSubtotal > 0 ? (itemMargin / itemSubtotal) * 100 : 0`

### C. Coluna "Custo" mostrar custo unitário (linha 361)
- Mostrar `(directCost + opCost)` por unidade (consistente com coluna "Preço" que é unitário)
- Manter o cálculo total para a margem

### D. Subtotal na tabela (linha 370)
- Usar `item.unit_price * item.quantity` em vez de `item.total_price`

Um único ficheiro a editar.

