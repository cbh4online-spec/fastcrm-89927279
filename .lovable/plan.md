

# PRD Audit — What's Already Implemented vs What's Missing

## Status Summary

| PRD Section | Status |
|---|---|
| **Phase 1 — Command Center** | ✅ Done |
| **Phase 2 — Context OS** | ✅ Done (evolved into modular `context_blocks`) |
| **Phase 3 — Change Impact Engine** | ⚠️ Partial |
| **Phase 4 — Impact Visualization** | ❌ Missing |
| **Phase 5 — Command Shortcuts** | ✅ Done |

## Detailed Breakdown

### Phase 1 — Command Center ✅
- `/dashboard/command-center` page exists with tabs (Command, Context OS, History)
- Daily Revenue Brief: `daily-revenue-brief` edge function + `useDailyBrief` hook + `DailyBriefPage`
- Decision Engine: `ask-fastcrm` edge function + AI copilot + slash commands
- Strategic Alerts: Implemented via `context_alerts` table + `ContextAlertsPanel` + dedicated `/dashboard/alerts` page
- Command Palette (⌘K): `ActionCommandPalette` with 15+ actions

### Phase 2 — Context OS ✅
- `/dashboard/context-os` page with `WizardShell` (8 strategic block types)
- Instead of separate `company_context`/`offer_context`/`funnel_context`/`persona_context` tables, the system evolved into a more flexible `context_blocks` + `business_context` architecture
- AI assist via `context-ai-assist` edge function
- Context Score, versions, dependencies, comments, attachments all implemented

### Phase 3 — Change Impact Engine ⚠️ Partial
**Implemented:**
- `compute-impact` edge function (BFS traversal of dependency graph)
- `context_dependencies` table with relation types and strength
- `context_drift` + `compute-drift` edge function
- `context_block_versions` with `change_type` and `changed_fields`
- `context_event_log` for audit trail

**Missing:**
- `change_events` table (explicit change tracking with `old_value`/`new_value`)
- `impact_map` table (persisted impact results with `affected_module`, `status`, `suggested_action`)
- Cross-module impact detection (offers → landing pages, funnels, campaigns, products)
- The current impact engine only works within Context OS blocks, not across CRM modules

### Phase 4 — Impact Visualization ❌ Missing
- No `/dashboard/impact-map` page exists
- `@xyflow/react` is installed (used in `VisualDataModelPage`) but not used for impact visualization
- No visual graph showing context block dependencies with red-highlighted affected nodes

### Phase 5 — Command Shortcuts ✅
- `cmdk` installed and used in `ActionCommandPalette` and `CommandPalette`
- `mitt` used for event bus
- `sonner` used for toasts
- Slash commands (`/brief`, `/context`, `/alerts`, etc.) implemented

---

## What Needs to Be Built

### 1. Impact Map Visualization Page
- New page at `/dashboard/impact-map`
- Uses `@xyflow/react` (already installed)
- Nodes = context blocks (color-coded by type)
- Edges = dependencies (from `context_dependencies`)
- When a block changes: affected nodes highlight in red using `compute-impact` results
- Interactive: click node → navigate to block detail
- Controls: zoom, pan, fit-to-view, filter by block type

### 2. Cross-Module Change Detection (Optional Enhancement)
- `change_events` table to track changes across CRM entities (offers, campaigns, products)
- `impact_map` table to persist computed impact results
- Edge function to detect when a price/offer changes and flag dependent assets
- This extends impact beyond Context OS blocks to operational CRM modules

---

## Implementation Plan

### Step 1: Impact Map Page (core deliverable)
- Create `src/pages/ImpactMapPage.tsx` using ReactFlow
- Create `src/hooks/useImpactMapData.ts` to fetch blocks + dependencies + drift scores
- Add route `/dashboard/impact-map` to App.tsx
- Add sidebar navigation link
- Node styling: color by block_type, border by drift severity, red glow for impacted
- Edge styling: thickness by strength, dashed for auto-detected
- Sidebar panel on node click showing block details + drift score

### Step 2: Impact Trigger UI
- Button on each node: "Simulate Impact" → calls `compute-impact` → highlights affected nodes in red
- Animation: ripple effect propagating through dependency graph

### File Plan

| File | Action |
|---|---|
| `src/pages/ImpactMapPage.tsx` | New — ReactFlow impact visualization |
| `src/hooks/useImpactMapData.ts` | New — fetch blocks, deps, drift |
| `src/components/impact-map/ImpactMapNode.tsx` | New — custom node component |
| `src/components/impact-map/ImpactMapSidebar.tsx` | New — detail panel on node click |
| `src/App.tsx` | Add route |
| Sidebar component | Add nav link |

