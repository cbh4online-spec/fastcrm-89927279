
# Plano: Correção da Visualização de Tipos de Produto na Lista

## Problema Identificado

A lista de produtos usa `productTypeLabels[product.product_type]` para mostrar o tipo, mas este objeto está hardcoded em `types/product.ts` com apenas 7 tipos:

```typescript
// Linha 307 de ProductsList.tsx
<Badge variant="outline">
  {productTypeLabels[product.product_type]}  // ← Retorna undefined para tipos novos!
</Badge>
```

Os tipos hardcoded são:
- simple, recurring, sessions, composite, formacao, programa, physical

Quando crias um novo tipo como "Serviço" ou "SaaS", o sistema não encontra o label e mostra vazio.

## Solucao

### Abordagem: Criar Helper com Fallback Dinamico

1. Criar uma funcao helper que:
   - Primeiro procura no objecto local `productTypeLabels` (para compatibilidade)
   - Se nao encontrar, usa os dados da tabela `product_types`
   - Como ultimo recurso, capitaliza o codigo do tipo

2. Actualizar `ProductsList.tsx` para usar esta logica dinamica

### Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/products/ProductsList.tsx` | Importar `useProductTypes` e usar labels dinamicos |

### Implementacao

```typescript
// Linha 69: Adicionar import
import { useProductTypes } from "@/hooks/useProductSettings";

// Dentro do componente (apos linha 175):
const { data: productTypesConfig } = useProductTypes();

// Helper para obter label do tipo
const getProductTypeLabel = (typeCode: string) => {
  // Primeiro, verificar se existe na config dinamica
  const dynamicType = productTypesConfig?.find(t => t.code === typeCode);
  if (dynamicType) return dynamicType.label;
  
  // Fallback para labels estaticos (compatibilidade)
  if (typeCode in productTypeLabels) {
    return productTypeLabels[typeCode as ProductType];
  }
  
  // Ultimo recurso: capitalizar o codigo
  return typeCode.charAt(0).toUpperCase() + typeCode.slice(1);
};

// Linha 307: Actualizar render
<Badge variant="outline">
  {getProductTypeLabel(product.product_type)}
</Badge>
```

### Mesma Logica para Billing Types

```typescript
const { data: billingTypesConfig } = useBillingTypes();

const getBillingTypeLabel = (typeCode: string) => {
  const dynamicType = billingTypesConfig?.find(t => t.code === typeCode);
  if (dynamicType) return dynamicType.label;
  if (typeCode in billingTypeLabels) {
    return billingTypeLabels[typeCode as BillingType];
  }
  return typeCode.charAt(0).toUpperCase() + typeCode.slice(1);
};

// Linha 337: Actualizar render
return getBillingTypeLabel(product.billing_type);
```

### Actualizar FilterSidebar

A sidebar de filtros tambem tem tipos hardcoded (linhas 184-192). Precisa ser dinamica:

```typescript
const filterGroups: FilterGroup[] = useMemo(() => {
  const typeItems = productTypesConfig?.filter(t => t.is_active).map(type => ({
    id: `type_${type.code}`,
    label: type.label,
    icon: <Package className="h-4 w-4" />
  })) || [];
  
  return [
    {
      id: "type",
      label: "Tipo",
      icon: <Layers className="h-4 w-4" />,
      defaultOpen: true,
      items: typeItems,
    },
    // ... resto dos grupos
  ];
}, [productTypesConfig]);
```

## Beneficios

- Tipos criados nas configuracoes aparecem imediatamente na lista
- Compatibilidade total com produtos existentes
- Filtros da sidebar tambem funcionam com tipos dinamicos
- Fallback gracioso para tipos desconhecidos

## Testes

Apos implementacao:
1. Criar novo tipo de produto nas configuracoes (ex: "SaaS")
2. Criar produto com esse tipo
3. Verificar que o tipo aparece na lista de produtos
4. Verificar que aparece nos filtros da sidebar
