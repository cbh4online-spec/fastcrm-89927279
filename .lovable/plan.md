

# Plano: Corrigir responsividade das secções da landing page

## Diagnóstico

Analisei todas as 15 secções da landing page ao viewport de 390px (mobile actual do utilizador). Os problemas identificados:

### Problemas encontrados

1. **LandingDetailedComparison** — A tabela de comparação usa `grid-cols-[1fr_100px_100px]`, resultando em apenas ~190px para o texto das funcionalidades. Texto truncado e ilegível em mobile. Os botões de selecção de concorrente (`FastCRM vs HubSpot`, etc.) também transbordam.

2. **LandingIntegrationsSection** — O h2 usa `text-4xl` como base (sem breakpoint mobile), demasiado grande a 390px.

3. **LandingFinalCTA** — O h2 usa `text-4xl` como base, que em títulos longos em maiúsculas transborda a 390px.

4. **LandingHeroSection** — O botão CTA tem texto dinâmico longo (ex: "EXPERIMENTAR PARA CLÍNICAS →") que pode comprimir ou transbordar em mobile. O h1 `text-5xl` é grande a 390px.

5. **LandingPricingSection** — O h2 usa `text-3xl md:text-4xl` que está bem, mas os cards de bundles em `grid-cols-1 md:grid-cols-3` — OK. Os botões de preço têm `truncate` que pode cortar texto.

6. **LandingStickyHeader** — Adequado (usa Sheet em mobile). OK.

7. **LandingPositioningSection** — Grid `sm:grid-cols-3` sem breakpoint intermédio: a 390px empilha correctamente. OK mas as imagens de 96px + ícone de 56px ocupam muito espaço vertical.

## Alterações

### Ficheiro 1: `LandingHeroSection.tsx`
- h1: `text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl` (reduzir base de 5xl para 4xl)
- Botão CTA: adicionar `text-sm` em mobile, `sm:text-base`
- Subtitle: `text-base sm:text-lg`

### Ficheiro 2: `LandingDetailedComparison.tsx`
- Grid mobile: `grid-cols-[1fr_70px_70px] sm:grid-cols-[1fr_100px_100px] md:grid-cols-[1fr_140px_140px]`
- Botões de concorrente: mostrar apenas nome curto em mobile (sem "FastCRM vs"), usando classes `hidden sm:inline` / `sm:hidden`
- Texto de funcionalidade: `text-xs sm:text-sm`
- Padding: reduzir `p-3 sm:p-4`

### Ficheiro 3: `LandingIntegrationsSection.tsx`
- h2: `text-3xl sm:text-4xl md:text-5xl` (adicionar breakpoint base menor)

### Ficheiro 4: `LandingFinalCTA.tsx`
- h2: `text-3xl sm:text-4xl md:text-5xl lg:text-6xl` (reduzir base de 4xl para 3xl)

### Ficheiro 5: `LandingFastClubSection.tsx`
- Grid: já usa `sm:grid-cols-3`, OK em mobile. Sem alteração necessária.

## Critérios de aceitação
- Todas as secções legíveis e sem overflow horizontal a 390px
- Tabela de comparação navegável em mobile sem scroll horizontal
- Títulos proporcionais ao viewport em todos os breakpoints
- Botões com texto completo visível
- Build sem erros

