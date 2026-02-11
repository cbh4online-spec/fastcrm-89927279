

# Criacao Automatica de Categorias da Loja ao Criar Produtos

## Objetivo

Quando um produto e criado (via SKU ou fotografia), o sistema deve automaticamente:
1. Verificar se a categoria da loja (`store_categories`) ja existe
2. Se nao existir, criar a categoria com slug, descricao gerada por IA, e imagem gerada por IA
3. Ligar o produto a essa categoria via `store_category_id`
4. Garantir unicidade -- nunca duplicar categorias nem produtos

## Situacao Atual

- O `StoreQuickProductDialog` cria produtos com um campo `category` (texto livre) mas **nao cria entradas na tabela `store_categories`** nem preenche o `store_category_id`
- A tabela `store_categories` tem: `name`, `slug`, `description`, `image_url`, `workspace_id`
- Os produtos tem `store_category_id` (FK para `store_categories`) mas este campo fica vazio na criacao automatica
- Ja existe logica para gerar imagens de categorias via `ai-product-assistant` (modo `generate-category-image`)
- Ja existe logica para sugerir detalhes de categoria (modo `suggest-category-details`)

## O Que Muda

### 1. Edge Function `ai-product-assistant`

Novo modo `ensure-store-category` que recebe o nome da categoria e o workspace_id, e:

- Verifica se ja existe uma `store_category` com o mesmo nome (case-insensitive) nesse workspace
- Se existir, devolve o `id` existente
- Se nao existir:
  - Gera slug a partir do nome
  - Chama a IA para gerar descricao e meta SEO da categoria
  - Gera imagem da categoria via modelo de imagem (reutilizando a logica existente de `generate-category-image`)
  - Faz upload da imagem para o bucket `store-category-images`
  - Insere a nova categoria na tabela `store_categories`
  - Devolve o `id` da nova categoria

Resposta:
```text
{
  "success": true,
  "data": {
    "categoryId": "uuid",
    "categoryName": "Cameras de Vigilancia",
    "isNew": true,
    "imageUrl": "https://..."
  }
}
```

### 2. Verificacao de Duplicados de Produtos

Antes de criar o produto, verificar se ja existe um produto com o mesmo SKU ou nome (case-insensitive) no workspace. Se existir, avisar o utilizador em vez de criar duplicado.

### 3. Frontend - `StoreQuickProductDialog`

No `handleCreate`, antes de inserir o produto:

1. Chamar `ensure-store-category` com o nome da categoria do preview
2. Receber o `categoryId` (existente ou recem-criado)
3. Incluir `store_category_id` no insert do produto
4. Verificar se ja existe produto com mesmo SKU/nome e avisar se for duplicado

### 4. SEO Automatico

A descricao gerada pela IA para a categoria servira simultaneamente como texto SEO. O campo `description` da `store_categories` sera preenchido automaticamente com texto otimizado para motores de busca.

## Seccao Tecnica

### Ficheiro: `supabase/functions/ai-product-assistant/index.ts`

Adicionar modo `ensure-store-category`:
- Receber `categoryName`, `workspaceId`
- Query a `store_categories` por nome (ilike) e workspace
- Se nao existe: gerar descricao via IA, gerar imagem via modelo de imagem, upload para bucket, insert na tabela
- Devolver `categoryId` e `isNew`

Requer criar um Supabase client dentro da edge function usando a service role key para operacoes de base de dados.

### Ficheiro: `src/components/store/StoreQuickProductDialog.tsx`

No `handleCreate`:
- Obter `workspaceId` do contexto (ja disponivel via `useWorkspace`)
- Chamar edge function `ensure-store-category`
- Usar o `categoryId` retornado no `store_category_id` do produto
- Adicionar verificacao de duplicados (SKU ou nome) antes de criar

### Resumo de ficheiros

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/ai-product-assistant/index.ts` | Novo modo `ensure-store-category` com criacao automatica, imagem IA e SEO |
| `src/components/store/StoreQuickProductDialog.tsx` | Chamar ensure-store-category antes de criar produto, verificar duplicados, passar `store_category_id` |

Nao e necessaria migracao SQL -- todas as tabelas e colunas necessarias ja existem.

