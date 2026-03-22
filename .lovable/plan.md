

# Importar Imagens dos Produtos durante Importação CSV

## Problema

O campo `image_url` é mapeado e extraído do CSV correctamente (linha 430: `case "image_url": itemData.imageUrl = val`), mas:

1. **`createSelectedProducts`** (linha 580-593) constrói o payload do produto mas **ignora `imageUrl`** — nunca o passa ao batch hook
2. **`useCreateProductsBatch`** insere apenas na tabela `products` — **nunca cria registos na tabela `product_images`**
3. As imagens dos produtos vivem na tabela `product_images` (separada), com campos `product_id`, `workspace_id`, `url`, `position`

## Solução

### 1. Passar `imageUrl` no payload de criação

**Ficheiro**: `src/components/products/BatchSKUImportDialog.tsx` (linhas 580-593)

Adicionar `image_url` ao objecto retornado por `createSelectedProducts`:
```ts
return {
  ...existingFields,
  image_url: d?.imageUrl || undefined,  // ← adicionar
};
```

### 2. Criar registos em `product_images` após inserção batch

**Ficheiro**: `src/hooks/useProducts.ts` — dentro de `useCreateProductsBatch`

Após cada batch insert bem-sucedido na tabela `products`:
- Para os items que tinham `image_url`, buscar os `id`s dos produtos recém-criados (por SKU)
- Fazer um batch insert na tabela `product_images` com:
  - `workspace_id`, `product_id`, `url` (= image_url do CSV), `position: 0`

Lógica:
```text
1. Filtrar items com image_url do batch inserido
2. Query products por SKU para obter os IDs
3. Insert batch em product_images: { workspace_id, product_id, url, position: 0 }
```

### 3. Adicionar tipo `image_url` ao `CreateProductInput`

**Ficheiro**: `src/hooks/useProducts.ts`

Adicionar `image_url?: string` ao tipo `CreateProductInput` (campo transitório — não vai para a tabela products, é usado apenas para criar o registo em product_images).

Remover `image_url` do payload antes do insert na tabela products (para evitar erro de coluna inexistente).

## Ficheiros Modificados
- `src/components/products/BatchSKUImportDialog.tsx` — passar `image_url` no payload
- `src/hooks/useProducts.ts` — extrair `image_url`, criar registos em `product_images` após insert

