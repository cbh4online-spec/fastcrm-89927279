

# Plano: Correção e Alinhamento do Conteúdo da Landing Page

## Problemas Identificados

1. **Nomenclatura de planos inconsistente** — Landing usa Starter/Growth/Scale, produto usa START/GROW/PRO
2. **Posicionamento contraditório** — Diz "SaaS" mas mostra verticais não-SaaS (Imobiliário, Clínicas, etc.)
3. **Features exageradas** — Tabela comparativa marca 24/24 como verde, incluindo features não confirmadas
4. **Preços desalinhados** — Hero diz "2 utilizadores grátis", Pricing diz "3 utilizadores"; Schema.org diz €79 Starter mas landing diz €0
5. **Testemunhos fictícios duplicados** — Dois sets diferentes de testemunhos falsos
6. **Diferenciadores reais subexplorados** — Método PARE, verticais dedicadas, marketplace modular

## Alterações Propostas

### 1. Alinhar nomenclatura de planos
**Ficheiro:** `src/i18n/locales/pt/landing.json` + `LandingPricingSection.tsx`
- Renomear: Starter → FASTCRM START, Growth → FASTCRM GROW, Scale → FASTCRM PRO
- Alinhar preços com a realidade do produto (verificar se START é €0 ou €79)

### 2. Corrigir posicionamento — de "SaaS" para "PMEs e Equipas Comerciais"
**Ficheiro:** `src/i18n/locales/pt/landing.json`
- Substituir todas as referências "SaaS" por linguagem de verticais: "empresas", "equipas comerciais", "PMEs"
- Architecture section: "Fundador SaaS" → "Fundador / Empreendedor", "SaaS em Crescimento" → "Empresa em Escala"
- Positioning: alinhar com as 8 verticais do Hero

### 3. Corrigir inconsistências de números
**Ficheiros:** `src/i18n/locales/pt/landing.json` + `index.html`
- Uniformizar "até 3 utilizadores" em Hero e FAQ
- Corrigir Schema.org no index.html para refletir plano gratuito (€0) ou atualizar para preço real

### 4. Ajustar tabela comparativa para refletir realidade
**Ficheiro:** `LandingDetailedComparison.tsx`
- Marcar como "partial" features que existem mas não estão 100% maduras (ex: Lead scoring, win/loss automático se não estiverem implementados)
- Mover "Landing pages integradas" e "Funis de conversão nativos" para "partial" se forem extensões pagas

### 5. Consolidar testemunhos
**Ficheiros:** `LandingPricingSection.tsx` + `src/i18n/locales/pt/landing.json`
- Remover testemunhos duplicados da secção de Pricing (já existem na secção Testimonials)
- Ou unificar num único set coerente
- Clarificar "500+ empresas" — remover se não for real, ou substituir por "Feito para empresas portuguesas"

### 6. Destacar diferenciadores reais — nova secção ou reescrita
**Ficheiro:** `src/i18n/locales/pt/landing.json`
- Reescrever solution section para enfatizar: Verticais dedicadas, Método PARE integrado, Marketplace modular, IA nativa, Suporte PT + RGPD
- Adicionar menção ao Método PARE na secção de solução (não apenas no FastClub)

### 7. Atualizar integrações para refletir realidade
**Ficheiro:** `LandingIntegrationsSection.tsx`
- Separar integrações ativas vs "em breve"
- Ou reduzir lista às integrações realmente funcionais

### Ficheiros a editar

| Ficheiro | Alteração |
|---|---|
| `src/i18n/locales/pt/landing.json` | Corrigir posicionamento, nomenclatura, números |
| `src/components/landing-fastcrm/LandingPricingSection.tsx` | Remover testemunhos duplicados, alinhar nomes de planos |
| `src/components/landing-fastcrm/LandingDetailedComparison.tsx` | Ajustar status de features à realidade |
| `src/components/landing-fastcrm/LandingIntegrationsSection.tsx` | Clarificar integrações reais vs futuras |
| `index.html` | Corrigir Schema.org pricing (€79 → €0 para Starter) |
| `src/components/landing-fastcrm/LandingHeroSection.tsx` | Corrigir nota de utilizadores gratuitos |

Nenhuma alteração backend necessária.

