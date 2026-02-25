

# Plan: Seed Core CRM Templates (Phase 1 - Task t1-7)

## Context

The template pages (list + detail) are fully implemented in code, but the `seo_entities` table has **zero template records**. The pages render empty because there's no published content with `entity_type = 'template'`.

## Approach

Create a database migration that inserts **10 core CRM templates** as published `seo_entities` records. These are the essential templates for a CRM keyword tool — covering the most common use cases users search for.

## Template Content Plan

| # | Slug | Title | Intent |
|---|------|-------|--------|
| 1 | `ecommerce-keywords` | Keywords para E-commerce | commercial |
| 2 | `saas-keywords` | Keywords para SaaS | commercial |
| 3 | `local-business-keywords` | Keywords para Negócios Locais | commercial |
| 4 | `blog-content-keywords` | Keywords para Blog e Conteúdo | informational |
| 5 | `b2b-sales-keywords` | Keywords para Vendas B2B | transactional |
| 6 | `real-estate-keywords` | Keywords para Imobiliário | commercial |
| 7 | `health-wellness-keywords` | Keywords para Saúde e Bem-Estar | informational |
| 8 | `restaurant-food-keywords` | Keywords para Restaurantes | commercial |
| 9 | `education-courses-keywords` | Keywords para Educação e Cursos | informational |
| 10 | `freelancer-agency-keywords` | Keywords para Freelancers e Agências | commercial |

Each template will include:
- Title, meta_description, h1, tldr
- 2-3 content sections (what it does, best practices, when to use)
- 3-4 FAQs
- 2-3 examples/use cases
- A CTA pointing to `/tools/keyword-ideas`
- `toolConfig` with a relevant placeholder seed keyword
- Schema markup (JSON-LD SoftwareApplication)
- Status: `published`, language: `pt`

## Implementation

### 1. Database Migration — NEW

Single SQL migration inserting 10 template records into `seo_entities`. No schema changes needed — the table already exists with the correct structure. Each record uses `workspace_id = NULL` (public/global templates), `status = 'published'`, and `priority = 0.8`.

### 2. Update Roadmap Config — EDIT `src/modules/growth-seo/config/seoRoadmap.ts`

Change task `t1-7` status from `'todo'` to `'done'`.

## No New Dependencies or Files

All changes use existing infrastructure. The template detail page already handles rendering content sections, FAQs, examples, tool widget, and CTAs dynamically from the database record.

## Technical Notes

- Templates are inserted with `workspace_id = NULL` so they're accessible via the public RLS policy (`status = 'published'`)
- The `content` column is JSONB and follows the `SEOContent` interface structure
- The `toolConfig.placeholder` field pre-fills the keyword generator widget on each template page
- View counts start at 0 and increment automatically when pages are visited

