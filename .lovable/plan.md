

## Diagnóstico

Analisando o screenshot da loja em mobile (iPhone, ~393px), identifico os seguintes problemas:

1. **Cards de produto com texto de categoria a transbordar** — O texto da categoria (ex: "ACESSORIOS DE SEGURANCA / PECAS DE REPOSICAO") é demasiado longo e ocupa 4-5 linhas no card, empurrando o nome do produto e preço para baixo
2. **Nome do produto truncado prematuramente** — `line-clamp-2` combinado com o texto longo de categoria não deixa espaço suficiente para o nome
3. **Short description visível em mobile** — Ocupa espaço desnecessário nos cards compactos de 2 colunas
4. **Padding excessivo nos cards** — `p-4` é demasiado para cards em grid de 2 colunas em mobile
5. **Badges de imagem (Destaque, Popular) com texto demasiado grande para mobile** — Sobrepõem-se na imagem pequena
6. **Quick actions (hover overlay) irrelevantes em mobile** — São ações de hover que não funcionam em touch; deviam ter alternativa touch-friendly
7. **Produto detail page (3-zone grid)** — O grid `lg:grid-cols-[1fr_1fr_320px]` funciona, mas em `md` colapsa para 2 colunas com o buy box a ocupar `md:col-span-2`, criando layout estranho em tablet

## Plano de Implementação

### 1. Otimizar StoreProductCard para mobile
**Ficheiro:** `src/components/store/StoreProductCard.tsx`
- Limitar categoria a `line-clamp-1` e reduzir font-size em mobile
- Esconder `short_description` em mobile (apenas visível em `sm:` e acima)
- Reduzir padding do info section de `p-4` para `p-3 sm:p-4`
- Reduzir tamanho do preço em mobile: `text-base sm:text-lg`
- Badges: reduzir texto e padding em mobile
- Quick actions: mostrar botão de carrinho sempre visível em mobile (não depender de hover)

### 2. Ajustar grid do catálogo para mobile
**Ficheiro:** `src/components/store/storefront/StoreCatalogSection.tsx`
- Reduzir gap no grid mobile: `gap-3 md:gap-6` (em vez de `gap-4 md:gap-6`)

### 3. Otimizar StoreProductPage para mobile
**Ficheiro:** `src/pages/store/StoreProductPage.tsx`
- Garantir que breadcrumb não transborda em mobile (adicionar `overflow-x-auto`)
- Ajustar espaçamento entre secções em mobile

### 4. Melhorar header em mobile
**Ficheiro:** `src/components/store/StoreHeader.tsx`
- Limitar largura do logo para não empurrar ícones
- Esconder nome da loja quando há logo em mobile (apenas visível em `sm:`)

## Critérios de Aceitação
- Cards legíveis em viewport de 375-414px com categoria, nome e preço visíveis sem scroll
- Sem texto a transbordar dos cards
- Botão de adicionar ao carrinho acessível em mobile (sem depender de hover)
- Header compacto sem overflow
- Layout responsivo sem quebras visuais

