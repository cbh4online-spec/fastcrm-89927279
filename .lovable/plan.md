

# Plano: Motor de Mapeamento Figma MCP → Blocos Nativos do Builder

## Diagnóstico

O builder actual é **flat** — uma landing page é um registo único com campos `headline`, `subheadline`, `features[]`, `testimonials[]`, `form_enabled`. Não existe tabela `landing_page_sections` nem modelo de blocos. O `generate_page` no edge function achata todas as secções importadas nestes campos flat, perdendo estrutura.

Para cumprir o pedido, é necessário:
1. Criar tabela `landing_page_sections` para blocos ordenados
2. Criar motor de mapeamento secção→bloco no edge function
3. Actualizar o builder para renderizar/editar blocos por secção

## Decisões de Produto

- Cada secção Figma gera um **bloco nativo** na tabela `landing_page_sections`
- Os campos flat existentes (`headline`, `features`, etc.) continuam a funcionar para páginas criadas manualmente — backward compatible
- O builder detecta se a página tem blocos na tabela `landing_page_sections` e mostra o editor por secções, caso contrário mostra o editor flat actual
- Blocos marcados com `auto_generated = true` e metadata de origem MCP

## Arquitectura

```text
Figma MCP Import (normalized sections)
    ↓
mapNormalizedSectionToBlock() — por secção
    ↓
landing_page_sections (tabela nova)
    ↓
Builder carrega secções → edição por bloco
```

## Ficheiros a Criar/Alterar

| Ficheiro | Acção |
|---|---|
| Migration SQL | CRIAR — tabela `landing_page_sections` + RLS |
| `supabase/functions/marketing-mcp/index.ts` | EDITAR — reescrever `generate_page` com motor de mapeamento |
| `src/lib/figmaSectionMapper.ts` | CRIAR — lógica de mapeamento partilhável (tipos + helpers) |
| `src/hooks/useLandingPageSections.ts` | CRIAR — CRUD de secções por página |
| `src/components/landing-pages/SectionBlockEditor.tsx` | CRIAR — editor por tipo de bloco |
| `src/components/landing-pages/LandingPageBuilder.tsx` | EDITAR — integrar editor de secções |
| `src/components/landing-pages/LandingPagePreview.tsx` | EDITAR — renderizar secções |

## Detalhes Técnicos

### 1. Migration — `landing_page_sections`

```sql
CREATE TABLE public.landing_page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL, -- hero, cta, faq, pricing, testimonials, features_grid, lead_form, logo_strip, split_content, rich_text, cta_banner
  section_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  content JSONB NOT NULL DEFAULT '{}',
  -- content schema varies by block_type (headline, items[], etc.)
  auto_generated BOOLEAN DEFAULT false,
  source_import_id UUID,
  source_section_type TEXT,
  mapping_confidence TEXT, -- high, medium, low
  mapping_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.landing_page_sections ENABLE ROW LEVEL SECURITY;
-- RLS: workspace_id scoped via workspace_members
```

### 2. Motor de Mapeamento (edge function `generate_page`)

Substitui a lógica flat actual por mapeamento secção-a-secção:

**Regras de mapeamento:**

| section_type | block_type | content fields |
|---|---|---|
| hero | hero | headline, subheadline, primary_cta, secondary_cta, media |
| benefits | features_grid | title, intro, items[{title, description, icon}] |
| cta | cta_banner | headline, supporting_text, button_label, button_link |
| social_proof | testimonials | title, items[{name, role, quote, avatar}] |
| faq | faq_accordion | title, items[{question, answer}] |
| pricing | pricing_cards | title, plans[{name, price, features[], cta}] |
| form | lead_form | title, description, form_fields[], cta |
| content | rich_text | title, body |
| webinar | split_content | headline, body, media, cta |
| upsell | cta_banner | headline, supporting_text, button_label |
| thank_you | rich_text | title, body |
| navigation | — (skip) | — |
| footer | — (skip) | — |
| (unknown) | rich_text (fallback) | title, body, mapping_confidence: low |

Cada secção normalizada é mapeada para um INSERT em `landing_page_sections` com:
- `block_type` nativo
- `content` JSON com campos do bloco preenchidos a partir de `content_placeholders`, `cta_slots`, `media_slots`, `form_slots`
- `source_section_type`, `source_import_id`, `mapping_confidence`, `auto_generated = true`

Os campos flat da `landing_pages` (headline, features) continuam a ser preenchidos para backward compat com o preview existente.

### 3. `src/lib/figmaSectionMapper.ts`

Tipos TypeScript para os blocos:
- `BuilderBlockType` enum
- `BuilderBlock` interface (block_type, content, sort_order, metadata)
- `SECTION_TO_BLOCK_MAP` constante
- `mapNormalizedSectionToBlock()` — mapeia uma secção
- `mapAllSectionsToBlocks()` — mapeia array completo
- Usado no frontend para type-safety e no preview

### 4. `src/hooks/useLandingPageSections.ts`

- `useLandingPageSections(pageId)` — react-query SELECT ordenado por sort_order
- `useUpdateSection()` — mutation UPDATE content
- `useReorderSections()` — mutation UPDATE sort_order
- `useDeleteSection()` — mutation DELETE

### 5. `SectionBlockEditor.tsx`

Componente que recebe `block_type` e `content` e renderiza o editor correcto:
- **hero**: inputs headline, subheadline, CTA text, media URL
- **features_grid**: lista editável de items (title + description)
- **cta_banner**: headline, texto, botão
- **testimonials**: lista editável (name, role, quote)
- **faq_accordion**: lista editável (question, answer)
- **pricing_cards**: lista editável (name, price, features[], CTA)
- **lead_form**: título, descrição, campos
- **rich_text**: título + textarea body
- **split_content**: headline, body, media, CTA
- **logo_strip**: título + lista logos

Badge "Auto-gerado via Figma MCP" visível quando `auto_generated = true`.

### 6. `LandingPageBuilder.tsx` — alterações

- Carrega secções via `useLandingPageSections(pageId)`
- Se existem secções → mostra tab "Secções" com lista de `SectionBlockEditor` por ordem
- Se não existem → mostra editor flat actual (backward compat)
- Botão "Guardar" persiste alterações em cada secção

### 7. `LandingPagePreview.tsx` — alterações

- Aceita prop opcional `sections` além do `data` flat
- Se secções existem, renderiza por bloco em vez do layout flat

### 8. Observabilidade (edge function)

Logs estruturados para cada secção mapeada:
- `figma_section_mapping_started` / `succeeded` / `failed`
- `figma_section_fallback_mapping_used` (quando confidence < high)
- `landing_page_native_block_generation_started` / `succeeded` / `failed`
- Campos: workspace_id, import_id, page_id, source_section_type, native_block_type, mapping_confidence

## Critérios de Aceitação

1. Tabela `landing_page_sections` criada com RLS por workspace_id
2. `generate_page` cria blocos nativos na tabela por secção importada
3. Hero, CTA, FAQ, pricing, testimonials, form, benefits mapeiam para blocos específicos
4. Secções desconhecidas usam fallback `rich_text` com confidence `low`
5. Ordem das secções preservada
6. Página gerada abre no builder com secções editáveis
7. Cada bloco é editável individualmente
8. Badge "auto-gerado" visível em blocos MCP
9. Páginas antigas sem secções continuam a funcionar no editor flat
10. Logs estruturados em todas as operações de mapeamento

