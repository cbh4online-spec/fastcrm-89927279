

# Plano: Unificar Categorias — Produto + Loja

## Diagnóstico

Existem **3 sistemas de categorias desconectados**:

| Sistema | Tabela | Uso atual |
|---|---|---|
| 1. Texto livre | `products.category` (text) | Preenchido nos produtos ("Câmeras de Segurança", "SaaS") |
| 2. Categorias de produto | `product_categories` (tabela) | 18+ registos com imagens, usadas no backoffice (tab Categorias) |
| 3. Categorias de loja | `store_categories` (tabela) | 1 registo, usadas no storefront — **zero produtos ligados** |

**Resultado**: Os produtos têm `store_category_id = NULL` para todos. A loja mostra categorias vazias ou ignora-as. O cliente não consegue filtrar por categoria.

A `product_categories` é a tabela mais rica (imagens, parent_id para hierarquia, posição, cores, ícones) e já está integrada no módulo de produtos. A `store_categories` é uma duplicação empobrecida.

---

## Solução: `product_categories` como fonte única

Eliminar `store_categories` e usar `product_categories` como sistema central tanto para backoffice como para loja.

### Passo 1 — Migração de dados
- Adicionar coluna `slug` e `store_visible` (bool, default true) à tabela `product_categories`
- Migrar os produtos: mapear `products.category` (texto) → `product_categories.id` e preencher `store_category_id` com o ID correspondente (match por nome)
- Gerar slugs automáticos a partir do nome

### Passo 2 — Actualizar storefront para usar `product_categories`
- Alterar `useStoreCategories` para consultar `product_categories` (com `is_active = true` e `store_visible = true`)
- Alterar `StoreCategoryCarousel` e `StoreCategoryNav` para usar o novo tipo
- Alterar `useStoreProducts` para filtrar por `store_category_id` ligado a `product_categories`
- Adicionar contagem de produtos por categoria no carousel (badge com count)

### Passo 3 — Actualizar backoffice
- Na tab Categorias do módulo Produtos, adicionar toggle "Visível na Loja" (`store_visible`)
- Remover a página `StoreCategoriesPage` separada (ou redirecionar para tab Categorias)
- No formulário de criação/edição de produto, usar select ligado a `product_categories` em vez de texto livre

### Passo 4 — Melhorar UX do storefront
- Mostrar apenas categorias com pelo menos 1 produto publicado
- Imagens das categorias vindas de `product_categories.image_url`
- Contagem de produtos visível em cada card de categoria
- Suporte a subcategorias via `parent_id` (futuro, estrutura já existe)

### Passo 5 — Limpeza
- Deprecar hooks `useAdminStoreCategories` (substituir por `useProductCategoriesList`)
- Remover referências à tabela `store_categories` no código

---

## Ficheiros Afetados

| Ficheiro | Acção |
|---|---|
| Migração SQL | Adicionar `slug`+`store_visible` a `product_categories`; mapear produtos |
| `src/hooks/useStoreProducts.ts` | `useStoreCategories` → consultar `product_categories` |
| `src/components/store/sections/StoreCategoryCarousel.tsx` | Adaptar tipo + mostrar count |
| `src/components/store/sections/StoreCategoryNav.tsx` | Adaptar tipo |
| `src/components/store/StoreFilterSidebar.tsx` | Adaptar tipo de categorias |
| `src/components/products/CategoriesTabContent.tsx` | Adicionar toggle "Visível na Loja" |
| `src/hooks/useProductCategories.ts` | Adicionar campo `slug`/`store_visible` ao tipo |
| `src/hooks/useAdminStoreCategories.ts` | Deprecar/remover |
| `src/pages/StoreCategoriesPage.tsx` | Redirecionar ou remover |

## Critérios de Aceitação
- Todas as categorias visíveis na loja vêm de `product_categories`
- Produtos automaticamente ligados às categorias correctas
- Filtrar por categoria na loja devolve produtos reais
- Categorias sem produtos publicados não aparecem na loja
- Toggle "Visível na Loja" funcional no backoffice

