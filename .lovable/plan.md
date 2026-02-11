
# Logótipos de Marca nos Produtos

## Objetivo

Quando a IA cria um produto (via SKU ou fotografia), além de guardar o nome da marca nas especificações, deve também pesquisar e guardar o logótipo oficial da marca. Este logótipo será exibido na ficha do produto na loja e no backoffice.

## O Que Muda

### 1. Nova coluna na tabela `products`

| Coluna | Tipo | Descrição |
|---|---|---|
| `brand_logo_url` | text | URL do logótipo da marca guardado no storage |

### 2. Edge Function `ai-product-assistant`

Nos modos `sku-search` e `image-to-product`, após identificar a marca:

- Adicionar ao prompt da IA um campo `"brandLogoSearchQuery"` para gerar termos de pesquisa do logótipo (ex: "Hikvision logo PNG transparent")
- Fazer uma pesquisa Firecrawl adicional: `"{marca} logo png transparent site:logo.com OR site:brandsoftheworld.com OR site:seeklogo.com"`
- Extrair a melhor imagem de logótipo dos resultados
- Fazer upload para o bucket `product-images` (pasta `brands/`)
- Devolver o campo `brandLogoUrl` na resposta

O JSON de resposta passa a incluir:
```text
{
  ...campos existentes,
  "brandLogoUrl": "url_do_logo_encontrado"
}
```

### 3. Frontend - `StoreQuickProductDialog`

- Ler o novo campo `brandLogoUrl` da resposta da IA
- Fazer upload do logo para o storage (se for URL externo)
- Guardar na coluna `brand_logo_url` ao criar o produto
- Mostrar o logótipo no preview do produto (ao lado do nome da marca)

### 4. Exibição na Loja

Nos componentes de listagem e detalhe de produto, mostrar o logótipo da marca quando disponível, em vez de (ou junto a) o texto da marca nas especificações.

## Secção Técnica

### Migração SQL

```text
ALTER TABLE products ADD COLUMN brand_logo_url text;
```

### Ficheiro: `supabase/functions/ai-product-assistant/index.ts`

Nos modos `sku-search` e `image-to-product`:

1. Extrair `brand` das specifications da resposta da IA
2. Se brand existe, pesquisar logo via Firecrawl:
   - Query: `"{brand}" logo png transparent`
   - Filtrar imagens por extensão (.png, .svg, .webp) e tamanho razoável
3. Fazer upload da melhor imagem para `product-images/brands/{brand_slug}.png`
4. Incluir `brandLogoUrl` na resposta

### Ficheiro: `src/components/store/StoreQuickProductDialog.tsx`

- Mapear `result.brandLogoUrl` para o preview
- Incluir `brand_logo_url` no insert do produto
- Mostrar thumbnail do logo no formulário de preview

### Ficheiro: `src/pages/StoreProductsAdminPage.tsx`

- Incluir `brand_logo_url` na query de produtos
- Mostrar mini-logo na coluna de marca (se disponível)

### Resumo de ficheiros

| Ficheiro | Alteração |
|---|---|
| Nova migração SQL | Adicionar coluna `brand_logo_url` à tabela `products` |
| `supabase/functions/ai-product-assistant/index.ts` | Pesquisar e devolver logótipo da marca via Firecrawl |
| `src/components/store/StoreQuickProductDialog.tsx` | Guardar logo da marca ao criar produto |
| `src/pages/StoreProductsAdminPage.tsx` | Mostrar logo da marca na tabela de admin |
