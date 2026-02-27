

# Internacionalização + Imagens na Landing Page FastCRM

## Problema identificado

Quase todos os componentes da landing page tem texto hardcoded em inglês. Apenas `LandingFinalCTA` e `LandingFooter` usam `useTranslation("landing")`. Os restantes 9 componentes ignoram completamente o sistema i18n. Além disso, faltam imagens visuais nos cards e secções.

## Alterações

### 1. Adicionar i18n a todos os componentes (9 ficheiros)

Cada componente passará a usar `useTranslation("landing")` com as chaves já existentes nos JSON de tradução:

- **LandingHeroSection** — `t("hero.badge")`, `t("hero.subtitle")`, `t("hero.startFree")`, placeholders traduzidos
- **LandingStickyHeader** — `t("hero.startFree")` para botões, labels de nav traduzidas
- **LandingProblemSection** — `t("problem.title")`, `t("problem.q1")`...`t("problem.q4")`
- **LandingSolutionSection** — `t("solution.title")`, `t("solution.pillar1Name")`, etc.
- **LandingComparisonSection** — `t("comparison.title")`, `t("comparison.vsSpreadsheets")`, etc.
- **LandingArchitectureSection** — `t("architecture.title")`, `t("architecture.founder")`, etc.
- **LandingPositioningSection** — `t("positioning.title")`, `t("positioning.founders")`, etc.
- **LandingPricingSection** — `t("pricing.title")`, `t("pricing.starter")`, features traduzidas
- **LandingFAQSection** — `t("faq.q1")`...`t("faq.q8")`, `t("faq.a1")`...`t("faq.a8")`
- **LandingFastClubSection** — `t("fastclub.badge")`, `t("fastclub.title")`, etc.

### 2. Adicionar chaves de nav e placeholders ao i18n

Adicionar aos 4 ficheiros de tradução (`pt`, `en`, `es`, `fr`):
- `hero.namePlaceholder`, `hero.emailPlaceholder`, `hero.freeNote`
- `nav.features`, `nav.intelligence`, `nav.pricing`, `nav.faq`, `nav.fastclub`, `nav.signIn`

### 3. Gerar imagens ilustrativas para as secções

Usar o modelo de IA de geração de imagens para criar visuais para:
- **Solution cards** (4 imagens): CRM dashboard, analytics charts, automation workflow, marketplace
- **Hero section**: dashboard mockup ou visual mais impactante
- **Positioning/Architecture**: visuais de equipas ou personas

As imagens serão guardadas em storage e referenciadas nos componentes.

### 4. Adicionar traduções ES e FR para novas chaves

Completar os ficheiros `es/landing.json` e `fr/landing.json` com as novas chaves de nav e placeholders.

## Ficheiros a modificar
1. `src/components/landing-fastcrm/LandingHeroSection.tsx`
2. `src/components/landing-fastcrm/LandingStickyHeader.tsx`
3. `src/components/landing-fastcrm/LandingProblemSection.tsx`
4. `src/components/landing-fastcrm/LandingSolutionSection.tsx`
5. `src/components/landing-fastcrm/LandingComparisonSection.tsx`
6. `src/components/landing-fastcrm/LandingArchitectureSection.tsx`
7. `src/components/landing-fastcrm/LandingPositioningSection.tsx`
8. `src/components/landing-fastcrm/LandingPricingSection.tsx`
9. `src/components/landing-fastcrm/LandingFAQSection.tsx`
10. `src/components/landing-fastcrm/LandingFastClubSection.tsx`
11. `src/i18n/locales/pt/landing.json`
12. `src/i18n/locales/en/landing.json`
13. `src/i18n/locales/es/landing.json`
14. `src/i18n/locales/fr/landing.json`

## Nota sobre imagens

A geração de imagens via IA será feita como segunda fase, após a internacionalização estar completa, para não misturar concerns. As imagens geradas serão adicionadas aos cards de Solution, Hero e Positioning.

