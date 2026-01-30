

# Plano: Corrigir Sincronizacao do Estado do Carrinho

## Problema Identificado

O componente `POSProposalBuilder` chama o callback `onItemsChange` com o estado antigo de `items` antes do hook `useProposalCart` actualizar o seu estado interno. Isto causa:

1. O `cartItems` no `CreateProposalDialog` estar sempre desactualizado
2. Quando o utilizador guarda a proposta, `cartItems` esta vazio ou incompleto
3. Os itens nunca sao persistidos na tabela `proposal_items`

### Evidencia do Bug

```text
// POSProposalBuilder.tsx (linha 41-44)
const handleAddProduct = (product: Product) => {
  addItem(product);  // Estado atualiza ASYNC
  onItemsChange?.([...items, { product, quantity: 1 }]);  
  // ^ 'items' ainda é o valor ANTIGO aqui!
};
```

O mesmo padrao errado repete-se em:
- `handleAddProduct` (linha 41)
- `handleRemoveProduct` (linha 46)
- `handleUpdateQuantity` (linha 51)
- `handleUpdatePrice` (linha 60)
- `handleUpdateDiscount` (linha 69)

---

## Solucao Proposta

Refatorar o `POSProposalBuilder` para usar `useEffect` que observa mudancas no `items` e dispara `onItemsChange` automaticamente com o estado correcto:

```text
// Antes (errado)
const handleAddProduct = (product: Product) => {
  addItem(product);
  onItemsChange?.([...items, { product, quantity: 1 }]); // items antigo
};

// Depois (correcto)
useEffect(() => {
  onItemsChange?.(items);
}, [items]); // Dispara quando items realmente muda

const handleAddProduct = (product: Product) => {
  addItem(product);
  // Nao precisa chamar onItemsChange aqui
};
```

---

## Implementacao

### Ficheiro: `src/components/proposals/POSProposalBuilder.tsx`

```text
import { useEffect, useRef } from "react";
// ...imports existentes

export function POSProposalBuilder({
  opportunityTitle,
  opportunityValue,
  leadName,
  companyName,
  onItemsChange,
  initialItems,
}: POSProposalBuilderProps) {
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    updatePrice,
    updateDiscount,
    clearCart,
    getSelectedProductIds,
    setItems,
  } = useProposalCart();

  const initializedRef = useRef(false);

  // Initialize with existing items only once
  useEffect(() => {
    if (initialItems && initialItems.length > 0 && !initializedRef.current) {
      setItems(initialItems);
      initializedRef.current = true;
    }
  }, [initialItems, setItems]);

  // NOVO: Sync items to parent quando o estado muda
  useEffect(() => {
    onItemsChange?.(items);
  }, [items]);

  // Handlers simplificados - nao precisam chamar onItemsChange
  const handleAddProduct = (product: Product) => {
    addItem(product);
  };

  const handleRemoveProduct = (productId: string) => {
    removeItem(productId);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    updateQuantity(productId, quantity);
  };

  const handleUpdatePrice = (productId: string, price: number | undefined) => {
    updatePrice(productId, price);
  };

  const handleUpdateDiscount = (productId: string, discount: number | undefined) => {
    updateDiscount(productId, discount);
  };

  const handleClear = () => {
    clearCart();
  };

  // ...resto igual
}
```

---

## Vantagens da Solucao

| Antes | Depois |
|-------|--------|
| Callback com estado antigo | Callback com estado actual |
| Items nao sincronizados | Sincronizacao garantida via useEffect |
| Bug silencioso | Comportamento previsivel |
| Logica duplicada em cada handler | Logica centralizada no useEffect |

---

## Fluxo Corrigido

```text
1. Utilizador adiciona produto no POSProductSelector
2. handleAddProduct() chama addItem(product)
3. useProposalCart actualiza 'items' internamente
4. useEffect detecta mudanca em 'items'
5. onItemsChange(items) e chamado com o estado CORRETO
6. CreateProposalDialog recebe cartItems actualizados
7. handleSave() usa cartItems com todos os produtos
8. Itens sao guardados em proposal_items
```

---

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/proposals/POSProposalBuilder.tsx` | Usar useEffect para sincronizar items, simplificar handlers |

