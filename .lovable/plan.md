

# Plan: FastCRM — Biblioteca de Templates Partilhados & Sequências de Email

This is a large product initiative split into two phases. Phase 1 enhances the existing template system with collaboration features. Phase 2 introduces the email sequences module.

---

## Current State

**What already exists:**
- `communication_templates` table with full CRUD, usage tracking, performance analytics
- Template library with 24+ pre-built templates (static data in `templateLibraryData.ts`)
- Template creation/editing dialog with variables, dynamic conditions, structure types
- Send email from template dialog
- Performance tab with multi-armed bandit learning
- Template preview panel (Attio-style)

**What's missing:**
- No tags on templates (DB column doesn't exist)
- No favorites system
- No author name display (only `created_by` UUID stored)
- No sequences/automation steps module
- No rich text editor (currently plain textarea)

---

## Phase 1: Enhanced Shared Template Library

### 1.1 Database Migrations

**Add tags column to `communication_templates`:**
```sql
ALTER TABLE public.communication_templates 
ADD COLUMN tags text[] DEFAULT '{}';
```

**Create `template_favorites` table:**
```sql
CREATE TABLE public.template_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.communication_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (template_id, user_id)
);

ALTER TABLE public.template_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorites"
ON public.template_favorites FOR ALL TO authenticated
USING (
  user_id = auth.uid() 
  AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
)
WITH CHECK (
  user_id = auth.uid()
  AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
```

**Create `email_sequences` table:**
```sql
CREATE TABLE public.email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT false,
  exit_conditions jsonb DEFAULT '[]',
  tags text[] DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.email_sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  template_id uuid REFERENCES public.communication_templates(id) ON DELETE SET NULL,
  subject text,
  body text,
  delay_days integer DEFAULT 1,
  delay_hours integer DEFAULT 0,
  channel text DEFAULT 'email',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (sequence_id, step_order)
);

CREATE TABLE public.email_sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sequence_id uuid NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL,
  current_step integer DEFAULT 1,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'exited')),
  exit_reason text,
  enrolled_by uuid NOT NULL REFERENCES auth.users(id),
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  next_send_at timestamptz,
  updated_at timestamptz DEFAULT now()
);
```

With appropriate RLS policies for workspace-scoped access on all three tables.

### 1.2 Template Enhancements — UI Changes

**Tags system** — `TemplateFormDialog.tsx`:
- Add multi-tag input field (comma-separated or chip input)
- Store as `text[]` in DB

**Tags display** — `TemplatesListPage.tsx`:
- Show tag badges on template cards
- Add "Tags" filter group in `FilterSidebar`
- Global search already searches name + body; extend to tags

**Author filter** — `TemplatesListPage.tsx`:
- Join `profiles` table to get author name
- Add "Autor" filter group in sidebar
- Display author name on cards

**Favorites** — New hook `useTemplateFavorites.ts`:
- `useTemplateFavorites()` — fetch user's favorites
- `useToggleFavorite()` — add/remove
- Star icon on template cards
- "Favoritos" filter in sidebar

**Updated hook** — `useCommunicationTemplates.ts`:
- Add `tags` field to mapping
- Support `tags` in create/update mutations

### 1.3 Files Changed (Phase 1)

| File | Change |
|------|--------|
| DB Migration | Add `tags` column, create `template_favorites`, `email_sequences`, `email_sequence_steps`, `email_sequence_enrollments` tables |
| `src/hooks/useCommunicationTemplates.ts` | Add `tags` to mapping and mutations |
| `src/hooks/useTemplateFavorites.ts` | NEW — CRUD for favorites |
| `src/types/communicationTemplate.ts` | Add `tags: string[]` to `CommunicationTemplate` |
| `src/components/communication/TemplateFormDialog.tsx` | Add tags input field |
| `src/components/communication/TemplatesListPage.tsx` | Add tags display, author name, favorites star, new filter groups |

---

## Phase 2: Email Sequences Module

### 2.1 New Pages & Components

**Route:** `/dashboard/sequences`

**Page:** `src/pages/Sequences.tsx`
- List of sequences with name, step count, active enrollments, status
- Create/edit sequence dialog

**Components:**
```text
src/components/sequences/
├── SequencesListPage.tsx      — Main list with filters
├── SequenceFormDialog.tsx     — Create/edit sequence metadata
├── SequenceStepsEditor.tsx    — Vertical list of steps with add/reorder
├── SequenceStepCard.tsx       — Individual step: template picker + delay config
├── SequenceEnrollDialog.tsx   — Enroll contacts into sequence
└── SequenceDetailPage.tsx     — View sequence with enrollments
```

### 2.2 Sequence Steps Editor

Simple vertical list (not drag-and-drop in V1):
```text
┌─────────────────────────────────────────┐
│ Step 1 — Email                          │
│ Template: [Cold Outreach ▼]             │
│ ou Escrever novo                        │
│ Delay: [Imediato]                       │
├─────────────────────────────────────────┤
│       ↓  esperar 2 dias                 │
├─────────────────────────────────────────┤
│ Step 2 — Email                          │
│ Template: [Follow-Up ▼]                 │
│ Delay: [2 dias ▼]                       │
├─────────────────────────────────────────┤
│       ↓  esperar 3 dias                 │
├─────────────────────────────────────────┤
│ Step 3 — Email                          │
│ Template: [Proposta ▼]                  │
│ Delay: [3 dias ▼]                       │
├─────────────────────────────────────────┤
│ [+ Adicionar Etapa]                     │
└─────────────────────────────────────────┘

Exit conditions:
☑ Parar se responder
☑ Parar se reunião marcada
☐ Parar se deal criado
```

### 2.3 Hooks

| Hook | Purpose |
|------|---------|
| `useEmailSequences.ts` | CRUD for sequences |
| `useSequenceSteps.ts` | CRUD for steps within a sequence |
| `useSequenceEnrollments.ts` | Manage enrollments, status updates |

### 2.4 Integration Points

- **Contact Detail Page**: "Adicionar a Sequência" button
- **Templates List**: Usage indicator showing "Usado em X sequências"
- **Sequences tab** in `TemplatesListPage.tsx` (new tab alongside Biblioteca, Performance, Treino)

### 2.5 Files Changed (Phase 2)

| File | Change |
|------|--------|
| `src/pages/Sequences.tsx` | NEW — Page wrapper |
| `src/components/sequences/*` | NEW — 6 components |
| `src/hooks/useEmailSequences.ts` | NEW — Sequences CRUD |
| `src/hooks/useSequenceSteps.ts` | NEW — Steps CRUD |
| `src/hooks/useSequenceEnrollments.ts` | NEW — Enrollments management |
| `src/App.tsx` | Add route `/dashboard/sequences` |
| `src/components/communication/TemplatesListPage.tsx` | Add "Sequências" tab |

---

## Implementation Order

1. **Database migrations** — All tables at once (templates tags + favorites + sequences)
2. **Phase 1 UI** — Tags, favorites, author filter on existing templates page
3. **Phase 2 hooks** — Sequences CRUD hooks
4. **Phase 2 UI** — Sequences list page + step editor + enrollment

## Technical Notes

- Tags use `text[]` PostgreSQL array (same pattern as `companies.tags`)
- Favorites use a junction table with unique constraint (no duplicates)
- Sequence steps reference templates optionally — users can write inline content
- Exit conditions stored as JSONB array: `[{"type": "reply"}, {"type": "meeting_booked"}]`
- No rich text editor in V1 — keep existing textarea with variable insertion
- RLS on all new tables scoped to workspace membership
- Sequences are manual enrollment only in V1 (no automatic triggers)

