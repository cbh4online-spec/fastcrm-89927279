

# Adicionar Secção de Testimonials/Social Proof à Landing Page

## O que será criado

Uma nova secção `LandingTestimonialsSection` com:
- Título e subtítulo traduzidos via i18n
- 3 testimonials com quote, nome, cargo, empresa e avatar placeholder
- Barra de logos de empresas (usando logos placeholder estilizados com texto)
- Animações framer-motion consistentes com o resto da landing (staggered reveals, hover effects)
- Rating com estrelas em cada testimonial

## Ficheiros a criar/modificar

### 1. Criar `src/components/landing-fastcrm/LandingTestimonialsSection.tsx`
- 3 cards de testimonial com quote, autor, cargo, empresa, rating (5 estrelas)
- Barra inferior com 5-6 logos de empresas fictícias (estilizados como texto/badges)
- Animações: staggered card reveals, parallax background, hover scale
- Usa `useTranslation("landing")` para todos os textos

### 2. Actualizar ficheiros i18n (4 ficheiros)
Adicionar chaves `testimonials.*` a `pt/landing.json`, `en/landing.json`, `es/landing.json`, `fr/landing.json`:
- `testimonials.badge`, `testimonials.title`, `testimonials.subtitle`
- `testimonials.t1Quote`, `testimonials.t1Name`, `testimonials.t1Title`, `testimonials.t1Company` (x3)
- `testimonials.trustedBy`

### 3. Actualizar `src/pages/FastCRMLanding.tsx`
- Importar e inserir `LandingTestimonialsSection` entre `LandingPositioningSection` e `LandingPricingSection`

## Testimonials de exemplo (PT)

1. **"O FastCRM mudou completamente a forma como gerimos o nosso pipeline. Em 2 semanas, já tínhamos visibilidade total."** — Ana Rodrigues, Head of Sales, TechFlow
2. **"Finalmente um CRM que nos diz o que fazer, não apenas onde guardar contactos. Os health scores são game-changer."** — Miguel Santos, Co-Founder, ScaleUp.io
3. **"Passámos de folhas de cálculo para revenue intelligence em menos de uma hora. A equipa adoptou imediatamente."** — Sofia Costa, Revenue Operations, DataBridge

