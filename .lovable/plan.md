

# Catálogo de Produtos (Flipbook Style)

## Conceito
Criar um módulo de **Catálogo Digital de Produtos** que reutiliza a engine do Flipbook (react-pageflip) para gerar catálogos visuais folheáveis a partir dos produtos da loja. O admin configura o catálogo no backoffice e partilha um link público ou embeddable.

## Arquitectura

### 1. Base de Dados (2 tabelas novas)

**`product_catalogs`** — definição do catálogo
- `id`, `workspace_id`, `title`, `subtitle`, `cover_image`, `slug` (único), `description`
- `style_tokens` (jsonb) — cores, fontes, estilo visual (mesmo formato dos eBooks)
- `settings` (jsonb) — produtos por página, layout, mostrar preços, mostrar descrição, watermark
- `status` (draft/published), `is_public` (boolean)
- `created_by`, `created_at`, `updated_at`

**`product_catalog_items`** — produtos incluídos e ordem
- `id`, `catalog_id` (FK), `product_id` (FK para products), `sort_order`
- `custom_title`, `custom_description`, `custom_image` — overrides opcionais
- `page_break_before` (boolean) — forçar nova página

RLS: escopado por workspace_id via catalog.

### 2. Backend — Edge Function `ai-catalog-suggest`
- Ação `generate_layout`: a IA recebe lista de produtos e sugere agrupamento por categoria, ordem e estilo visual adequado.
- Ação `generate_descriptions`: a IA gera descrições de catálogo otimizadas para cada produto.

### 3. Frontend — Backoffice

**`ProductCatalogListPage.tsx`** — lista de catálogos com CRUD
- Criar, duplicar, eliminar catálogos
- Estado (rascunho/publicado), link de partilha

**`ProductCatalogEditorPage.tsx`** — editor do catálogo
- Drag-and-drop para adicionar/reordenar produtos
- Seletor de produtos da loja (filtro por categoria)
- Personalização visual (cores, fontes) reutilizando `StyleTokens` dos eBooks
- Preview em tempo real do flipbook
- Botões IA: "Sugerir layout", "Gerar descrições"
- Configurações: produtos por página (1, 2, 4), mostrar preços, watermark

### 4. Frontend — Visualização Pública

**`StoreCatalogViewPage.tsx`** — rota pública `/store/:slug/catalog/:catalogSlug`
- Reutiliza `PageFlipBook` (react-pageflip) para renderizar
- Páginas geradas dinamicamente: capa → índice por categoria → páginas de produtos → contracapa
- Toolbar com navegação, fullscreen, zoom (reutiliza `FlipbookToolbar`)
- Responsivo com fallback compacto em mobile

### 5. Componente de Página de Produto para Flipbook

**`CatalogFlipbookPage.tsx`** — novo tipo de página
- Layout 1 produto: imagem grande + nome + preço + descrição + CTA
- Layout 2 produtos: grid lado a lado
- Layout 4 produtos: grid compacto com thumbnails
- Herda CSS variables do sistema de eBooks (--ebook-primary, etc.)

### 6. Rotas
- Backoffice: `/dashboard/store/catalogs` e `/dashboard/store/catalogs/:id/edit`
- Público: `/store/:workspaceSlug/catalog/:catalogSlug`

## Ficheiros a Criar/Modificar

| Ficheiro | Acção |
|---|---|
| Migration SQL (2 tabelas + RLS) | Criar |
| `src/hooks/useProductCatalogs.ts` | Criar — CRUD + query |
| `src/hooks/useAICatalog.ts` | Criar — chamadas à edge function |
| `src/pages/ProductCatalogListPage.tsx` | Criar — listagem |
| `src/pages/ProductCatalogEditorPage.tsx` | Criar — editor |
| `src/pages/store/StoreCatalogViewPage.tsx` | Criar — leitor público |
| `src/components/catalog/CatalogFlipbookPage.tsx` | Criar — renderização de página |
| `src/components/catalog/CatalogProductPicker.tsx` | Criar — seletor de produtos |
| `src/components/catalog/CatalogStyleEditor.tsx` | Criar — personalização visual |
| `supabase/functions/ai-catalog-suggest/index.ts` | Criar — IA |
| `src/routes/StoreRoutes.tsx` | Modificar — rota pública |
| Rotas dashboard | Modificar — rotas backoffice |

## Fluxo do Utilizador
1. Admin vai a **Loja → Catálogos** → clica "Novo Catálogo"
2. Define título, capa e estilo visual
3. Adiciona produtos (manual ou IA sugere agrupamento)
4. Pré-visualiza o flipbook em tempo real
5. Publica → obtém link partilhável
6. Clientes acedem ao catálogo folheável na loja

