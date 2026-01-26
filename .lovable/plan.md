

# Plano: Corrigir Adição de Múltiplos Itens no Editor de Propostas

## Problema Identificado

O editor de itens da proposta tem um bug que impede adicionar múltiplos itens devido a:

1. **useEffect problemático** - Sobrescreve itens locais sempre que `existingItems` muda
2. **Sincronização incorreta** - Quando a query é invalidada após guardar, os dados são refetchados e o `useEffect` substitui o estado local
3. **Warning de forwardRef** - O componente não suporta refs (menor, mas deve ser corrigido)

## Solução Proposta

### Correcção 1: Melhorar Lógica de Inicialização

Modificar o `useEffect` para:
- Usar uma flag `isInitialized` para evitar reinicializações
- Apenas sincronizar na primeira carga, não em refetches subsequentes

```typescript
const [isInitialized, setIsInitialized] = useState(false);

useEffect(() => {
  // Só inicializar uma vez quando existingItems carrega pela primeira vez
  if (!isInitialized && existingItems !== undefined && !loadingItems) {
    if (existingItems.length > 0) {
      setItems(existingItems.map((item, idx) => ({
        id: item.id,
        product_id: item.product_id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        position: item.position ?? idx,
        is_enabled: item.is_enabled ?? true,
      })));
    }
    setIsInitialized(true);
  }
}, [existingItems, loadingItems, isInitialized]);
```

### Correcção 2: Reset Flag ao Guardar

Após guardar com sucesso, re-sincronizar os itens com os dados do servidor:

```typescript
const handleSave = async () => {
  try {
    await updateItems.mutateAsync({
      proposalId,
      items: items.filter((item) => item.name.trim() !== ""),
    });
    setHasChanges(false);
    setIsInitialized(false); // Permitir re-sincronização com dados do servidor
    toast.success("Itens guardados com sucesso!");
    onSaved?.();
  } catch (error) {
    toast.error("Erro ao guardar itens");
  }
};
```

### Correcção 3: Adicionar forwardRef

Envolver o componente com `React.forwardRef` para eliminar o warning:

```typescript
export const ProposalItemsEditor = React.forwardRef<
  HTMLDivElement,
  ProposalItemsEditorProps
>(function ProposalItemsEditor({ proposalId, onSaved }, ref) {
  // ... componente
  return (
    <div ref={ref} className="space-y-4">
      {/* conteúdo */}
    </div>
  );
});
```

### Correcção 4: Incluir is_enabled no EditableItem

Adicionar o campo `is_enabled` à interface e ao mapeamento:

```typescript
interface EditableItem {
  id?: string;
  product_id?: string | null;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  position: number;
  is_enabled?: boolean; // Novo campo
}
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/ProposalItemsEditor.tsx` | Corrigir useEffect, adicionar forwardRef, incluir is_enabled |

---

## Resultado Esperado

1. Utilizador pode adicionar quantos itens quiser sem perda de dados
2. Itens locais não são sobrescritos até guardar
3. Após guardar, os itens sincronizam correctamente com o servidor
4. Warning de forwardRef eliminado
5. Campo `is_enabled` incluído na edição de itens

