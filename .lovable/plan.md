
# Decision History View

## What This Adds

A collapsible "Histórico de Decisões" section below the active decisions list in the existing **Decisões** tab. It shows dismissed and converted decisions grouped by status, with timestamps and a read-only summary of the recommended steps — giving managers a full audit trail of what was acted on and when.

No new pages, no new tables, no new edge functions. This is purely a UI addition on top of data that already exists in the `strategic_decisions` table.

---

## What Already Exists

- `strategic_decisions` table with `status` column (`open` | `dismissed` | `converted`) and `created_at`
- `useStrategicDecisions` hook currently only queries `status = 'open'`
- `DecisionsTab` function in `StrategyPage.tsx` renders the active decision list
- `StrategicDecisionCard` component handles the interactive card
- `IMPACT_CONFIG`, `URGENCY_CONFIG`, `AREA_CONFIG` badge configs already defined in `StrategicDecisionCard.tsx`
- `formatDistanceToNow` and `format` from `date-fns` already imported

---

## Scope of Changes

| File | Change |
|---|---|
| `src/hooks/useStrategicDecisions.ts` | Add `useDecisionHistory` hook |
| `src/pages/StrategyPage.tsx` | Add history section inside `DecisionsTab` |

No new files. No database changes.

---

## 1. New Hook: `useDecisionHistory`

Added to `src/hooks/useStrategicDecisions.ts`:

```typescript
export function useDecisionHistory() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["strategic-decisions-history", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await supabase
        .from("strategic_decisions")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .in("status", ["dismissed", "converted"])
        .order("created_at", { ascending: false })
        .limit(50); // cap at 50 for performance

      if (error) throw error;

      return (data || []).map((d) => ({
        ...d,
        recommended_steps: Array.isArray(d.recommended_steps) ? d.recommended_steps : [],
      })) as StrategicDecision[];
    },
    enabled: !!currentWorkspace,
  });
}
```

The query is separate from the active decisions query so it doesn't pollute the `["strategic-decisions"]` cache that drives the active list. It uses `.in("status", ["dismissed", "converted"])` to fetch both categories in one request. Capped at 50 rows to avoid loading unbounded history.

---

## 2. UI: History Section in `DecisionsTab`

The history section is added **below** the active decision cards in `DecisionsTab`. It uses the existing `Accordion` component (already imported in `StrategyPage.tsx`) as a collapsible wrapper — collapsed by default so it doesn't distract from the active decisions.

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ ▶ Histórico de Decisões  (23 registos)                  │  ← accordion trigger (collapsed by default)
└─────────────────────────────────────────────────────────┘

When expanded:
┌─────────────────────────────────────────────────────────┐
│ ▼ Histórico de Decisões  (23 registos)                  │
├─────────────────────────────────────────────────────────┤
│  [✅ Convertida]  [🔴 Alto Impacto]  [⚡ Imediato]      │
│  Negócios quentes sem actividade há mais de 3 dias       │
│  Convertida há 2 dias · 19 Fev 2026                     │
│  ↳ Passos: Contactar cada negócio quente…  +2 mais      │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│  [🔕 Ignorada]  [🟡 Médio Impacto]  [Esta Semana]       │
│  Concentração de pipeline                                │
│  Ignorada há 5 dias · 14 Fev 2026                       │
│  ↳ Passos: Diversificar pipeline…  +2 mais              │
└─────────────────────────────────────────────────────────┘
```

### Status Row

Each history item shows:
- **Status badge**: `✅ Convertida` (green) or `🔕 Ignorada` (gray)
- **Impact badge** — reusing the same color mapping from `IMPACT_CONFIG`
- **Urgency badge** — reusing `URGENCY_CONFIG`
- **Title** — `decision_title`, read-only
- **Timestamp line**: "Convertida há X tempo · DD MMM YYYY" using both `formatDistanceToNow` and `format` (already imported)
- **Steps preview**: first step truncated + "+N mais" if there are more — no action buttons (history is read-only)

### Grouping

Items are rendered chronologically (newest first) within a flat list. No grouping by type — the status badge makes the distinction visually clear without adding complexity. A simple separator between each item is enough.

### Empty state

If no history exists yet: "Nenhuma decisão no histórico. As decisões ignoradas ou convertidas aparecerão aqui."

### Loading

A minimal skeleton (3 lines of varying width) while `useDecisionHistory` is fetching.

---

## Technical Details

- **No re-render conflicts**: `useDecisionHistory` uses a different query key (`"strategic-decisions-history"`) than the active list (`"strategic-decisions"`). Dismissing an active decision invalidates `["strategic-decisions"]` but NOT the history key — the history refreshes on next open of the accordion, unless we also invalidate it. To keep the history up to date, `useDismissDecision` and `useConvertAllDecisionSteps` will also invalidate `["strategic-decisions-history", workspace_id]` — this requires small additions to both mutations.
- **Accordion** is already imported in `StrategyPage.tsx` (line 10-14), so no new import needed.
- **`format`** from `date-fns` is already imported in `StrategyPage.tsx` (line 2).
- The history section only renders when the accordion is open (`useDecisionHistory` still fires on mount since it's not lazy by default — this is fine as it's a lightweight read-only query).
- The `limit(50)` means for workspaces with very long history, the oldest records won't appear — acceptable for an audit view.

---

## Files to Edit

| File | What Changes |
|---|---|
| `src/hooks/useStrategicDecisions.ts` | Add `useDecisionHistory` hook; add `["strategic-decisions-history"]` invalidation to `useDismissDecision` and `useConvertAllDecisionSteps` |
| `src/pages/StrategyPage.tsx` | Import `useDecisionHistory`; add collapsible history section inside `DecisionsTab` |
