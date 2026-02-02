

# Plano: Corrigir Atualização de Quantidades nas Propostas (Problema Persistente)

## Problema Identificado

Após as correções anteriores, o problema persiste. A análise revela **dois problemas críticos** que impedem as quantidades de serem atualizadas corretamente:

### Problema 1: Hook `useCallback` usado incorretamente no JSX

No `CreateProposalDialog.tsx` (linha 399), o `useCallback` está a ser chamado **diretamente dentro do JSX**, violando as regras dos hooks do React:

```typescript
// ERRADO - Hook dentro do JSX!
<POSProposalBuilder
  onItemsChange={useCallback((items: CartItem[]) => {
    setCartItems(items);
    // ...
  }, [])}
/>
```

Os hooks devem ser declarados no **corpo do componente**, não dentro de retornos JSX ou callbacks.

### Problema 2: Race Condition no ProposalItemsEditor

Após guardar, o fluxo atual é:
1. `handleSave()` - Guarda os items
2. `setInitializedForProposal(null)` - Reseta a flag
3. O `useEffect` dispara imediatamente
4. **MAS** o refetch ainda pode estar em progresso → sobrescreve com dados antigos

```text
FLUXO COM RACE CONDITION
┌─────────────────────────────────────────────────────────────────────┐
│  1. handleSave() → updateItems.mutateAsync()                        │
│  2. setHasChanges(false)                                           │
│  3. await refetchQueries()                                          │
│  4. setInitializedForProposal(null) ← PROBLEMA AQUI                │
│  5. useEffect dispara porque initializedForProposal mudou          │
│  6. existingItems ainda pode ter dados ANTIGOS do cache            │
│  7. setItems(dadosAntigos) ← SOBRESCREVE AS ALTERAÇÕES!            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Solução Proposta

### 1. Corrigir CreateProposalDialog.tsx

Mover o `useCallback` para o corpo do componente:

```typescript
// CORRETO - Hook no corpo do componente
const handleCartItemsChange = useCallback((items: CartItem[]) => {
  setCartItems(items);
  const total = items.reduce((acc, item) => {
    const basePrice = item.priceOverride ?? item.product.base_price ?? 0;
    const discountAmount = item.discount ? basePrice * (item.discount / 100) : 0;
    return acc + (basePrice - discountAmount) * item.quantity;
  }, 0);
  if (total > 0) {
    setPrice(total.toString());
  }
}, []);

// No JSX - usar a referência estável
<POSProposalBuilder
  onItemsChange={handleCartItemsChange}
/>
```

### 2. Corrigir ProposalItemsEditor.tsx

Remover o reset da flag `initializedForProposal` após guardar. O refetch já sincroniza os dados, não precisamos re-inicializar:

```typescript
const handleSave = async () => {
  try {
    await updateItems.mutateAsync({
      proposalId,
      items: items.filter((item) => item.name.trim() !== ""),
    });
    setHasChanges(false);
    
    // Forçar refetch e ESPERAR pelos dados frescos
    await queryClient.refetchQueries({ 
      queryKey: ["proposal-items", proposalId] 
    });
    
    // NÃO resetar initializedForProposal - evita race condition
    // O estado local já está correto após save
    
    toast.success("Itens guardados com sucesso!");
    onSaved?.();
  } catch (error) {
    toast.error("Erro ao guardar itens");
  }
};
```

### 3. Adicionar Sincronização Controlada

Permitir resync apenas quando os dados do servidor forem definitivamente diferentes (nova abertura do diálogo):

```typescript
// Resetar a flag quando o proposalId muda (novo diálogo aberto)
useEffect(() => {
  if (proposalId !== initializedForProposal) {
    // Apenas marcar como não-inicializado para novo proposalId
    // A inicialização ocorrerá no próximo effect
  }
}, [proposalId]);

// Inicialização - apenas quando dados chegam E não está inicializado
useEffect(() => {
  if (loadingItems || initializedForProposal === proposalId) {
    return;
  }
  
  if (existingItems !== undefined) {
    const mappedItems = existingItems.map((item, idx) => ({...}));
    setItems(mappedItems);
    setHasChanges(false);
    setInitializedForProposal(proposalId);
  }
}, [existingItems, loadingItems, proposalId, initializedForProposal]);
```

---

## Ficheiros a Modificar

### 1. `src/components/proposals/CreateProposalDialog.tsx`
- Mover `useCallback` do JSX para o corpo do componente (correção crítica)
- Garantir referência estável para `onItemsChange`

### 2. `src/components/proposals/ProposalItemsEditor.tsx`
- **Remover** `setInitializedForProposal(null)` do `handleSave`
- Manter o estado local após save (já está correto)
- A sincronização com servidor ocorre apenas na abertura inicial

---

## Detalhes Técnicos

### Porque Resetar a Flag Causa Problemas

O problema é uma race condition:

1. Após `setInitializedForProposal(null)`, o React agenda um re-render
2. O `useEffect` com `[existingItems, loadingItems, proposalId, initializedForProposal]` dispara
3. `existingItems` pode ainda conter dados do cache anterior
4. O effect sobrescreve `items` com dados desatualizados

### Solução Correta

Não resetar a flag após save. O estado local já reflete as alterações corretas. Só precisamos re-inicializar quando:
- O diálogo abre com um **novo** `proposalId`
- O utilizador fecha e reabre o diálogo

---

## Resultado Esperado

Após as correções:
1. Quantidades atualizam imediatamente na UI
2. Totais recalculam instantaneamente
3. Ao clicar "Guardar", os dados persistem corretamente
4. Sem race conditions ou sobrescrita de dados
5. Callbacks estáveis evitam re-renders desnecessários

---

## Estimativa

- CreateProposalDialog: ~10 linhas movidas
- ProposalItemsEditor: ~5 linhas removidas/ajustadas
- **Total: ~15 linhas de alteração**

