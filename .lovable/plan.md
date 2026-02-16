
# Bio OS -- FastCRM (Multi-Tenant, Premium Edition)

## Resumo

Criar um modulo completo de paginas Bio e micro-sites dentro do FastCRM, registado no Marketplace como modulo instalavel. O sistema permite criar paginas tipo "link in bio" com blocos drag-and-drop, tracking automatico, QR codes, checkout integrado e IA estrategica -- tudo multi-tenant por workspace.

## Estrutura de URL Publica

```text
/b/:workspaceSlug/:pageSlug          -> pagina publica
/b/:workspaceSlug/:pageSlug/preview  -> preview com token
```

Segue o mesmo padrao de `/store/:workspaceSlug` e `/c2c/:workspaceSlug` ja existentes no App.tsx.

## Arquitectura

```text
Workspace
  -> Bio OS (modulo Marketplace)
       -> Pages (bio_pages)
            -> Blocks (bio_blocks)
       -> Analytics (bio_events + bio_analytics_daily)
       -> QR Codes (bio_qr_codes)
```

---

## Fase 1: Base de Dados (Migracao SQL)

### 1.1 Tabela `bio_pages`

| Coluna | Tipo | Nota |
|--------|------|------|
| id | uuid PK | gen_random_uuid() |
| workspace_id | uuid NOT NULL | FK workspaces |
| slug | text NOT NULL | |
| name | text NOT NULL | |
| status | text | default 'draft' (draft/live) |
| seo_title | text | nullable |
| seo_description | text | nullable |
| og_image | text | nullable |
| primary_color | text | default '#6366f1' |
| background_style | jsonb | nullable |
| custom_css | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

UNIQUE(workspace_id, slug). RLS: workspace members.

### 1.2 Tabela `bio_blocks`

| Coluna | Tipo | Nota |
|--------|------|------|
| id | uuid PK | |
| bio_page_id | uuid NOT NULL | FK bio_pages ON DELETE CASCADE |
| workspace_id | uuid NOT NULL | |
| block_type | text NOT NULL | link, button, text, image, video, form, product, social, divider, embed, whatsapp, calendar, countdown, faq, testimonials, carousel |
| content | jsonb | default '{}' |
| order_index | integer | default 0 |
| is_visible | boolean | default true |
| rules | jsonb | nullable (smart rules: horario, device, utm) |
| created_at | timestamptz | |

RLS: workspace members.

### 1.3 Tabela `bio_events`

| Coluna | Tipo | Nota |
|--------|------|------|
| id | uuid PK | |
| workspace_id | uuid | nullable (tracking anonimo) |
| bio_page_id | uuid NOT NULL | FK bio_pages |
| block_id | uuid | nullable (click em bloco especifico) |
| event_type | text NOT NULL | page_view, click, lead, schedule, purchase |
| source | text | nullable |
| device | text | nullable |
| referrer | text | nullable |
| utm_json | jsonb | nullable |
| visitor_id | text | nullable |
| revenue | numeric | default 0 |
| created_at | timestamptz | |

RLS: SELECT para workspace members. INSERT sem restricao (tracking publico).

### 1.4 Tabela `bio_analytics_daily`

| Coluna | Tipo | Nota |
|--------|------|------|
| id | uuid PK | |
| bio_page_id | uuid NOT NULL | FK bio_pages |
| date | date NOT NULL | |
| views | integer | default 0 |
| uniques | integer | default 0 |
| clicks | integer | default 0 |
| leads | integer | default 0 |
| purchases | integer | default 0 |
| revenue | numeric | default 0 |
| top_links | jsonb | nullable |
| top_sources | jsonb | nullable |

UNIQUE(bio_page_id, date). RLS: workspace members via bio_pages join.

### 1.5 Tabela `bio_qr_codes`

| Coluna | Tipo | Nota |
|--------|------|------|
| id | uuid PK | |
| bio_page_id | uuid NOT NULL | FK bio_pages |
| workspace_id | uuid NOT NULL | |
| name | text | |
| short_code | text NOT NULL UNIQUE | |
| scans | integer | default 0 |
| uniques | integer | default 0 |
| created_at | timestamptz | |

RLS: workspace members.

### 1.6 Registar modulo no Marketplace

INSERT em `marketplace_modules` com slug `bio-os`.

---

## Fase 2: Hooks de Dados

### 2.1 `src/hooks/useBioPages.ts` (NOVO)

- `useBioPages()` -- lista paginas do workspace
- `useBioPage(id)` -- pagina individual
- `useCreateBioPage()` -- cria pagina
- `useUpdateBioPage()` -- actualiza
- `useDeleteBioPage()` -- elimina
- `usePublishBioPage()` -- muda status para 'live'

### 2.2 `src/hooks/useBioBlocks.ts` (NOVO)

- `useBioBlocks(pageId)` -- lista blocos ordenados
- `useCreateBioBlock()` -- cria bloco
- `useUpdateBioBlock()` -- actualiza conteudo/visibilidade/regras
- `useDeleteBioBlock()` -- elimina
- `useReorderBioBlocks()` -- reordena (batch update de order_index)

### 2.3 `src/hooks/useBioAnalytics.ts` (NOVO)

- `useBioPageStats(pageId, dateRange)` -- stats agregados
- `useBioPageEvents(pageId, filters)` -- eventos brutos
- `useBioAllPagesOverview()` -- resumo de todas as paginas

### 2.4 `src/hooks/useBioQRCodes.ts` (NOVO)

- `useBioQRCodes(pageId)` -- lista QR codes
- `useCreateBioQR()` -- gera QR com short_code unico
- `useDeleteBioQR()` -- elimina

---

## Fase 3: Interface -- Gestao (Dashboard)

### 3.1 Pagina principal `src/pages/BioOS.tsx`

Menu lateral: "Bio OS" (com moduleSlug: 'bio-os')

Seccoes:
- Header com titulo + botao "Nova Pagina"
- Grid de cards (nome, slug, status, metricas resumidas, acoes)
- Cada card mostra: views, clicks, leads, CTR

### 3.2 Bio Page Builder `src/components/bio/BioPageBuilder.tsx`

Tabs superiores (padrao FunnelBuilder):
- **Blocks** -- editor principal
- **Stats** -- analytics da pagina
- **QR Codes** -- gestao de QR
- **Settings** -- SEO, cores, CSS, dominio
- **AI Insights** -- sugestoes de optimizacao

### 3.3 Block Editor `src/components/bio/BioBlockEditor.tsx`

Layout:
- Sidebar esquerda: biblioteca de blocos (drag-and-drop)
- Centro: preview mobile-first da pagina (lista de blocos)
- Painel direito: editor de propriedades do bloco selecionado

Cada tipo de bloco tem o seu editor de propriedades:
- **link/button**: URL, texto, icone, cor
- **text**: conteudo rich text
- **image**: upload, alt text
- **video**: URL YouTube/Vimeo
- **form**: campos, pipeline destino, tag
- **product**: seleccionar produto existente, mostrar preco
- **social**: lista de redes sociais
- **whatsapp**: numero, mensagem pre-definida
- **countdown**: data alvo
- **faq/testimonials/carousel**: items editaveis

### 3.4 Preview

Toggle entre mobile e desktop. Preview renderiza os blocos na ordem definida com o tema de cores da pagina.

---

## Fase 4: Interface -- Renderizacao Publica

### 4.1 Rota `src/App.tsx`

Adicionar antes de CRMRoutes (como `/store/*`):

```text
<Route path="/b/:workspaceSlug/:pageSlug" element={<PublicBioPage />} />
```

### 4.2 `src/pages/PublicBioPage.tsx`

- Resolve workspace via `useResolveStoreWorkspace` (reutilizar padrao existente)
- Carrega `bio_pages` por slug + workspace_id
- Carrega `bio_blocks` ordenados
- Renderiza cada bloco com o componente correcto
- Regista evento `page_view` automaticamente
- Regista `click` ao clicar em links/botoes

### 4.3 Componentes de blocos publicos `src/components/bio/blocks/`

Um componente por tipo de bloco:
- `BioLinkBlock.tsx`, `BioTextBlock.tsx`, `BioImageBlock.tsx`, `BioFormBlock.tsx`, `BioProductBlock.tsx`, etc.

Cada um le o `content` JSON e renderiza. Design mobile-first, moderno, nao Linktree.

---

## Fase 5: Tracking e Analytics

### 5.1 `src/components/bio/BioTracker.tsx`

Componente invisivel incluido na pagina publica:
- Regista `page_view` ao montar (com visitor_id, device, referrer, UTMs)
- Expoe funcao `trackClick(blockId)` para blocos clicaveis
- Usa `navigator.sendBeacon` para fiabilidade

### 5.2 Edge Function `bio-aggregate-analytics` (NOVO)

Agrega `bio_events` em `bio_analytics_daily` (pode ser chamada por cron ou on-demand).

---

## Fase 6: QR Codes

### 6.1 Componente `src/components/bio/BioQRManager.tsx`

- Gera QR via `react-qr-code` (ja instalado)
- Download como PNG
- Tabela com scans e uniques por QR
- Short code gera URL: `/b/:workspaceSlug/:pageSlug?qr=:code`

---

## Fase 7: Integracao CRM (Form Block)

Quando um formulario Bio e submetido:
- Criar/actualizar contacto na tabela `contacts`
- Aplicar tag `bio:{pageSlug}`
- Criar oportunidade no pipeline seleccionado
- Registar evento `lead` em `bio_events`

Logica implementada directamente no componente `BioFormBlock` via hooks existentes do CRM.

---

## Fase 8: Edge Functions + AI

### 8.1 `bio-ai-builder` (NOVO)

Recebe: vertical, objetivo, oferta, tom
Retorna: estrutura recomendada de blocos (tipos + copy AIDA)
Usa Lovable AI (Gemini)

### 8.2 `bio-ai-optimizer` (NOVO)

Recebe: pageId, analytics
Retorna: sugestoes de melhoria (headline, ordem, CTA)
Usa Lovable AI (Gemini)

---

## Fase 9: Marketplace

### 9.1 Registar modulo

INSERT em `marketplace_modules`:
- slug: `bio-os`
- name: `Bio OS`
- category: `marketing`

### 9.2 ModuleGuard

A pagina `/dashboard/bio` usa `ModuleGuard` com `moduleSlug="bio-os"`.

### 9.3 Sidebar

Adicionar item no menu lateral com `moduleSlug: "bio-os"`.

---

## Sequencia de Implementacao

Devido a dimensao, implementacao em 4 iteracoes:

**Iteracao 1**: SQL + hooks + pagina principal + builder basico (blocos link, text, image, button, social, divider)
**Iteracao 2**: Renderizacao publica + tracking + mais tipos de blocos (form, video, whatsapp, embed, countdown)
**Iteracao 3**: QR codes + analytics dashboard + blocos avancados (product, calendar, faq, testimonials, carousel)
**Iteracao 4**: AI Builder + AI Optimizer + integracao CRM + Marketplace registration

---

## Ficheiros a Criar/Editar

| Ficheiro | Accao |
|----------|-------|
| Migracao SQL | Criar bio_pages, bio_blocks, bio_events, bio_analytics_daily, bio_qr_codes + RLS |
| `src/hooks/useBioPages.ts` | Novo |
| `src/hooks/useBioBlocks.ts` | Novo |
| `src/hooks/useBioAnalytics.ts` | Novo |
| `src/hooks/useBioQRCodes.ts` | Novo |
| `src/pages/BioOS.tsx` | Novo |
| `src/pages/PublicBioPage.tsx` | Novo |
| `src/components/bio/BioPageBuilder.tsx` | Novo |
| `src/components/bio/BioBlockEditor.tsx` | Novo |
| `src/components/bio/BioTracker.tsx` | Novo |
| `src/components/bio/BioQRManager.tsx` | Novo |
| `src/components/bio/blocks/*.tsx` | Novos (1 por tipo de bloco) |
| `supabase/functions/bio-ai-builder/index.ts` | Novo |
| `supabase/functions/bio-ai-optimizer/index.ts` | Novo |
| `supabase/functions/bio-aggregate-analytics/index.ts` | Novo |
| `src/App.tsx` | Editar (adicionar rotas /b/) |
| `src/components/layout/Sidebar.tsx` | Editar (adicionar item Bio OS) |
| `supabase/config.toml` | Editar (novas edge functions) |

Comecamos pela Iteracao 1: base de dados, hooks e interface de gestao com builder basico.
