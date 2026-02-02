

# Plano: Corrigir Atualização de Quantidades nas Propostas (Análise Profunda)

## Problema Identificado

Após análise detalhada do código, identifiquei **três problemas críticos** que impedem as quantidades de serem atualizadas corretamente:

### Problema 1: Sincronização Bidireccional Circular no POSProposalBuilder

O `POSProposalBuilder` tem um **ciclo infinito potencial** entre os dois `useEffect`:

```typescript
// Effect 1: Sincroniza initialItems -> items (interno)
useEffect(() => {
  if (initialItems && initialItems.length > 0 && !initializedRef.current) {
    setItems(initialItems);
    initializedRef.current = true;
  }
}, [initialItems, setItems]);

// Effect 2: Sincroniza items -> onItemsChange (para o pai)
useEffect(() => {
  onItemsChange?.(items);  // <-- Chama SEMPRE que items muda
}, [items, onItemsChange]);
```

**O Problema:** Quando o pai (`CreateProposalDialog`) recebe `onItemsChange(items)`:
1. O pai atualiza `cartItems` via `setCartItems(items)`
2. O pai passa `cartItems` de volta como `initialItems` ao `POSProposalBuilder`
3. O `initialItems` mudou, mas `initializedRef.current` é `true`, então não sobrescreve
4. **MAS** quando o diálogo reabre ou há re-mount, o `initializedRef.current` reseta para `false`

### Problema 2: O hook `useProposalCart` Cria Estado Novo em Cada Mount

O hook `useProposalCart()` usa `useState` interno:

```typescript
export function useProposalCart() {
  const [items, setItems] = useState<CartItem[]>([]); // Estado NOVO em cada mount
  // ...
}
```

Quando o `POSProposalBuilder` re-monta (por exemplo, ao trocar de tab e voltar), o estado interno reseta para `[]` vazio, e só depois tenta carregar de `initialItems`.

### Problema 3: Race Condition no ProposalItemsEditor

No `ProposalItemsEditor`, o problema persiste porque:

```typescript
// O useEffect de inicialização pode disparar incorrectamente
useEffect(() => {
  if (loadingItems || initializedForProposal === proposalId) {
    return; // Deveria sair, mas...
  }
  
  if (existingItems !== undefined) {
    // ...mapeia e sobrescreve o estado local
    setItems(mappedItems);  // SOBRESCREVE qualquer alteração local!
    setInitializedForProposal(proposalId);
  }
}, [existingItems, loadingItems, proposalId, initializedForProposal]);
```

**O problema:** `existingItems` pode mudar quando a query refaz fetch (por invalidação de cache), e mesmo com `initializedForProposal === proposalId`, se o React Query fizer um refetch em background, o array `existingItems` será uma nova referência, disparando o effect.

---

## Solução Proposta

### 1. Corrigir POSProposalBuilder.tsx

**Problema:** O `useRef` não é suficiente para prevenir re-inicialização após re-mount.

**Solução:** Mover a lógica de inicialização para ser baseada em comparação de conteúdo, não apenas em flag booleana:

```typescript
export function POSProposalBuilder({
  onItemsChange,
  initialItems,
  // ...
}: POSProposalBuilderProps) {
  const {
    items,
    setItems,
    // ...
  } = useProposalCart();

  // Usar ref para rastrear se já inicializamos COM ESTES items específicos
  const lastInitializedItemsRef = useRef<string | null>(null);

  // Initialize with existing items - verificar por conteúdo, não por flag
  useEffect(() => {
    if (!initialItems || initialItems.length === 0) return;
    
    // Criar hash simples dos items para comparação
    const itemsHash = JSON.stringify(
      initialItems.map(i => ({ id: i.product.id, qty: i.quantity }))
    );
    
    // Só inicializar se for diferente do que já inicializamos
    if (lastInitializedItemsRef.current !== itemsHash) {
      setItems(initialItems);
      lastInitializedItemsRef.current = itemsHash;
    }
  }, [initialItems, setItems]);

  // Sync items to parent - usar useCallback estável
  useEffect(() => {
    onItemsChange?.(items);
  }, [items, onItemsChange]);
  
  // ...resto do componente
}
```

### 2. Corrigir ProposalItemsEditor.tsx

**Problema:** O useEffect dispara quando `existingItems` muda (nova referência do React Query).

**Solução:** Usar comparação profunda ou flag mais robusta:

```typescript
export function ProposalItemsEditor({ proposalId, onSaved }: ProposalItemsEditorProps) {
  const queryClient = useQueryClient();
  const { data: existingItems, isLoading: loadingItems, dataUpdatedAt } = useProposalItems(proposalId);
  // ...
  
  const [items, setItems] = useState<EditableItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  // Usar timestamp da query para detectar se é dados frescos vs mesmos dados
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  // Initialize items from existing data - baseado em timestamp da query
  useEffect(() => {
    // Skip if loading or if we've already synced this data
    if (loadingItems) return;
    if (lastSyncedAt === dataUpdatedAt) return;
    
    // Se temos alterações locais não guardadas, não sobrescrever
    if (hasChanges) return;
    
    if (existingItems !== undefined) {
      const mappedItems = existingItems.map((item, idx) => ({
        id: item.id,
        product_id: item.product_id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        position: item.position ?? idx,
        is_enabled: item.is_enabled ?? true,
      }));
      
      setItems(mappedItems);
      setLastSyncedAt(dataUpdatedAt);
    }
  }, [existingItems, loadingItems, dataUpdatedAt, lastSyncedAt, hasChanges]);

  // Ao guardar, resetar o sync timestamp para permitir nova sincronização
  const handleSave = async () => {
    try {
      await updateItems.mutateAsync({
        proposalId,
        items: items.filter((item) => item.name.trim() !== ""),
      });
      setHasChanges(false);
      
      // Forçar refetch e esperar
      await queryClient.refetchQueries({ 
        queryKey: ["proposal-items", proposalId] 
      });
      
      // Resetar para permitir sync com dados frescos
      setLastSyncedAt(null);
      
      toast.success("Itens guardados com sucesso!");
      onSaved?.();
    } catch (error) {
      toast.error("Erro ao guardar itens");
    }
  };
  
  // ...resto do componente
}
```

### 3. Adicionar Guard no handleUpdateItem

Prevenir valores inválidos e garantir que o estado atualiza corretamente:

```typescript
const handleUpdateItem = (index: number, field: keyof EditableItem, value: string | number) => {
  setItems((prev) => {
    const newItems = prev.map((item, i) => {
      if (i !== index) return item;
      
      // Validação específica por campo
      if (field === "quantity") {
        const qty = typeof value === "number" ? value : parseInt(String(value), 10);
        return { ...item, quantity: isNaN(qty) || qty < 1 ? 1 : qty };
      }
      if (field === "unit_price") {
        const price = typeof value === "number" ? value : parseFloat(String(value));
        return { ...item, unit_price: isNaN(price) ? 0 : price };
      }
      
      return { ...item, [field]: value };
    });
    return newItems;
  });
  setHasChanges(true);
};
```

---

## Ficheiros a Modificar

### 1. `src/components/proposals/POSProposalBuilder.tsx`
- Substituir `initializedRef` booleano por comparação de conteúdo com hash
- Prevenir re-inicialização com mesmos dados
- **~15 linhas alteradas**

### 2. `src/components/proposals/ProposalItemsEditor.tsx`
- Usar `dataUpdatedAt` do React Query para detectar dados novos vs cached
- Adicionar guard `hasChanges` para não sobrescrever alterações locais
- Melhorar `handleUpdateItem` com validação robusta
- Resetar `lastSyncedAt` após save bem-sucedido
- **~25 linhas alteradas**

---

## Detalhes Técnicos

### Porque a Solução Anterior Não Funcionou

A solução anterior focou em:
1. Mover `useCallback` para o corpo do componente ✓ (correto mas insuficiente)
2. Remover `setInitializedForProposal(null)` do save ✓ (correto mas não resolve o problema raiz)

O problema é mais profundo:
- O React Query retorna nova referência de array mesmo com mesmos dados
- A flag booleana `initializedRef` reseta em re-mount
- A flag `initializedForProposal` não considera se há alterações locais não guardadas

### Fluxo Correto Após Correção

```text
FLUXO CORRIGIDO
┌─────────────────────────────────────────────────────────────────────┐
│  1. User abre editor                                                │
│  2. existingItems carrega do React Query                           │
│  3. lastSyncedAt === null → inicializa estado local               │
│  4. User altera quantidade → hasChanges = true                     │
│  5. React Query faz background refetch (nova referência)           │
│  6. hasChanges === true → NÃO sobrescreve estado local ✓          │
│  7. User clica "Guardar"                                           │
│  8. Dados salvos → hasChanges = false, lastSyncedAt = null        │
│  9. Refetch completa → lastSyncedAt atualiza                       │
│  10. Estado local sincroniza com dados frescos ✓                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Resultado Esperado

Após as correções:
1. Quantidades atualizam imediatamente na UI ao editar
2. Alterações locais NÃO são sobrescritas por refetch em background
3. Totais recalculam instantaneamente
4. Ao clicar "Guardar", os dados persistem corretamente
5. Após save, o estado sincroniza com dados frescos do servidor
6. Sem race conditions ou ciclos infinitos

---

## Estimativa

- POSProposalBuilder: ~15 linhas
- ProposalItemsEditor: ~25 linhas
- **Total: ~40 linhas de alteração**

