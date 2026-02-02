
# Plano: Correção da Duplicação de Categorias nos Filtros

## Problema Identificado

O grupo "Categoria" aparece 3 vezes repetido nos filtros porque o código está a adicionar categorias **fora** do `useMemo`, modificando directamente o array em cada render:

```typescript
// Linhas 264-277 - PROBLEMA!
const validCategories = categories?.filter(...);
if (validCategories.length > 0) {
  filterGroups.splice(2, 0, {...});  // ← Modifica o array em CADA render!
}
```

Como o `useMemo` retorna a mesma referência do array, cada render adiciona mais um grupo de categorias ao mesmo array.

## Solução

Mover a lógica das categorias para **dentro** do `useMemo`, garantindo que o array é construído uma única vez e reconstruído apenas quando as dependências mudam.

### Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/products/ProductsList.tsx` | Mover categorias para dentro do useMemo |

### Código Corrigido

```typescript
const filterGroups: FilterGroup[] = useMemo(() => {
  const typeItems = productTypesConfig?.filter(t => t.is_active).map(type => ({
    id: `type_${type.code}`,
    label: type.label,
    icon: <Package className="h-4 w-4" />
  })) || [...fallback];

  const billingItems = billingTypesConfig?.filter(t => t.is_active).map(type => ({
    id: `billing_${type.code}`,
    label: type.label,
  })) || [...fallback];

  // Categorias DENTRO do useMemo
  const validCategories = categories?.filter(
    (cat): cat is string => typeof cat === "string" && cat.length > 0
  ) || [];

  const groups: FilterGroup[] = [
    { id: "type", label: "Tipo", ... },
    { id: "status", label: "Estado", ... },
  ];

  // Adicionar categorias se existirem
  if (validCategories.length > 0) {
    groups.push({
      id: "category",
      label: "Categoria",
      icon: <Tag className="h-4 w-4" />,
      defaultOpen: false,
      items: validCategories.map((cat) => ({
        id: `cat_${cat}`,
        label: cat,
      })),
    });
  }

  groups.push(
    { id: "billing", label: "Cobrança", ... },
    { id: "smart", label: "Filtros Inteligentes", ... }
  );

  return groups;
}, [productTypesConfig, billingTypesConfig, categories]); // ← Adicionar categories às dependências
```

## Resultado

- O grupo "Categoria" aparece apenas **uma vez** nos filtros
- O array é reconstruído apenas quando as configurações ou categorias mudam
- Mantém a ordem lógica: Tipo → Estado → Categoria → Cobrança → Filtros Inteligentes
