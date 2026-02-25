

# Plan: Seed Category Pages (Phase 2 - Task t2-2)

## Context

The category pages (`/categories` list + `/categories/:slug` detail) are fully built with hero sections, keyword grids, generator widgets, benefits lists, FAQs, and sidebar CTAs. However, `seo_entities` has **zero category records**, so both pages render empty. The footer already links to 6 categories: CRM, Vendas, Marketing, Automação, Leads, Analytics.

## Categories to Create

| # | Slug | Title |
|---|------|-------|
| 1 | `crm` | CRM |
| 2 | `vendas` | Vendas |
| 3 | `marketing-digital` | Marketing Digital |
| 4 | `automacao` | Automação |
| 5 | `leads` | Gestão de Leads |
| 6 | `analytics` | Analytics e Métricas |
| 7 | `ecommerce` | E-commerce |
| 8 | `seo` | SEO |
| 9 | `email-marketing` | Email Marketing |
| 10 | `redes-sociais` | Redes Sociais |

Each category will include:
- Title, h1, meta_description, tldr
- 2-3 content sections (overview, use cases, tips)
- 3-4 FAQs
- CTA pointing to `/tools/keyword-ideas`
- Status: `published`, language: `pt`, intent: `commercial`

## Implementation Steps

### 1. Database Migration — INSERT

Single SQL migration inserting 10 category records into `seo_entities` with `workspace_id = NULL`, `entity_type = 'category'`, and rich JSONB content.

### 2. Update Footer Links — EDIT `SEOFooter.tsx`

Update the footer category links to match the actual seeded slugs (e.g., `marketing-digital` instead of `marketing`).

### 3. Update Roadmap — EDIT `seoRoadmap.ts`

Mark task `t2-2` as `done`.

## Technical Notes

- The `CategoryDetailPage` uses `useRelatedEntities('keyword', slug, 8)` to show related keywords — these will populate as keyword entities sharing the slug/category are added
- The `EntityGrid` component in the list page renders cards with title and description automatically
- Categories use `workspace_id = NULL` for public RLS access

