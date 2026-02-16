
# Analytics e Metricas de Conversao para Templates Verticais AIDA

## Objetivo

Criar um sistema completo de analytics para as landing pages verticais AIDA, permitindo medir page views, submissoes de formulario e taxa de conversao por template -- tudo visivel nos cards da pagina de Landing Pages.

## O que vai mudar

### 1. Nova tabela: `vertical_landing_events`

Tabela para registar eventos anonimos nas landing pages verticais (views e submissoes):

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid (PK) | Identificador |
| template_slug | text | Slug da vertical (ex: "clinicas") |
| template_id | uuid (nullable) | ID do template custom (null para estaticos) |
| workspace_id | uuid (nullable) | Workspace associado |
| event_type | text | "view" ou "form_submit" |
| session_id | text | ID de sessao anonimo (browser) |
| referrer | text | Origem do trafego |
| device_type | text | "mobile" ou "desktop" |
| created_at | timestamptz | Timestamp do evento |

RLS: INSERT publico (qualquer visitante pode registar), SELECT apenas para membros do workspace autenticados. Sem dados pessoais (PII-free).

### 2. Componente tracker: `VerticalLandingTracker.tsx`

Componente invisivel colocado no `VerticalLandingTemplate` que:
- Regista um evento "view" por sessao/slug (debounce via sessionStorage, seguindo o padrao do `StoreProductViewTracker`)
- Gera um session_id anonimo (localStorage)
- Captura device_type e referrer

### 3. Tracking de submissao no formulario

Actualizar `VerticalCTAForm.tsx` para registar um evento "form_submit" apos submissao bem sucedida (sem guardar PII -- apenas slug, session_id e device_type).

### 4. Hook: `useVerticalLandingAnalytics.ts`

Hook React Query que agrega os dados para exibicao:
- `useVerticalLandingKPIs(slug)` -- retorna views, submissoes e taxa de conversao para um slug
- `useAllVerticalKPIs()` -- retorna KPIs agregados para todos os templates (para os cards)

### 5. Metricas nos cards da Landing Pages List

Actualizar `LandingPagesList.tsx` para mostrar em cada card de template vertical:
- Numero de views (icone de olho)
- Numero de submissoes (icone de formulario)
- Taxa de conversao em percentagem (submissoes/views)

Exemplo visual num card:
```text
+----------------------------+
|  Clinicas         [AIDA]   |
|  /clinicas                 |
|  "Perde 40% dos pacien..." |
|                            |
|  👁 342   📋 28   📈 8.2%  |
|  [Publicado] · 6 modulos   |
|  [Abrir]                   |
+----------------------------+
```

## Plano Tecnico Detalhado

### Ficheiros a criar
- Migracao SQL para `vertical_landing_events`
- `src/components/vertical-landing/VerticalLandingTracker.tsx`
- `src/hooks/useVerticalLandingAnalytics.ts`

### Ficheiros a editar
- `src/components/vertical-landing/VerticalLandingTemplate.tsx` -- adicionar `VerticalLandingTracker`
- `src/components/vertical-landing/VerticalCTAForm.tsx` -- registar evento "form_submit"
- `src/components/landing-pages/LandingPagesList.tsx` -- mostrar KPIs nos cards

### Sequencia de implementacao
1. Criar tabela `vertical_landing_events` com RLS
2. Criar `VerticalLandingTracker` (seguindo padrao do `StoreProductViewTracker`)
3. Integrar tracker no `VerticalLandingTemplate`
4. Adicionar tracking de submissao no `VerticalCTAForm`
5. Criar hook `useVerticalLandingAnalytics`
6. Mostrar metricas nos cards da `LandingPagesList`
