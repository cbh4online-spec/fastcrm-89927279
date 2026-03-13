

# Fix: Marketplace público `/c2c/metodopare` mostra página preta

## Diagnóstico

Investiguei a fundo e encontrei o seguinte:

1. **Dados existem** — 48 listings ativos e aprovados para o workspace `metodopare`
2. **RLS está correto** — `c2c_listings` tem policy `public_read` com `qual: true`, e `c2c_marketplace_config` permite SELECT público para `status = 'active'`
3. **Rotas existem** — `/c2c/:workspaceSlug` mapeia corretamente para `C2CPublicMarketplace`
4. **O componente RENDERIZA** — Os console logs confirmam que `C2CPublicMarketplace`, `HeroSection`, `CategoryCarousel`, `HowItWorks` etc. estão todos no component tree
5. **MAS a página aparece completamente preta** — O conteúdo existe no DOM mas é invisível

## Causa raiz

O problema é de **tema/CSS em dark mode**. A página pública herda o dark mode (`class="dark"`) e:
- `bg-background` = `hsl(220 20% 4%)` → quase preto
- `from-primary` no hero = `hsl(43 96% 56%)` → gold (deveria ser visível)
- Mas os `motion.div` com `initial={{ opacity: 0 }}` podem estar **presos em opacity:0** se o framer-motion não animar corretamente no contexto de carregamento da página

Adicionalmente, a versão publicada em `fastcrm.lovable.app` fica **presa no loading state** ("A carregar marketplace...") indefinidamente, sugerindo que a query ao Supabase demora ou falha silenciosamente no build publicado.

## Plano de correção

### 1. Forçar tema claro na página pública
A página marketplace pública deve usar sempre o tema claro para garantir visibilidade universal, independente da preferência do utilizador.

**Ficheiro:** `src/pages/c2c/C2CPublicMarketplace.tsx`
- Envolver o conteúdo num `<div className="light" style={{ colorScheme: 'light' }}>` ou usar `useEffect` para forçar `document.documentElement.classList` temporariamente

### 2. Remover dependência de framer-motion no estado inicial
Substituir `initial={{ opacity: 0 }}` por `initial={false}` ou remover animações de entrada nos elementos críticos (hero, listagens), garantindo que o conteúdo é sempre visível mesmo sem animação.

### 3. Adicionar tratamento de erro robusto no workspace resolver
O `usePublicWorkspace` hook deve ter `retry: 1` e `throwOnError: false`, e o componente deve mostrar feedback quando a query falha (em vez de ficar preso no loading).

### 4. Adicionar timeout/fallback no loading state
Se `wsLoading` durar mais de 5 segundos, mostrar mensagem de erro/retry em vez de loading infinito.

### 5. Aplicar mesma correção às outras páginas públicas
- `C2CPublicListingDetail.tsx`
- `C2CPublicCategoryPage.tsx`  
- `C2CPublicSearchPage.tsx`

## Ficheiros a alterar
- `src/pages/c2c/C2CPublicMarketplace.tsx` — forçar light mode, remover opacity:0 initial, timeout no loading
- `src/pages/c2c/C2CPublicListingDetail.tsx` — mesma correção de tema
- `src/pages/c2c/C2CPublicCategoryPage.tsx` — mesma correção de tema
- `src/pages/c2c/C2CPublicSearchPage.tsx` — mesma correção de tema

