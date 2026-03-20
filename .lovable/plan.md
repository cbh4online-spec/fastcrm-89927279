

# Feed CSV — Ver Todas as Colunas + IA para Categorias

## Problema Atual

1. O preview do feed CSV mostra apenas as **6 primeiras colunas** (`previewHeaders.slice(0, 6)`) — o utilizador não vê todas as colunas disponíveis no CSV da Visiotech
2. Não há mecanismo para **selecionar quais colunas importar** (todas as mapeadas são importadas)
3. O campo `category` do CSV é usado tal como vem do fornecedor — sem sugestão inteligente de categorias/subcategorias do sistema

## Alterações Propostas

### 1. Preview com Todas as Colunas (UI)

**Ficheiro**: `src/components/procurement/SupplierFeedConfigDialog.tsx`

- Remover o `.slice(0, 6)` no header e body da tabela de preview para mostrar **todas as colunas**
- Adicionar scroll horizontal com indicador visual
- Mostrar contagem total de colunas: "X colunas encontradas"
- Adicionar checkboxes em cada coluna do preview para o utilizador marcar quais quer importar
- As colunas selecionadas são guardadas no `column_mapping`; as não selecionadas são ignoradas

### 2. Mapeamento Expandido com Seleção

**Ficheiro**: `src/components/procurement/SupplierFeedConfigDialog.tsx`

Reestruturar a secção de mapeamento:
- Em vez de listar os campos do sistema e pedir para mapear uma coluna CSV a cada um, inverter a lógica: **listar todas as colunas CSV** com um dropdown para cada uma indicando para que campo do sistema mapeia (ou "Ignorar")
- Adicionar campos extra ao `PRODUCT_FIELDS`: `subcategory`, `weight`, `dimensions`, `model`, `line`/`family`
- Mostrar uma checkbox "Incluir" por coluna para ativar/desativar rapidamente

### 3. Sugestão de Categorias com IA (Edge Function)

**Criar**: `supabase/functions/ai-category-suggest/index.ts`

Nova edge function que:
- Recebe `{ product_names: string[], existing_categories: string[], workspace_id }` (batch de até 50 nomes)
- Usa Lovable AI (Gemini 3 Flash) para:
  - Analisar os nomes dos produtos
  - Sugerir a **melhor categoria** e **subcategoria** existentes no workspace
  - Se nenhuma existente encaixa, sugerir **nova categoria + subcategoria** com nome em português
- Retorna `{ suggestions: [{ product_name, category, subcategory, is_new_category, confidence }] }`

### 4. Suporte a Subcategorias (DB Migration)

Adicionar `parent_id` à tabela `product_categories` para suportar subcategorias:
```text
ALTER TABLE product_categories
  ADD COLUMN IF NOT EXISTS parent_id UUID
    REFERENCES product_categories(id) ON DELETE SET NULL;
```

Adicionar `subcategory` ao `products`:
```text
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS subcategory TEXT;
```

### 5. IA no Fluxo de Sync (Edge Function Update)

**Ficheiro**: `supabase/functions/supplier-feed-sync/index.ts`

Após parsear o CSV e antes de fazer upsert:
- Se o mapeamento inclui categoria mas o utilizador ativou "Sugestão IA de categorias":
  - Agrupa os produtos em batches de 50 nomes
  - Chama `ai-category-suggest` para cada batch
  - Usa as sugestões para preencher `category` e `subcategory` em vez do valor bruto do CSV
  - Cria automaticamente categorias novas em `product_categories` se sugeridas pela IA

### 6. UI de Revisão de Categorias IA

**Criar**: `src/components/procurement/SupplierFeedCategoryPreview.tsx`

Componente mostrado no `SupplierFeedConfigDialog` antes de confirmar sync:
- Tabela com: Produto | Categoria CSV Original | Categoria Sugerida (IA) | Subcategoria | Ação
- O utilizador pode aceitar, editar ou ignorar cada sugestão
- Toggle global: "Usar sugestões IA para categorias" (on/off)
- Botão "Pré-visualizar categorias" que processa uma amostra de 20 produtos
- Badge de confiança (alta/média/baixa) por sugestão

### 7. Hook de Sugestão IA

**Criar**: `src/hooks/useFeedCategorySuggestions.ts`

- `suggestCategories(productNames: string[])` → chama `ai-category-suggest`
- `suggestions[]`, `isLoading`, `applySuggestions()`

## Fluxo do Utilizador

```text
1. Configura feed URL → Testa URL
2. Vê TODAS as colunas do CSV com preview completo
3. Seleciona quais colunas importar (checkboxes)
4. Mapeia colunas selecionadas → campos do sistema
5. Ativa "Sugestão IA de categorias"
6. Clica "Pré-visualizar categorias" → vê sugestões IA
7. Aceita/edita sugestões → Guarda feed → Sincroniza
```

## Ficheiros Modificados
- `src/components/procurement/SupplierFeedConfigDialog.tsx` — preview completo + mapeamento invertido
- `supabase/functions/supplier-feed-sync/index.ts` — integração com IA categories
- `supabase/functions/ai-category-suggest/index.ts` — nova edge function
- `src/components/procurement/SupplierFeedCategoryPreview.tsx` — novo componente
- `src/hooks/useFeedCategorySuggestions.ts` — novo hook
- Migration: `parent_id` em `product_categories`, `subcategory` em `products`

