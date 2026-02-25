

# Plan: Configurable Layout System for Opportunity Detail Page

## Overview

Add a layout configuration system where users can:
1. **Choose which highlight cards** to show/hide in the overview tab
2. **Reorder sidebar sections** via drag-and-drop
3. **Persist preferences** per workspace in the database

The system builds on the existing `workspace_layout_config` pattern used for entity detail menus, extending it specifically for opportunity detail layouts.

## Current State

- **Highlights cards** (`OpportunityHighlightsCards.tsx`): Fixed 4-card grid (Deal Stage, Deal Owner, Associated Company, Documents) + Deal Value row. Has hover icons (GripVertical, Settings) but they are decorative/non-functional.
- **Sidebar** (`OpportunityDetailSidebar.tsx`): Fixed order of collapsible sections (Communication, Deal Info, Associations, Company Info, Lists, Intelligence). Uses `SidebarSection` component with `Collapsible`.
- **Existing config system** (`useWorkspaceLayoutConfig`): Already stores `visible_sections` and `section_order` per entity type per workspace in `workspace_layout_config` table. Only supports entity types `lead`, `contact`, `company`.

## Database Changes

### Migration: Add `opportunity` support to `workspace_layout_config`

No schema change needed -- the `entity_type` column is TEXT, so it already accepts `'opportunity'`. We need a new table for the highlights card configuration:

```sql
CREATE TABLE public.opportunity_layout_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  visible_highlights TEXT[] DEFAULT ARRAY['stage','owner','company','documents','value'],
  highlights_order TEXT[] DEFAULT NULL,
  sidebar_order TEXT[] DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
```

RLS policies for workspace-scoped access + own-user CRUD.

## New Files

### 1. `src/hooks/useOpportunityLayoutPreferences.ts`
- `useOpportunityLayoutPreferences()` -- fetches the user's layout preferences for opportunity detail
- `useUpdateOpportunityLayoutPreferences()` -- mutation to upsert preferences
- Default highlight cards: `['stage', 'owner', 'company', 'documents', 'value']`
- Default sidebar order: `['communication', 'dealInfo', 'associations', 'companyInfo', 'lists', 'intelligence']`

### 2. `src/components/opportunities/detail/OpportunityLayoutConfigDialog.tsx`
A dialog/sheet that opens from a "Configure layout" button. Contains two sections:

**Highlights Configuration:**
- Checkbox list of available highlight cards with labels
- Each card can be toggled on/off
- Drag handle for reordering (using HTML5 drag-and-drop, no new dependency needed)

**Sidebar Configuration:**
- List of sidebar sections with checkboxes + drag handles
- Drag-and-drop reorder
- Save/Reset buttons

### Component Structure
```text
OpportunityLayoutConfigDialog
├── Tabs: "Highlights" | "Sidebar"
├── Highlights Tab
│   └── DraggableList of highlight cards with checkboxes
├── Sidebar Tab
│   └── DraggableList of sidebar sections with checkboxes
└── Footer: Reset to defaults | Save
```

## Edited Files

### 3. `src/components/opportunities/detail/OpportunityHighlightsCards.tsx`
- Accept new props: `visibleHighlights: string[]`, `highlightsOrder: string[]`
- Define all possible highlight cards as a registry (id, component renderer)
- Filter and order cards based on preferences
- Make the Settings icon functional -- opens the config dialog
- Make the GripVertical icon trigger drag-and-drop reorder (inline, quick reorder)

### 4. `src/components/opportunities/detail/OpportunityDetailSidebar.tsx`
- Accept new prop: `sidebarOrder: string[]`
- Define each sidebar section with an id
- Render sections in the order specified by `sidebarOrder`
- Add a drag handle to each `SidebarSection` header for reordering
- Implement HTML5 drag-and-drop within the sidebar for live reordering
- On drop, call the update mutation to persist the new order

### 5. `src/components/opportunities/OpportunityDetailPage.tsx`
- Import and use `useOpportunityLayoutPreferences`
- Pass `visibleHighlights`, `highlightsOrder`, `sidebarOrder` to children
- Add a "Configure layout" button (Settings icon) near the highlights header
- Pass config dialog open/close state

### 6. i18n files (all 4 locales)
New keys (~10):
| Key | EN | PT | ES | FR |
|---|---|---|---|---|
| `oppLayout_configureLayout` | Configure layout | Configurar layout | Configurar diseño | Configurer la mise en page |
| `oppLayout_highlights` | Highlights | Destaques | Destacados | Points clés |
| `oppLayout_sidebar` | Sidebar | Barra lateral | Barra lateral | Barre latérale |
| `oppLayout_resetDefaults` | Reset to defaults | Repor predefinições | Restablecer valores | Réinitialiser |
| `oppLayout_saved` | Layout saved | Layout guardado | Diseño guardado | Mise en page enregistrée |
| `oppLayout_dealStage` | Deal Stage | Fase do Negócio | Etapa del negocio | Étape du deal |
| `oppLayout_dealOwner` | Deal Owner | Responsável | Propietario | Responsable |
| `oppLayout_associatedCompany` | Associated Company | Empresa Associada | Empresa Asociada | Entreprise Associée |
| `oppLayout_documents` | Documents | Documentos | Documentos | Documents |
| `oppLayout_dealValue` | Deal Value | Valor do Negócio | Valor del negocio | Valeur du deal |
| `oppLayout_dragToReorder` | Drag to reorder | Arrastar para reordenar | Arrastrar para reordenar | Glisser pour réorganiser |

## Technical Details

### Drag-and-Drop Implementation
Using native HTML5 drag-and-drop (no new dependency):
- `draggable` attribute on section headers / card wrappers
- `onDragStart`, `onDragOver`, `onDragEnd` handlers
- Visual feedback with opacity change and drop indicator line
- On drop: update local state immediately, then persist via mutation

### Highlight Cards Registry
```typescript
const HIGHLIGHT_CARDS = [
  { id: 'stage', label: t('oppLayout_dealStage'), icon: Layers },
  { id: 'owner', label: t('oppLayout_dealOwner'), icon: User },
  { id: 'company', label: t('oppLayout_associatedCompany'), icon: Building2 },
  { id: 'documents', label: t('oppLayout_documents'), icon: FileText },
  { id: 'value', label: t('oppLayout_dealValue'), icon: DollarSign },
];
```

### Sidebar Sections Registry
```typescript
const SIDEBAR_SECTIONS = [
  { id: 'communication', title: t('oppDetail_communication'), icon: MessageSquare },
  { id: 'dealInfo', title: t('oppDetail_dealInfo'), icon: Briefcase },
  { id: 'associations', title: t('oppDetail_associations'), icon: UserCheck },
  { id: 'companyInfo', title: t('oppDetail_companyInfo'), icon: Building2 },
  { id: 'lists', title: t('oppDetail_listsSection'), icon: ListChecks },
  { id: 'intelligence', title: 'Intelligence', icon: Brain },
];
```

## Files Summary

| File | Action | Description |
|---|---|---|
| `supabase migration` | **CREATE** | `opportunity_layout_preferences` table + RLS + realtime |
| `src/hooks/useOpportunityLayoutPreferences.ts` | **CREATE** | Hook for CRUD on layout preferences |
| `src/components/opportunities/detail/OpportunityLayoutConfigDialog.tsx` | **CREATE** | Config dialog with drag-and-drop lists |
| `src/components/opportunities/detail/OpportunityHighlightsCards.tsx` | **EDIT** | Accept preferences, filter/order cards, functional settings icon |
| `src/components/opportunities/detail/OpportunityDetailSidebar.tsx` | **EDIT** | Accept sidebar order, drag-and-drop reordering |
| `src/components/opportunities/OpportunityDetailPage.tsx` | **EDIT** | Wire up preferences hook, pass to children |
| `src/i18n/locales/en/crm.json` | **EDIT** | ~11 new keys |
| `src/i18n/locales/pt/crm.json` | **EDIT** | ~11 new keys |
| `src/i18n/locales/es/crm.json` | **EDIT** | ~11 new keys |
| `src/i18n/locales/fr/crm.json` | **EDIT** | ~11 new keys |

## Implementation Order

1. Database migration (create table + RLS)
2. `useOpportunityLayoutPreferences.ts` hook
3. `OpportunityLayoutConfigDialog.tsx` component
4. Edit `OpportunityHighlightsCards.tsx` -- configurable cards
5. Edit `OpportunityDetailSidebar.tsx` -- drag-and-drop sidebar sections
6. Edit `OpportunityDetailPage.tsx` -- wire everything together
7. Add i18n keys to all 4 locales

