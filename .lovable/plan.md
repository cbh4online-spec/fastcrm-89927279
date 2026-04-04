
# Fase 11 — SEO & Performance

## 1. Meta Tags Dinâmicas por Página
- Garantir que TODAS as páginas públicas da loja têm `<title>`, `<meta description>`, Open Graph e Twitter Cards dinâmicos
- Componente `StoreSeoHead` já existe — auditar cobertura e completar páginas em falta (home, categoria, wishlist, orders)
- Canonical URLs em todas as páginas

## 2. Dados Estruturados (JSON-LD)
- Product schema já existe — adicionar:
  - `Organization` na homepage da loja
  - `BreadcrumbList` em todas as páginas de navegação
  - `ItemList` na listagem de produtos
  - `FAQPage` se existirem FAQs

## 3. Sitemap Dinâmico
- Edge function `store-sitemap` que gera XML sitemap com:
  - Páginas estáticas da loja
  - Todos os produtos publicados (com lastmod)
  - Prioridades e changefreq adequados
- robots.txt com referência ao sitemap

## 4. Image Optimization
- Lazy loading com `loading="lazy"` em todas as imagens de produto
- `srcset` / tamanhos responsivos nas imagens principais
- Placeholder blur/skeleton durante carregamento
- Dimensões explícitas (width/height) para evitar CLS

## 5. Code Splitting & Lazy Loading
- Auditar routes — garantir que todas usam `lazy()` 
- Prefetch de rotas críticas (checkout, PDP) — já parcialmente feito
- Separar chunks de admin vs storefront

## 6. Core Web Vitals
- Reduzir CLS: dimensões explícitas em imagens e skeletons
- Reduzir LCP: priorizar hero image com `fetchpriority="high"`
- Reduzir INP: debounce em inputs de pesquisa, virtualização em listas longas

## Ficheiros

```
Novos:
├── supabase/functions/store-sitemap/   (edge function sitemap XML)
├── StoreOrganizationSchema.tsx         (JSON-LD Organization)
├── StoreItemListSchema.tsx             (JSON-LD ItemList)

Modificados:
├── StorePage.tsx                       (SEO head, JSON-LD, lazy images)
├── StoreProductPage.tsx                (image optimization, fetchpriority)
├── StoreProductCard.tsx                (lazy loading images, dimensions)
├── ProductSeoHead.tsx                  (auditar e completar)
├── StoreLayout/Header                  (preconnect hints)
```

## Critérios de Aceitação
- Lighthouse Performance ≥ 85, SEO ≥ 95 nas páginas da loja
- Todas as páginas públicas com meta tags + OG completos
- Sitemap acessível em `/api/store-sitemap`
- Imagens com lazy loading + dimensões explícitas
- JSON-LD válido (testar com Google Rich Results)
