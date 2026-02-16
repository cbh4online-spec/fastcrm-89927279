
# Gestao Avancada de Templates Verticais (AIDA) - Interface Completa de Funil

## Objetivo

Cada template vertical AIDA passa a ter a mesma interface de gestao completa que os funis multi-step, com tabs para Steps, Stats, Sales, Events e Settings -- alem do editor de conteudo AIDA que ja existe.

## Arquitectura

Criar um novo componente `VerticalFunnelManager` que serve como wrapper para templates verticais, oferecendo a interface de tabs completa. Quando o utilizador clica "Editar" num template AIDA, abre este manager em vez de ir directo ao builder.

## Alteracoes

### 1. Nova tabela de base de dados: `vertical_template_settings`

Migracao SQL para suportar settings avancados dos templates verticais (tracking codes, dominio, pixel events, etc.):

```text
vertical_template_settings
  - id (uuid)
  - template_id (fk -> vertical_templates)
  - workspace_id (uuid)
  - domain (text, nullable)
  - path (text, nullable)
  - favicon_url (text, nullable)
  - head_tracking_code (text, nullable)
  - body_tracking_code (text, nullable)
  - chat_widget (text, default 'none')
  - payment_mode_live (boolean, default false)
  - require_credit_card (boolean, default false)
  - image_optimization (boolean, default true)
  - optimize_javascript (boolean, default true)
  - gdpr_compliant_fonts (boolean, default false)
```

Tabela `vertical_tracking_events` para pixels Meta:

```text
vertical_tracking_events
  - id (uuid)
  - template_id (fk -> vertical_templates)
  - workspace_id (uuid)
  - pixel_id (text)
  - access_token (text, nullable)
  - tracking_level (text, default 'standard')
  - events_tracked (text[])
  - is_active (boolean, default true)
```

Tabela `vertical_template_sales` para registar vendas:

```text
vertical_template_sales
  - id (uuid)
  - template_id (fk -> vertical_templates)
  - customer_name, customer_email, product_name, transaction_id, amount, purchase_date
```

### 2. Novo componente: `VerticalFunnelManager`

**Ficheiro:** `src/components/funnels/VerticalFunnelManager.tsx`

Componente principal com 6 tabs:

- **Conteudo** -- Integra o `VerticalTemplateBuilder` existente (o editor AIDA completo)
- **Stats** -- Reutiliza dados do `vertical_landing_events` que ja existem, mostrando Page Views, Submissions, Conversion Rate por seccao da landing page
- **Sales** -- Tabela de vendas associadas ao template, com filtro de datas e export
- **Events** -- Gestao de pixels Meta (Pixel ID, Access Token, Tracking Level, Events Being Tracked) -- mesmo layout do `FunnelEventsTab`
- **Settings** -- Configuracoes avancadas (Name, Domain, Path, Favicon URL, Head/Body tracking code, Chat widget, Payment mode, Image optimization, GDPR fonts) -- mesmo layout do screenshot

### 3. Hook: `useVerticalFunnelManager`

**Ficheiro:** `src/hooks/useVerticalFunnelManager.ts`

- `useVerticalTemplateSettings(templateId)` -- CRUD para settings
- `useVerticalTrackingEvents(templateId)` -- CRUD para pixels
- `useVerticalTemplateSales(templateId, dateFrom, dateTo)` -- query de vendas
- `useVerticalTemplateStats(templateId, dateFrom, dateTo)` -- query de analytics do `vertical_landing_events`

### 4. Actualizar `FunnelsList.tsx`

Quando o utilizador clica "Editar" num template AIDA:
- Em vez de abrir directamente o `VerticalTemplateBuilder`, abre o novo `VerticalFunnelManager`
- Adicionar estado `managingTemplateId` para controlar qual template esta a ser gerido
- O `VerticalFunnelManager` tem um botao "Voltar" que regressa a lista

### 5. Tabs do VerticalFunnelManager (detalhe)

**Tab Stats:**
- Filtro de datas (date range picker)
- Tabela com metricas por seccao: Page Views (All, Uniques), Submissions, Rate
- Dados vindos da tabela `vertical_landing_events`

**Tab Sales:**
- Filtro de datas
- Tabela: Customer, Email, Product, Transaction ID, Amount, Purchase Date
- Botao de export CSV

**Tab Events:**
- Tabela de pixels configurados (Pixel ID, Access Token, Tracking Level, Events Being Tracked)
- Botao "+ Add Event" com dialog para adicionar pixel
- Mesmo layout exacto do screenshot de referencia

**Tab Settings:**
- Layout em grid de 2 colunas conforme screenshot:
  - Name, Domain, Path, Favicon URL
  - Head tracking code, Body tracking code
  - Chat widget (select)
  - Payment mode (switch), Require credit card (switch)
  - Image Optimization (switch), Optimize Javascript (switch)
  - GDPR Compliant Fonts (switch)
- Botao "Guardar"

**Tab Conteudo:**
- Renderiza o `VerticalTemplateBuilder` existente inline (sem o header/back button proprio, pois o manager ja tem)

### 6. Geracao AI Automatica

O sistema de geracao por IA que ja existe no `VerticalTemplateBuilder` (botao "Gerar com IA") continua a funcionar. Adicionalmente, na tab Settings, os campos de tracking e SEO podem ser pre-populados automaticamente com base no tipo de vertical.

## Resultado Final

Cada template vertical AIDA tera exactamente a mesma experiencia de gestao que os funis multi-step, com:
- Gestao de conteudo AIDA (editor existente)
- Analytics detalhados (Stats)
- Registo de vendas (Sales)
- Integracao com Meta Pixel (Events)
- Configuracoes avancadas de dominio, tracking e optimizacao (Settings)
