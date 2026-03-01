
# Adicionar Secção de Logos de Integrações à Landing Page

## O que será criado

Uma nova secção `LandingIntegrationsSection` com logos/ícones das integrações do FastCRM, posicionada entre a `LandingSolutionSection` e a `LandingComparisonSection`.

## Integrações a incluir

- **Pagamentos**: Stripe
- **Comunicação**: WhatsApp, Gmail, Google Calendar
- **CRM/Marketing**: Zoho, GoHighLevel (GHL), HubSpot
- **Social**: Instagram, Facebook
- **Produtividade**: Google Sheets, Slack, Zapier
- **E-commerce**: Shopify
- **Outros**: Twilio, Mailchimp, Calendly

Total: ~16 logos, organizados numa grelha animada com scroll infinito horizontal (marquee effect).

## Design

- Fundo escuro consistente com o resto da landing
- Título + subtítulo traduzidos (badge "INTEGRAÇÕES")
- Duas filas de logos em marquee (direções opostas) para efeito visual dinâmico
- Cada logo: ícone SVG inline ou texto estilizado dentro de um card glassmorphism (border subtle, bg semi-transparente)
- Hover effect: escala + brilho + cor da marca
- Animação framer-motion para entrada + CSS animation para marquee contínuo

## Ficheiros a criar/modificar

### 1. Criar `src/components/landing-fastcrm/LandingIntegrationsSection.tsx`
- Componente com marquee duplo de logos de integrações
- Ícones SVG inline para cada integração (simples, monocromáticos no estado normal, coloridos no hover)
- Animações framer-motion para reveal + CSS keyframes para marquee

### 2. Actualizar ficheiros i18n (4 ficheiros)
Adicionar chaves `integrations.*` a `pt/landing.json`, `en/landing.json`, `es/landing.json`, `fr/landing.json`:
- `integrations.badge` — "Integrações" / "Integrations" / etc.
- `integrations.title` — "Conecte-se a tudo" / "Connect to everything"
- `integrations.subtitle` — descrição breve

### 3. Actualizar `src/pages/FastCRMLanding.tsx`
- Importar e inserir `LandingIntegrationsSection` entre `LandingSolutionSection` e `LandingComparisonSection`

## Secção Técnica

- Logos serão SVG paths inline (sem dependências externas de imagens)
- Marquee implementado com CSS `@keyframes` e `animation` (duplicação dos items para loop contínuo)
- Cada integração terá: `name`, `icon` (SVG path), `color` (cor da marca para hover)
- Responsive: 1 fila em mobile, 2 filas em desktop
