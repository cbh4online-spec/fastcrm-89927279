

# Context OS v2 — Fase 1: Schema + Dashboard + Blocos Editáveis

## Visão geral

Evoluir o Context OS de um wizard flat (`business_context` single-row) para um sistema modular com 8 blocos independentes, cada um com campos estruturados, score de preenchimento, e status draft/approved. O Command Center ganha um separador "Context OS".

Esta é a **Fase 1** de 3:
- **Fase 1** (esta): Schema normalizado, dashboard com 8 cards + Context Score, edição de campos por bloco
- **Fase 2**: Versões com diff, comentários, anexos (upload + URL)
- **Fase 3**: IA Assist, Context-to-Actions, citações de fonte, integração Daily Brief

---

## 1. Database Migration

### Novas tabelas

```sql
-- Enum for block types
CREATE TYPE public.context_block_type AS ENUM (
  'strategy', 'business_model', 'offers', 'team',
  'goals', 'financials', 'priorities', 'processes'
);

CREATE TYPE public.context_block_status AS ENUM ('draft', 'approved');

-- Main blocks table
CREATE TABLE public.context_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  block_type context_block_type NOT NULL,
  title TEXT NOT NULL,
  rich_text TEXT, -- rich text / markdown summary
  status context_block_status DEFAULT 'draft',
  score INTEGER DEFAULT 0, -- 0-100
  tags TEXT[] DEFAULT '{}',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, block_type)
);

-- Structured fields per block
CREATE TABLE public.context_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES public.context_blocks(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text', -- text, number, currency, date, list, json
  field_value JSONB, -- stores any type as JSON
  display_order INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(block_id, field_key)
);
```

RLS policies: workspace members can SELECT, admins/owners can INSERT/UPDATE/DELETE. Same pattern as `business_context`.

### Seed default blocks

On first visit, if no blocks exist for workspace, auto-create the 8 blocks with predefined field templates (e.g., Strategy gets fields like `vision`, `mission`, `competitive_advantage`; Goals gets `monthly_target`, `quarterly_target`, etc.).

### Migration from `business_context`

Keep `business_context` table for backward compatibility. The new system reads from `context_blocks`/`context_fields`. A one-time migration function maps existing `business_context` data into the new blocks.

---

## 2. New Hook: `useContextBlocks`

**File**: `src/hooks/useContextBlocks.ts`

- `useContextBlocks()` — fetches all 8 blocks + their fields for current workspace
- `useContextBlock(blockType)` — fetches single block with fields
- `useUpsertContextField()` — upserts a field value
- `useUpdateBlockStatus()` — toggles draft/approved
- `useUpdateBlockRichText()` — saves rich text summary
- `useContextScore()` — computes per-block and overall score (% of non-empty fields)
- Auto-seed: if query returns 0 blocks, trigger seed mutation

---

## 3. Command Center — Tab "Context OS"

**File**: `src/pages/CommandCenterPage.tsx` — Add `Tabs` with "Command" and "Context OS"

The Command Center becomes tabbed:
- Tab 1: "Comando" — existing Command Center UI (input, output, quick commands, recents)
- Tab 2: "Context OS" — new Context OS dashboard

---

## 4. Context OS Dashboard Component

**File**: `src/components/context-os/ContextOSDashboard.tsx`

Layout:
- **Header**: "Context OS" badge + overall Context Score (circular progress, gold)
- **Alert strip**: "Top 5 missing items" — fields with empty values across all blocks
- **8 Cards grid** (2 cols desktop, 1 col mobile): Each card shows:
  - Icon + title (e.g., 🎯 Strategy)
  - Score bar (gold progress)
  - Status badge (Draft / Approved)
  - Tags
  - "Editar" button → opens block detail

Dark + gold premium styling: `bg-zinc-900/50 border-amber-500/20`, gold accents.

---

## 5. Block Detail Component

**File**: `src/components/context-os/ContextBlockDetail.tsx`

Opens as a full-width panel or dialog. Tabs (Fase 1 only has "Resumo" and "Campos"):
- **Resumo**: Rich text editor (textarea with markdown preview for now)
- **Campos**: Dynamic key-value form generated from `context_fields`. Each field renders appropriate input based on `field_type`:
  - `text` → Input/Textarea
  - `number`/`currency` → Number input with € prefix
  - `date` → Date picker
  - `list` → TagInput (reuse existing)
  - `json` → JSON textarea

Actions bar:
- "Guardar" (saves fields)
- Status toggle: "Marcar como Aprovado" / "Reverter para Rascunho" (admin only)
- Tags editor

---

## 6. Block Field Templates

Each block type has predefined field definitions:

| Block | Fields |
|-------|--------|
| Strategy | vision, mission, competitive_advantage, market_position, key_differentiators (list) |
| Business Model | model_type, description, revenue_streams (list), cost_structure |
| Offers | products (json array), pricing_model, average_ticket (currency), upsell_strategy |
| Team | team_size (number), roles (list), strategies (list), hiring_plan |
| Goals | monthly_target (currency), quarterly_target (currency), annual_target (currency), deals_monthly (number), conversion_rate (number) |
| Financials | mrr (currency), arr (currency), cac (currency), ltv (currency), churn_rate (number), margin (number) |
| Priorities | current_quarter (list), next_quarter (list), blockers (list), initiatives (json) |
| Processes | sales_steps (list), sales_cycle_days (number), follow_up_sla (number), objections (list), scripts (json) |

---

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | Create `context_blocks`, `context_fields` + RLS + seed function |
| `src/hooks/useContextBlocks.ts` | Create — CRUD hooks + score computation |
| `src/components/context-os/ContextOSDashboard.tsx` | Create — 8-card dashboard with scores |
| `src/components/context-os/ContextBlockDetail.tsx` | Create — block editor with tabs |
| `src/components/context-os/ContextFieldEditor.tsx` | Create — dynamic field renderer |
| `src/components/context-os/ContextScoreRing.tsx` | Create — circular score indicator |
| `src/pages/CommandCenterPage.tsx` | Update — add Tabs wrapper with Context OS tab |

