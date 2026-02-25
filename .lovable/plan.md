

# Enhanced Deals Kanban -- Attio-Style Rich Cards

## Current State vs Attio Reference

The current Kanban has **compact single-line cards** showing only title, value, and health badge (details appear on hover). The Attio screenshot shows **rich multi-line cards** with structured fields displayed permanently:

```text
Current card (single line):
┌──────────────────────────────────┐
│ ⠿ Deal Title    €5,000  🟢      │
└──────────────────────────────────┘

Attio card (multi-line, what we'll build):
┌──────────────────────────────────┐
│ Bitlift <> expansion             │
│ 🏢 bitlift.io                   │
│ ●● ─── ─── ─── ───              │
│ 💰 US$18,950.00                  │
│ 👤 Marisa McGill                 │
│ 🟢 Workspace signup              │
│ 📝 📧 💬  ·  11d                 │
└──────────────────────────────────┘
```

## Improvements Over Attio

1. **Deal health badge** -- keep existing health intelligence indicator (Attio doesn't have this)
2. **Temperature badge** -- color-coded hot/warm/cold indicator
3. **Deal score** -- numeric AI score badge visible on card
4. **Progress dots** -- visual stage progression indicator (inspired by Attio's dot pattern)
5. **Activity age** -- days since creation, like Attio's "133d" counter
6. **Quick actions on hover** -- mark won/lost, edit, without opening detail
7. **Column calculations footer** -- "+ Add calculation" row at bottom of each column (sum, avg, count)
8. **Owner avatar** -- show deal owner with avatar circle
9. **Source badge** -- colored source tag (Website, Referral, etc.)

## File Plan

| File | Action | Description |
|---|---|---|
| `src/components/opportunities/OpportunityCard.tsx` | **REWRITE** | Rich multi-line card matching Attio layout with all fields visible |
| `src/components/opportunities/OpportunityKanbanColumn.tsx` | **EDIT** | Add column footer with calculation row, adjust spacing |
| `src/components/opportunities/OpportunitiesModule.tsx` | **EDIT** | Pass owner profiles data to cards, add "Sorted by" toolbar like Attio |
| `src/hooks/useOpportunitiesEnhanced.ts` | **EDIT** | Join owner profile data (name, avatar) into opportunity query |
| `src/i18n/locales/{pt,en,es,fr}/crm.json` | **EDIT** | Add ~12 new keys for card labels and column footer |

## New OpportunityCard Design (153 lines to ~180 lines)

```text
┌─────────────────────────────────────┐
│ Bitlift <> expansion          🟢🔥 │  ← title + health + temperature
│ 🏢 bitlift.io                      │  ← company
│ ●●●○○○                             │  ← stage progress dots
│ US$18,950.00                        │  ← value (prominent)
│ 👤 Marisa McGill                    │  ← contact/lead
│ 🟣 Workspace signup                 │  ← source badge
│ 📝 📧 💬    🧑 Owner    · 11d      │  ← activity icons + owner + age
└─────────────────────────────────────┘
```

Key changes to `OpportunityCard.tsx`:
- Multi-line vertical layout instead of single horizontal row
- Remove `GripVertical` icon (drag works on full card)
- Company row with `Building2` icon
- Stage progress dots: filled circles for stages passed, empty for remaining
- Value displayed prominently on its own row
- Contact/lead name with user icon
- Source as a colored badge
- Footer row: activity indicators (notes count, email count) + owner avatar + "Xd" age counter
- Temperature and health badges in top-right corner
- Deal score badge inline

## Stage Progress Dots

A visual indicator showing how far a deal has progressed through the pipeline:

```typescript
// Given 6 total stages and deal is at stage 3:
// ●●●○○○
const totalStages = allStages.length;
const currentPosition = allStages.findIndex(s => s.id === opportunity.stage_id);
```

This requires passing `stages` array to `OpportunityCard` (currently not passed).

## Column Footer -- Calculations

Like Attio's "+ Add calculation" at the bottom of each column:

```text
───────────────────
+ Add calculation ▾
```

Clicking opens a dropdown with:
- **Sum** of deal values (already shown in header, but toggleable here)
- **Average** deal value
- **Count** (already shown)
- **Min / Max** value

This is a presentational enhancement -- no database changes needed.

## Owner Data

Currently `owner_id` exists on opportunities but the owner profile (name, avatar) is not joined in the query. The hook `useOpportunitiesEnhanced` needs to join `profiles` on `owner_id`:

```sql
SELECT *, profiles!opportunities_owner_id_fkey(name, avatar_url)
FROM opportunities
```

This adds owner name and avatar to each card without a separate query.

## New i18n Keys (~12)

```
kanbanSortedBy, kanbanCreatedAt, kanbanDealValue,
kanbanSource, kanbanOwner, kanbanDaysAgo,
kanbanAddCalculation, kanbanCalcSum, kanbanCalcAvg,
kanbanCalcMin, kanbanCalcMax, kanbanCalcCount,
kanbanStageProgress
```

## Source Badge Colors

Map existing `OPPORTUNITY_SOURCES` to color schemes:

```typescript
const sourceColors: Record<string, string> = {
  website: "bg-green-100 text-green-700",
  referral: "bg-purple-100 text-purple-700",
  email: "bg-blue-100 text-blue-700",
  social: "bg-pink-100 text-pink-700",
  phone: "bg-amber-100 text-amber-700",
  event: "bg-indigo-100 text-indigo-700",
  advertising: "bg-cyan-100 text-cyan-700",
  partner: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-700",
};
```

## Implementation Order

1. Update `useOpportunitiesEnhanced` to join owner profile data
2. Add i18n keys to all 4 locales
3. Rewrite `OpportunityCard.tsx` with rich multi-line layout
4. Update `OpportunityKanbanColumn.tsx` with calculation footer and pass stages to cards
5. Update `OpportunitiesModule.tsx` to pass stages array to columns for progress dots

## Technical Notes

- No database migrations needed -- all data already exists
- The card redesign is purely presentational; drag-and-drop logic stays identical
- Stage progress dots require passing the full `stages` array through the component tree: `OpportunitiesModule` -> `OpportunityKanbanColumn` -> `OpportunityCard`
- Column width stays at `w-80` (320px) to accommodate multi-line cards
- `ScrollArea` inside columns handles overflow for many cards

