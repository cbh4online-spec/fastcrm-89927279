
# Plano: Publicar/Ocultar Produtos no Portal B2B

## Objectivo

Adicionar um toggle que permite ao utilizador escolher se cada produto deve aparecer (ou não) no catálogo do Portal B2B.

## Alterações Necessárias

### 1. Base de Dados - Nova Coluna

Criar migração para adicionar a coluna `b2b_published` à tabela `products`:

```sql
ALTER TABLE products 
ADD COLUMN b2b_published boolean DEFAULT true;

COMMENT ON COLUMN products.b2b_published IS 'Whether this product is visible in the B2B client portal';
```

O valor padrão é `true` para manter compatibilidade - produtos existentes continuam visíveis.

### 2. Tipo TypeScript

Actualizar o tipo `Product` e `CreateProductInput` em `src/types/product.ts`:

```typescript
export interface Product {
  // ... campos existentes
  b2b_published: boolean | null;
}

export interface CreateProductInput {
  // ... campos existentes
  b2b_published?: boolean;
}
```

### 3. Formulário de Criação/Edição

Adicionar toggle no `CreateProductDialog.tsx`:

```text
┌─────────────────────────────────────────────────────────────────┐
│  [...]                                                          │
│                                                                 │
│  Portal B2B                                                     │
│  ─────────────────────────────────────────────────────────────  │
│  [Toggle] Publicar no Portal B2B                               │
│           Quando ativo, este produto ficará visível para       │
│           os clientes no catálogo do portal B2B                │
│                                                                 │
│  [...]                                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Hook de Produtos

Actualizar `useProducts.ts` para incluir o novo campo nas operações de create/update.

### 5. Listagem de Produtos no Portal B2B

Modificar `useClientProducts.ts` para filtrar apenas produtos com `b2b_published = true`:

```typescript
let query = supabase
  .from("products")
  .select("...")
  .eq("workspace_id", workspaceId)
  .eq("status", "active")
  .eq("b2b_published", true)  // NOVO FILTRO
  .order("name");
```

### 6. Indicador Visual na Lista de Produtos

Adicionar badge/ícone na `ProductsList.tsx` para mostrar estado de publicação B2B.

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| (migração SQL) | Adicionar coluna `b2b_published` |
| `src/types/product.ts` | Adicionar campo ao tipo Product |
| `src/components/products/CreateProductDialog.tsx` | Adicionar toggle "Publicar no Portal B2B" |
| `src/hooks/useProducts.ts` | Incluir campo nas operações CRUD |
| `src/hooks/client-portal/useClientProducts.ts` | Filtrar por `b2b_published = true` |
| `src/components/products/ProductsList.tsx` | Mostrar indicador visual de publicação B2B |
| `src/components/products/ProductDetailDialog.tsx` | Mostrar estado de publicação nos detalhes |

## Fluxo de Utilização

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ADMINISTRADOR (Dashboard)                                             │
│                                                                         │
│  1. Cria/edita produto                                                 │
│  2. Define "Publicar no Portal B2B" = ON/OFF                           │
│  3. Guarda produto                                                     │
│                              │                                          │
│                              ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Produto com b2b_published = true                                  │ │
│  │  → Aparece no catálogo do Portal B2B                              │ │
│  │                                                                    │ │
│  │  Produto com b2b_published = false                                 │ │
│  │  → NÃO aparece no catálogo (invisível para clientes)              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  CLIENTE (Portal B2B)                                                  │
│                                                                         │
│  → Vê apenas produtos com b2b_published = true                        │
│  → Pode pesquisar, adicionar ao carrinho, encomendar                  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Interface do Toggle

O toggle será adicionado numa secção dedicada do formulário:

- **Label**: "Publicar no Portal B2B"
- **Descrição**: "Quando ativo, este produto ficará visível no catálogo para clientes B2B"
- **Ícone**: `Store` ou `Globe` do lucide-react
- **Valor padrão**: `true` (publicado por defeito)

## Benefícios

1. **Controlo granular** - Escolher produto a produto o que mostrar
2. **Produtos internos** - Manter produtos apenas para uso interno/propostas
3. **Lançamentos faseados** - Preparar produtos antes de os tornar públicos
4. **Catálogo limpo** - Mostrar apenas produtos relevantes para clientes B2B
