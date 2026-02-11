
# Correcoes de Boas Praticas para a Loja Online

## Problemas Identificados

Analisando o screenshot e o codigo, existem varios problemas que afetam SEO, usabilidade e boas praticas de e-commerce:

### 1. Hero Banner: Descricao usada como H1 (Critico para SEO)
No screenshot, a descricao completa da loja aparece como titulo gigante no hero. Isto acontece porque o `StoreHeroCarousel` usa `storeDescription` diretamente como `<h1>`. Um H1 deve ser curto (idealmente 60-70 caracteres). A descricao longa deve ser um paragrafo (`<p>`), nao o titulo.

### 2. Nome da loja hardcoded "Loja" na pagina de produto
A pagina de produto usa `storeName="Loja"` hardcoded no footer (linha 672) e `| Loja` no titulo SEO, em vez do nome real da loja.

### 3. Falta de dados estruturados (JSON-LD)
Nao existe markup schema.org para Organization/Store nem para Product. Os motores de busca precisam deste markup para rich snippets (preco, stock, reviews nas SERPs).

### 4. Falta de URL canonica
Nenhuma pagina define `<link rel="canonical">`, essencial para evitar conteudo duplicado.

### 5. Meta tags incompletas
Falta `og:url` na homepage e o `og:image` deveria usar o banner em vez do logo.

## Seccao Tecnica

### Ficheiros a alterar

| Ficheiro | Alteracao |
|---|---|
| `src/components/store/sections/StoreHeroCarousel.tsx` | Separar H1 (nome da loja) do paragrafo (descricao). O H1 passa a ser curto como "Bem-vindo a {storeName}" e a descricao fica como `<p>` |
| `src/pages/store/StorePage.tsx` | Adicionar JSON-LD Organization + canonical URL |
| `src/pages/store/StoreProductPage.tsx` | Corrigir titulo hardcoded, adicionar JSON-LD Product, canonical URL, e passar nome real da loja ao footer |
| `src/pages/store/StoreCheckoutPage.tsx` | Usar nome real da loja no titulo |

### Detalhe das correcoes

**StoreHeroCarousel (fallback sem produtos):**
- ANTES: `<h1>{storeDescription || "Bem-vindo a ..."}</h1>`
- DEPOIS: `<h1>Bem-vindo a {storeName}</h1>` + `<p>{storeDescription}</p>`

**StorePage - JSON-LD:**
```text
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Store",
  "name": storeName,
  "description": storeDescription,
  "url": window.location.href,
  "logo": logoUrl
}
</script>
```

**StoreProductPage - JSON-LD Product:**
```text
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": product.name,
  "description": product.short_description,
  "image": images[primaryIndex],
  "sku": product.sku,
  "offers": {
    "@type": "Offer",
    "price": effectivePrice,
    "priceCurrency": product.currency,
    "availability": isOutOfStock ? "OutOfStock" : "InStock"
  },
  "aggregateRating": (se houver reviews)
}
</script>
```

**StoreProductPage - Footer:**
- ANTES: `storeName="Loja"` (hardcoded)
- DEPOIS: Buscar `storeSettings` via `usePublicStoreSettings` e usar o nome real

**Canonical URLs:**
- Adicionar `<link rel="canonical" href={...} />` em ambas as paginas

**Titulo da pagina de produto:**
- ANTES: `{product.name} | Loja`
- DEPOIS: `{product.name} | {storeName}`
