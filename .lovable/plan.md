
# Plano: Corrigir Filtros de Categoria e Adicionar Controlo de Quantidade

## Problemas Identificados

| Problema | Descrição | Localização |
|----------|-----------|-------------|
| **Categorias não funcionam** | O filtro "Todas Categorias" busca categorias de todos os produtos, não das actualmente visíveis | `POSProductSelector.tsx` linha 68-80 |
| **Sem controlo de quantidade** | Clicar num produto adiciona com qty=1; não há forma de adicionar múltiplas unidades directamente | `POSProductSelector.tsx` linha 92-98 |

## Solução

### 1. Categorias Dinâmicas Baseadas no Tipo Filtrado

Actualmente:
```typescript
// Busca categorias de TODOS os produtos do workspace
const { data: categories } = useProductCategories();
```

A solução é extrair as categorias dos produtos já filtrados por tipo:
```typescript
// Categorias extraídas dos produtos actualmente carregados
const availableCategories = useMemo(() => {
  if (!products) return [];
  const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
  return cats.sort() as string[];
}, [products]);
```

### 2. Adicionar Controlo de Quantidade no ProductCard

Modificar o `ProductCard` para incluir botões +/- visíveis quando o produto está seleccionado:

```text
┌─────────────────────────────┐
│ 📦  [Serviços Técnicos]     │
│                             │
│ Consultoria IT              │
│                             │
│ € 150,00         /hora      │
│                             │
│  [-] 2 [+]        ✓         │  ← Novo: controlos de quantidade
└─────────────────────────────┘
```

### 3. Estrutura de Dados

Para suportar quantidade no selector, precisamos passar a quantidade actual e callbacks:

```typescript
interface POSProductSelectorProps {
  selectedProductIds: string[];
  quantities: Map<string, number>; // NOVO
  onAddProduct: (product: Product) => void;
  onRemoveProduct: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void; // NOVO
}
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/POSProductSelector.tsx` | Usar categorias dinâmicas; passar quantidade ao ProductCard |
| `src/components/proposals/ProductCard.tsx` | Adicionar controlos de +/- quando seleccionado |
| `src/components/proposals/POSProposalBuilder.tsx` | Passar quantidades e handler ao selector |

## Implementação Detalhada

### POSProductSelector.tsx

```typescript
interface POSProductSelectorProps {
  selectedProductIds: string[];
  quantities: Record<string, number>; // Novo
  onAddProduct: (product: Product) => void;
  onRemoveProduct: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void; // Novo
}

export function POSProductSelector({
  selectedProductIds,
  quantities,
  onAddProduct,
  onRemoveProduct,
  onUpdateQuantity,
}: POSProductSelectorProps) {
  // ...existing code...

  // Categorias baseadas nos produtos filtrados por tipo (não usar useProductCategories)
  const availableCategories = useMemo(() => {
    if (!products) return [];
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return cats.sort() as string[];
  }, [products]);

  // Resetar filtro de categoria quando o tipo muda
  useEffect(() => {
    setCategoryFilter("all");
  }, [typeFilter]);

  // ...render...
  
  // Passar dados ao ProductCard
  <ProductCard
    key={product.id}
    product={product}
    isSelected={selectedProductIds.includes(product.id)}
    quantity={quantities[product.id] || 0}
    onClick={() => handleProductClick(product)}
    onIncrement={() => onUpdateQuantity(product.id, (quantities[product.id] || 1) + 1)}
    onDecrement={() => {
      const currentQty = quantities[product.id] || 1;
      if (currentQty <= 1) {
        onRemoveProduct(product.id);
      } else {
        onUpdateQuantity(product.id, currentQty - 1);
      }
    }}
  />
}
```

### ProductCard.tsx

```typescript
interface ProductCardProps {
  product: Product;
  isSelected?: boolean;
  quantity?: number; // Novo
  onClick: () => void;
  onIncrement?: () => void; // Novo
  onDecrement?: () => void; // Novo
}

const ProductCard = React.forwardRef<HTMLDivElement, ProductCardProps>(
  ({ product, isSelected, quantity = 0, onClick, onIncrement, onDecrement }, ref) => {
    // ...existing code...

    return (
      <Card ref={ref} ...>
        {/* Indicador de selecção com quantidade */}
        {isSelected && (
          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <span className="text-xs text-primary-foreground font-bold">
              {quantity > 0 ? quantity : "✓"}
            </span>
          </div>
        )}
        
        {/* ...existing content... */}

        {/* Controlos de quantidade quando seleccionado */}
        {isSelected && (
          <div 
            className="flex items-center justify-center gap-1 mt-2 pt-2 border-t"
            onClick={(e) => e.stopPropagation()} // Prevenir toggle de selecção
          >
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onDecrement?.();
              }}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center text-sm font-medium">
              {quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onIncrement?.();
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </Card>
    );
  }
);
```

### POSProposalBuilder.tsx

```typescript
export function POSProposalBuilder({ ... }) {
  // ...existing code...

  // Criar mapa de quantidades para o selector
  const quantities = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach(item => {
      map[item.product.id] = item.quantity;
    });
    return map;
  }, [items]);

  return (
    <div className="grid ...">
      <POSProductSelector
        selectedProductIds={getSelectedProductIds()}
        quantities={quantities} // Novo
        onAddProduct={handleAddProduct}
        onRemoveProduct={handleRemoveProduct}
        onUpdateQuantity={handleUpdateQuantity} // Novo
      />
      {/* ...rest... */}
    </div>
  );
}
```

## Fluxo de UX Melhorado

```text
1. Utilizador selecciona "Formação" no filtro de tipos
   → Produtos filtrados mostram apenas formações
   → Categorias actualizam automaticamente para mostrar só categorias de formações
   → Filtro de categoria reset para "Todas"

2. Utilizador clica num produto
   → Produto adicionado ao carrinho com qty=1
   → Card mostra controlos de +/-
   → Badge mostra "1"

3. Utilizador clica [+] no card
   → Quantidade incrementada para 2
   → Badge actualiza para "2"
   → Carrinho sincronizado automaticamente

4. Utilizador clica [-] quando qty=1
   → Produto removido do carrinho
   → Card volta ao estado não-seleccionado
```

## Benefícios

1. **Categorias Funcionais** - Filtram apenas o que é relevante para o tipo actual
2. **Gestão Rápida** - Adicionar/remover quantidades sem ir ao carrinho
3. **Feedback Visual** - Badge mostra quantidade, não apenas ✓
4. **Consistência** - Mesmo modelo de dados entre selector e carrinho

## Complexidade

Média - Modificar 3 ficheiros com novas props e lógica de estado.
