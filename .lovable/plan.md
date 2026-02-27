

# Redesign da Landing Page FastCRM inspirada em robertocortez.pt

## Elementos de design a adoptar

A página de referência tem um estilo visual distinto: tipografia bold/uppercase com grande impacto, hero full-bleed com imagem de fundo e formulário inline, cards de serviços com imagens, secções com labels pequenos acima dos títulos, e CTAs vermelhos de grande destaque. Vamos adaptar estes princípios ao contexto SaaS do FastCRM OS.

## Alterações

### 1. `LandingHeroSection.tsx` — Redesign completo
- Headline uppercase, extra-bold, tamanho maior (6xl-8xl)
- Formulário de email inline no hero (nome + email + botão "Start Free") em vez de dois botões separados
- Remover o mock dashboard à direita — substituir por uma imagem/visual de fundo full-bleed com overlay escuro (manter o `pricingBg` existente mas com mais opacidade)
- Layout centrado ou left-aligned com mais peso visual
- Badge "AI Revenue Operating System" mais proeminente

### 2. `LandingSolutionSection.tsx` — Cards com visual mais forte
- Adicionar imagens ou ícones maiores nos cards (estilo dos cards de serviço do Roberto Cortez)
- Labels pequenos acima dos títulos (já existem com `pillar.headline`, manter)
- Botão "saber mais" em cada card que faz scroll para a secção relevante

### 3. `LandingProblemSection.tsx` — Tipografia mais impactante
- Headline uppercase bold
- Cards com mais destaque visual (bordas coloridas ou gradientes subtis)

### 4. `LandingComparisonSection.tsx` — Layout mais visual
- Cards maiores com mais espaço
- Tipografia uppercase nos títulos

### 5. `LandingPositioningSection.tsx` — Secção "Sobre" / "Para quem é"
- Inspirar no estilo "Sobre mim" com foto — adaptar para "Built for revenue teams" com visual mais humano
- Cards de segmento com mais destaque

### 6. `LandingFinalCTA.tsx` — CTA mais forte
- Headline uppercase bold
- Formulário de email inline (consistente com o hero)
- Botão vermelho/primário de grande destaque

### 7. `LandingStickyHeader.tsx` — Ajustes menores
- Tipografia do logo mais bold/uppercase (estilo "ROBERTO CORTEZ")
- Navegação mais espaçada

### 8. `LandingFooter.tsx` — Simplificar
- Estilo mais limpo, uma linha como na referência

## Ficheiros a modificar

1. `src/components/landing-fastcrm/LandingHeroSection.tsx`
2. `src/components/landing-fastcrm/LandingSolutionSection.tsx`
3. `src/components/landing-fastcrm/LandingProblemSection.tsx`
4. `src/components/landing-fastcrm/LandingComparisonSection.tsx`
5. `src/components/landing-fastcrm/LandingPositioningSection.tsx`
6. `src/components/landing-fastcrm/LandingFinalCTA.tsx`
7. `src/components/landing-fastcrm/LandingStickyHeader.tsx`
8. `src/components/landing-fastcrm/LandingFooter.tsx`

## Resumo visual

```text
ANTES                          DEPOIS
─────                          ──────
Hero: 2 colunas + mock UI  →   Hero: full-bleed, headline uppercase 8xl, form inline
Sections: tipografia normal →   Sections: uppercase bold, labels acima títulos
Cards: bordas subtis        →   Cards: maiores, mais impactantes, com CTAs
CTA final: botão simples   →   CTA final: form inline + botão grande vermelho
```

