
# Plano: Corrigir Atualização de Quantidades nas Propostas

## Problema Identificado

Quando o utilizador atualiza quantidades nos itens da proposta, a interface não reflete as alterações de forma consistente. O problema ocorre em dois cenários:

1. **ProposalItemsEditor** - O estado local atualiza, mas os totais calculados podem não ser sincronizados corretamente com a base de dados
2. **POSProposalBuilder** - A callback `onItemsChange` recria-se a cada render, causando possíveis problemas de estado

```text
FLUXO ATUAL (Com Problema)
┌─────────────────────────────────────────────────────────────────────┐
│  User atualiza quantidade                                           │
│       ↓                                                             │
│  Local state atualiza (items[])                                     │
│       ↓                                                             │
│  handleUpdateItem() → setItems() → hasChanges = true               │
│       ↓                                                             │
│  UI mostra nova quantidade... MAS:                                 │
│  - Total pode não recalcular                                       │
│  - Se guardar falhar, estado local fica dessincronizado            │
│  - QueryClient não invalida queries corretamente                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Solução Proposta

### 1. Forçar Refetch Imediato Após Guardar

Após a mutação `updateItems.mutateAsync()`, garantir que os dados são recarregados imediatamente:

```typescript
// ProposalItemsEditor.tsx
const handleSave = async () => {
  try {
    await updateItems.mutateAsync({ proposalId, items });
    setHasChanges(false);
    
    // CRÍTICO: Forçar refetch imediato
    await queryClient.refetchQueries({ 
      queryKey: ["proposal-items", proposalId] 
    });
    
    toast.success("Itens guardados!");
    onSaved?.();
  } catch (error) {
    toast.error("Erro ao guardar");
  }
};
```

### 2. Estabilizar Callback no POSProposalBuilder

Usar `useCallback` para evitar re-criação da função `onItemsChange`:

```typescript
// CreateProposalDialog.tsx
const handleCartItemsChange = useCallback((items: CartItem[]) => {
  setCartItems(items);
  // Recalcular preço
  const total = items.reduce((acc, item) => {
    const basePrice = item.priceOverride ?? item.product.base_price ?? 0;
    const discountAmount = item.discount ? basePrice * (item.discount / 100) : 0;
    return acc + (basePrice - discountAmount) * item.quantity;
  }, 0);
  if (total > 0) setPrice(total.toString());
}, []);
```

### 3. Sincronizar Estado Local com DB

No `ProposalItemsEditor`, garantir que o estado local reflete sempre os dados da query após save:

```typescript
const handleSave = async () => {
  try {
    const result = await updateItems.mutateAsync({...});
    setHasChanges(false);
    // Resetar initialized flag para permitir resync
    setInitializedForProposal(null);
    onSaved?.();
  } catch (error) {...}
};
```

---

## Ficheiros a Modificar

### 1. `src/components/proposals/ProposalItemsEditor.tsx`

- Adicionar `useQueryClient` import
- Forçar refetch após mutação bem-sucedida
- Melhorar sincronização de estado local com dados do servidor

### 2. `src/components/proposals/CreateProposalDialog.tsx`

- Envolver `onItemsChange` callback em `useCallback`
- Evitar re-renders desnecessários do `POSProposalBuilder`

### 3. `src/hooks/useProposals.ts`

- Garantir que `onSuccess` do `useUpdateProposalItems` invalida corretamente as queries
- Adicionar `await` no refetch para garantir dados frescos

---

## Detalhes Técnicos

### Problema no useUpdateProposalItems

O hook atual invalida queries no `onSuccess`, mas não espera pelo refetch:

```typescript
// ATUAL
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ["proposal-items"] });
  // Invalida mas não espera pelo refetch
}
```

```typescript
// CORRIGIDO
onSuccess: async (data) => {
  await queryClient.invalidateQueries({ 
    queryKey: ["proposal-items", data.proposalId],
    refetchType: 'active' 
  });
}
```

### Memoização no CreateProposalDialog

```typescript
// Antes (recria a cada render)
onItemsChange={(items) => {
  setCartItems(items);
  // ...cálculos
}}

// Depois (estável)
const handleCartItemsChange = useCallback((items: CartItem[]) => {
  setCartItems(items);
  // ...cálculos
}, []);

<POSProposalBuilder onItemsChange={handleCartItemsChange} />
```

---

## Resultado Esperado

Após as correções:

1. Quantidade atualiza imediatamente na UI
2. Totais recalculam instantaneamente
3. Dados persistem corretamente na base de dados
4. Sem dessincronização entre estado local e servidor
5. Performance melhorada (menos re-renders)

---

## Estimativa

- ProposalItemsEditor: ~15 linhas alteradas
- CreateProposalDialog: ~10 linhas alteradas
- useProposals hook: ~5 linhas alteradas
- **Total: ~30 linhas de código**
