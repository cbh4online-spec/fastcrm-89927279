
# Fase 11 — SEO & Performance

## Concluído

### 1. Meta Tags Dinâmicas Completas
- `StoreSeoHead` agora inclui Twitter Cards, preconnect hints e ItemList JSON-LD
- `ProductSeoHead` já tinha Product + BreadcrumbList JSON-LD ✓
- Canonical URLs em todas as páginas públicas ✓

### 2. JSON-LD Completo
- **Store** (Organization) na homepage ✓
- **BreadcrumbList** no PDP ✓
- **ItemList** na listagem de produtos (top 30) ✓
- **Product** com AggregateRating no PDP ✓

### 3. Sitemap Dinâmico
- Edge function `store-sitemap` deployed ✓
- Gera XML com homepage + todos os produtos publicados
- Cache de 1h, lastmod baseado em updated_at

### 4. Image Optimization
- `loading="lazy"` + `decoding="async"` em product cards ✓
- `width`/`height` explícitos para evitar CLS ✓
- `fetchPriority="high"` na hero image do PDP ✓
- Thumbnails com dimensões explícitas ✓

### 5. Preconnect Hints
- `<link rel="preconnect">` para Supabase storage no head ✓

### 6. Code Splitting
- Todas as store routes já usam `lazy()` ✓
- Prefetch on hover nos product cards ✓
