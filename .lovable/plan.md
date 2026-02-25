

# Redesign Opportunities Board — Attio-Style Cards

## What Changes

The current Kanban board has heavy column headers (probability bars, weighted values, avg days, score summaries) and cards with progress dots, health badges, and score indicators. The Attio reference shows a much cleaner, field-labeled card layout with a minimal column header and a sum footer.

## Visual Comparison

```text
CURRENT                              TARGET (Attio)
┌─────────────────────┐              ┌─────────────────────┐
│ ● Lead  [3]         │              │ ● Lead  1           │
│ Probabilidade  10%  │              │                     │
│ ████░░░░░░░░░░░░░░░ │              └─────────────────────┘
│ ┌─────────┬────────┐│              ┌─────────────────────┐
│ │ Total   │ Pond.  ││              │ Cosme <> New Bus.   │
│ │ 5K €    │ 500 €  ││              │                     │
│ └─────────┴────────┘│              │ Deal value          │
│ ⏱ Avg 12d  Score 46 │              │ Set Deal value...   │
├─────────────────────┤              │                     │
│ ┌───────────────┐   │              │ Associated company  │
│ │ Title    [🔥] │   │              │ 🏢 Cosme            │
│ │ 🏢 Company    │   │              │                     │
│ │ ████████████░░│   │              │ Associated people   │
│ │ 💲 5.000 € [46│   │              │ 👤 Lisa Cosme       │
│ │ 👤 Contact    │   │              │                     │
│ │ 🌐 Website    │   │              │ Deal type           │
│ │ Avatar  1Jan  │   │              │ [Website form]      │
│ └───────────────┘   │              │                     │
│ ┌──────────────┐    │              │ Priority Level      │
│ │ + Calculation │    │              │ High Priority       │
│ └──────────────┘    │              │                     │
└─────────────────────┘              │ 📋1 📧1 💬  ⏱10d   │
                                     └─────────────────────┘
                                     €0.00 sum
```

## Changes

### 1. `src/components/opportunities/OpportunityKanbanColumn.tsx` — Simplify Column

**Remove:**
- Probability bar section (lines 168-179)
- Stats grid with Total/Weighted values (lines 181-196)
- Avg days + score bar (lines 198-211)
- Calculator dropdown footer (lines 267-294)
- All associated state/logic (`activeCalc`, `CalcType`, `getCalcValue`, `getCalcLabel`, `getProbabilityColor`)

**Keep:**
- Colored dot + stage name + count in header
- "+" button to add deal
- Drag & drop handlers
- Card list with AnimatePresence

**Add:**
- Simple currency sum footer at the bottom (just `€X sum` text, like the Attio screenshot)

### 2. `src/components/opportunities/OpportunityCard.tsx` — Attio-Style Labeled Fields

**Remove:**
- Stage progress dots (Row 3)
- Deal score badge next to value
- Temperature badge in header
- Health badge in header
- Urgency icons (AlertTriangle, Zap)
- Source badge with Globe icon
- Owner avatar + close date footer

**Restructure card to labeled field pairs:**

```text
┌──────────────────────────┐
│ Title                    │
│                          │
│ Deal value               │  ← label in muted text
│ €12,500.00               │  ← value in foreground
│                          │
│ Associated company       │
│ 🏢 CompanyName           │
│                          │
│ Associated people        │
│ 👤 ContactName           │
│                          │
│ Deal type                │
│ [Source Badge]            │  ← colored badge
│                          │
│ Priority Level           │
│ High Priority            │  ← colored text (red/amber/green)
│                          │
│ 📋 📧 💬     ⏱ 10d       │  ← activity icons + age
└──────────────────────────┘
```

Each field becomes a `<div>` with:
- A small label (`text-[11px] text-muted-foreground`)
- A value line below with icon + text

**Priority Level colors:**
- `critical` / `high` → `text-red-500`
- `medium` → `text-amber-500`  
- `low` → `text-green-500`

**Activity icons footer:** Show placeholder icons for notes, emails, comments (static for now) + deal age in days with clock icon, matching the Attio style.

### 3. `src/components/opportunities/OpportunitiesModule.tsx` — Column Footer Sum

Add a sticky sum row below the ScrollArea that shows the total value per column, matching the `€X.XX sum` pattern at the bottom of each column in the screenshot.

### Files Modified

| File | Change |
|------|--------|
| `src/components/opportunities/OpportunityKanbanColumn.tsx` | Simplify header (remove probability/stats/calculator), add simple sum footer |
| `src/components/opportunities/OpportunityCard.tsx` | Restructure to labeled field pairs (Attio style), remove progress dots/scores/health badges |

