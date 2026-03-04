

# Context OS Phase 4 — Command Center Vivo

## Overview

Transform the Context OS from documentation into a living system with an Action Registry (cmdk), Event Bus, Dependency Graph, Drift Score, and Alerts. This is a large feature set; the plan is scoped to the PRD's MVP DONE CRITERIA.

## What Already Exists

- `context_blocks` + `context_fields` tables (8 block types, Phase 1-3 complete)
- `context_block_versions`, `context_block_comments`, `context_block_attachments` (Phase 2)
- `context-ai-assist` edge function (Phase 3)
- `tasks` table exists but is scoped to leads/opportunities (`related_type CHECK IN ('lead','opportunity')`)
- Existing `useSlashCommands` with 6 hardcoded commands
- `CommandPalette` component using cmdk
- No `context_dependencies`, `context_drift`, `alerts`, `event_log`, or `action_catalog` tables exist yet
- `VisualDataModelPage` uses xyflow (Sprint 2 foundation ready)

## Database Migration

**New tables:**

1. **`context_dependencies`** — Dependency graph between blocks (source → target, relation type, strength 0-100)
2. **`context_drift`** — Computed drift score per block (score, severity, stale_days, reasons_json). Unique on block_id.
3. **`context_alerts`** — System-generated alerts with severity, CTA actions, related block. (Named `context_alerts` to avoid conflicts with any future generic alerts table)
4. **`context_event_log`** — Persistent event log (type, actor, entity, payload, correlation_id). Named to avoid collision with `stripe_event_log`.

**Schema changes to existing tables:**

5. **`context_blocks`** — Add columns: `last_verified_at TIMESTAMPTZ`, `last_changed_at TIMESTAMPTZ DEFAULT now()`, `owner_user_id UUID`, `slug TEXT`, `content_json JSONB DEFAULT '{}'`, `metadata_json JSONB DEFAULT '{}'`

**Note:** The PRD's `action_catalog` table will be hardcoded in the frontend registry for MVP (synced later). The PRD's `tasks` and `alerts` tables are replaced by `context_alerts` and we extend the existing `tasks` table to support context blocks.

**Existing `tasks` table update:** Add `related_type` value `'context_block'` support — requires dropping and recreating the CHECK constraint.

All tables scoped by workspace_id with RLS using `is_workspace_member`.

## Edge Functions

### `compute-drift` (new)
- For each active `context_block` in a workspace:
  - Compute `stale_days` from `last_verified_at`
  - Compute `dependency_impact` from `context_dependencies` where source blocks changed recently
  - Count open tasks related to the block
  - Apply drift formula → upsert into `context_drift`
  - If severity crosses threshold → insert `context_alerts`
- Called on-demand or after block updates

### `compute-impact` (new)
- Given a `source_block_id`, traverse `context_dependencies` to find affected targets
- Return list with impact scores
- Used by the "Impact Map" action

## Frontend Architecture

### 1. Event Bus (`src/lib/eventBus.ts`)
- Tiny mitt-based bus with `emitAndPersist(type, payload)` that:
  - Emits to in-memory listeners
  - Async inserts into `context_event_log`
- Event types as TypeScript union (from PRD list)

### 2. Action Registry (`src/lib/actionRegistry.ts`)
- `Action` interface matching PRD spec (id, title, group, keywords, requires, run)
- ~15 MVP actions across groups: Navigate, Create, Update, Analyze, Automate, Governance
- Key actions: `context.verify_block`, `brief.generate_daily`, `impact.run`, `tasks.create_from_drift`, navigation shortcuts
- Every `run()` calls `emitAndPersist('command.executed', ...)`

### 3. Enhanced Command Palette (`src/components/command-center/ActionCommandPalette.tsx`)
- Replace current cmdk integration with full Action Registry
- Filter by keyword search + context (active block type, user role)
- "Most urgent" actions pinned at top when drift severity >= risk
- Keyboard shortcut: Cmd+K (reuse existing listener)

### 4. Drift Score UI
- **Dashboard cards**: Add drift badge (OK/WARN/RISK/CRITICAL) + `stale_days` to each block card in `ContextOSDashboard`
- **`ContextScoreRing`** enhancement: Show drift severity ring color
- **`useContextDrift` hook**: Fetch drift data, trigger recompute on block changes

### 5. Dependencies Management
- **`useContextDependencies` hook**: CRUD for `context_dependencies`
- **`ContextDependenciesTab`**: New tab in `ContextBlockDetail` showing linked blocks with relation type and strength
- Simple UI to add/remove dependencies (select source/target block)

### 6. Alerts Panel
- **`useContextAlerts` hook**: Fetch/mark-read/resolve alerts
- **`ContextAlertsPanel`**: Slide-in or inline panel showing unread alerts with CTA buttons that trigger actions from the registry
- Sonner toasts on new critical/risk alerts

### 7. Event Log Viewer
- **`ContextEventLog`**: Simple scrollable list in a new tab showing recent events for the workspace (filterable by type)

## File Plan

| File | Action |
|------|--------|
| `supabase/migrations/[ts]_phase4.sql` | New tables + ALTER context_blocks + indexes + RLS |
| `supabase/functions/compute-drift/index.ts` | Drift computation edge function |
| `supabase/functions/compute-impact/index.ts` | Impact traversal edge function |
| `supabase/config.toml` | Add function entries |
| `src/lib/eventBus.ts` | mitt event bus + persist |
| `src/lib/actionRegistry.ts` | Action interface + registry |
| `src/hooks/useContextDrift.ts` | Drift data + recompute trigger |
| `src/hooks/useContextDependencies.ts` | Dependencies CRUD |
| `src/hooks/useContextAlerts.ts` | Alerts CRUD |
| `src/hooks/useContextEventLog.ts` | Event log query |
| `src/components/command-center/ActionCommandPalette.tsx` | New cmdk with action registry |
| `src/components/context-os/ContextDriftBadge.tsx` | Drift severity badge |
| `src/components/context-os/ContextDependenciesTab.tsx` | Dependencies management tab |
| `src/components/context-os/ContextAlertsPanel.tsx` | Alerts panel with CTAs |
| `src/components/context-os/ContextOSDashboard.tsx` | Update: drift badges on cards |
| `src/components/context-os/ContextBlockDetail.tsx` | Update: add Dependencies tab |
| `src/pages/CommandCenterPage.tsx` | Update: integrate alerts + new palette |

## Sequence (implementation order)

1. Database migration (all new tables + schema changes)
2. Event bus + action registry (foundation layer)
3. Edge functions (compute-drift, compute-impact)
4. Hooks (drift, dependencies, alerts, event log)
5. UI components (drift badges, dependencies tab, alerts panel, enhanced command palette)
6. Wire everything together in CommandCenterPage + ContextOSDashboard

