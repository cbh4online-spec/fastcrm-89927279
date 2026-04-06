

## Plano: SEO de Imagens de Produto + Metadados para Google/Facebook

### Problema Atual
1. **Nomes de ficheiro genéricos**: Imagens são guardadas como `{productId}-{timestamp}.jpg` — sem valor SEO
2. **Alt text pobre**: Usa apenas o nome do ficheiro original ou "Imagem N"
3. **Sem metadados na tabela `product_images`**: Faltam campos como `seo_filename`, `title`, `caption`
4. **JSON-LD incompleto**: O `ProductSeoHead` já tem Schema.org básico mas não inclui imagens individuais com metadados

### O que será feito

#### 1. Migração DB — Adicionar campos SEO à tabela `product_images`
Novos campos:
- `seo_filename` (TEXT) — nome SEO-friendly gerado automaticamente (ex: `suporte-painel-aj-hub-b-AJ-BRACKETHUB-B.jpg`)
- `title` (TEXT) — título da imagem para atributo `title`
- `caption` (TEXT) — legenda para Facebook/Pinterest

#### 2. Upload com nomes SEO-friendly
Alterar `ProductImagesGallery.tsx` para:
- Gerar o nome do ficheiro no formato: `{slug-do-produto}-{sku}-{posição}.{ext}`
- Usar caracteres seguros (slugify), sem UUIDs ou timestamps no nome
- Auto-preencher `alt_text` com: `"{nome do produto} - {categoria} - {SKU}"`
- Auto-preencher `seo_filename` e `title`

#### 3. Enriquecer JSON-LD (Schema.org)
No `ProductSeoHead.tsx`:
- Expandir o campo `image` no JSON-LD de string simples para array de `ImageObject` com `name`, `contentUrl`, `caption`
- Adicionar `brand`, `category`, `gtin` (se disponível) ao schema Product
- Adicionar meta tags Facebook Product (`product:brand`, `product:category`)

#### 4. Auto-geração de alt text com IA (botão opcional)
- Adicionar botão "Gerar Alt Text com IA" na galeria de imagens
- Usa o modelo de visão para analisar a imagem e gerar alt text descritivo em português
- Preenche também `title` e `caption`

#### 5. Atualizar tipo TypeScript e hook
- Estender `ProductImage` com os novos campos
- Atualizar `useProductImages` e `useAddProductImage` para incluir os metadados

### Detalhes Técnicos

**Formato do nome SEO:**
```
suporte-painel-aj-hub-b-AJ-BRACKETHUB-B-1.jpg
{produto-slug}-{SKU}-{posição}.{extensão}
```

**Schema.org enriquecido:**
```json
{
  "@type": "Product",
  "name": "...",
  "image": [
    {
      "@type": "ImageObject",
      "contentUrl": "https://...",
      "name": "suporte-painel-aj-hub-b.jpg",
      "caption": "Suporte para painel AJ-HUB-B"
    }
  ],
  "brand": { "@type": "Brand", "name": "Ajax" },
  "category": "Acessórios de Intrusão"
}
```

**Meta tags adicionais (Facebook/Google):**
```html
<meta property="og:image:alt" content="..." />
<meta property="product:brand" content="Ajax" />
<meta property="product:category" content="Acessórios de Intrusão" />
```

### Ficheiros a modificar
- **Migration SQL** — adicionar `seo_filename`, `title`, `caption` a `product_images`
- `src/components/products/ProductImagesGallery.tsx` — upload com nomes SEO + auto-fill metadados
- `src/components/store/storefront/ProductSeoHead.tsx` — JSON-LD enriquecido + meta tags extra
- `src/types/product.ts` — estender `ProductImage`
- `src/hooks/useProductImages.ts` — passar novos campos

