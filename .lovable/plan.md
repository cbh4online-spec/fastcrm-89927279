
# Plano: Corrigir Sincronização do Valor Total no Header

## Problema Identificado

Após análise da base de dados e código:

| Origem | Valor |
|--------|-------|
| `proposals.price` (header) | 759,70€ |
| Soma dos `proposal_items` (real) | 2138,10€ |

Os itens já estão guardados com as quantidades correctas na base de dados, mas o campo `proposals.price` ficou desatualizado porque os itens foram provavelmente modificados antes de existir a lógica de recálculo automático, ou foram importados directamente.

---

## Solução

### 1. Mostrar Total Calculado em Tempo Real no Header

Em vez de confiar apenas em `proposal.price`, calcular o total a partir dos `proposalItems` que já são carregados (linha 112):

```typescript
// ProposalDetailDialog.tsx

// Calcular total real dos itens
const calculatedTotal = proposalItems
  ?.filter(item => item.is_enabled !== false)
  .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) || 0;

// Usar calculatedTotal quando diferente, senão proposal.price
const displayPrice = proposalItems && proposalItems.length > 0 
  ? calculatedTotal 
  : proposal.price;
```

### 2. Atualizar Header para Usar o Valor Calculado

```typescript
// Linha ~395: Trocar proposal.price por displayPrice
<p className="font-semibold text-sm text-primary">
  {formatCurrency(displayPrice, proposal.currency)}
</p>
```

### 3. Sincronizar BD Automaticamente (Opcional mas Recomendado)

Adicionar um efeito que detecta discrepância e atualiza a BD automaticamente:

```typescript
// Sincronizar proposals.price quando detectar discrepância
useEffect(() => {
  if (proposalItems && proposalItems.length > 0 && proposal) {
    const calculated = proposalItems
      .filter(item => item.is_enabled !== false)
      .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    
    // Se há diferença significativa (>0.01€), sincronizar
    if (Math.abs(calculated - (proposal.price || 0)) > 0.01) {
      // Atualizar proposals.price na BD silenciosamente
      updateProposal.mutate({
        id: proposalId,
        price: calculated
      });
    }
  }
}, [proposalItems, proposal?.price]);
```

---

## Ficheiros a Modificar

### `src/components/proposals/ProposalDetailDialog.tsx`

| Alteração | Descrição |
|-----------|-----------|
| Adicionar cálculo `calculatedTotal` | Soma os itens enabled |
| Criar variável `displayPrice` | Prioriza total calculado |
| Atualizar header | Usar `displayPrice` em vez de `proposal.price` |
| useEffect de sincronização | Atualiza BD quando há discrepância |

---

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────────┐
│  1. Dialog abre                                                     │
│  2. useProposal carrega proposal (price: 759.70)                   │
│  3. useProposalItems carrega itens (soma: 2138.10)                 │
│  4. calculatedTotal = 2138.10                                       │
│  5. displayPrice = calculatedTotal (prioridade)                    │
│  6. Header mostra 2138.10€ ✓                                       │
│  7. useEffect detecta discrepância                                  │
│  8. Atualiza proposals.price = 2138.10 na BD ✓                     │
│  9. Próxima vez, ambos os valores estarão sincronizados            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Resultado Esperado

1. **Imediato**: Header mostra sempre o valor correcto baseado nos itens
2. **Persistente**: A BD é sincronizada automaticamente quando há discrepância
3. **Robusto**: Funciona mesmo para propostas criadas antes desta lógica

---

## Estimativa

- ProposalDetailDialog.tsx: ~20 linhas alteradas/adicionadas
