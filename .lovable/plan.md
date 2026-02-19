
# Real-Time Notification Badge on "Brief Executivo" Sidebar Item

## What This Adds

A small numeric badge on the **"Brief Executivo"** nav item inside the "Estratégia" group in the sidebar. It shows the count of open strategic decisions (e.g. `3`), fetched from the already-cached `["strategic-decisions"]` query. When there are no open decisions, the badge disappears. The badge is a compact red pill that sits to the right of the item name, replacing (or sitting beside) the existing `highlight` dot.

---

## What Already Exists (No Duplication)

- `useStrategicDecisions` hook — already queries `strategic_decisions WHERE status = 'open'` and is cached under `["strategic-decisions", workspaceId]`. This is the **exact** data the badge needs. No new query.
- `renderNavItem` function in `Sidebar.tsx` — already renders a `highlight` pulse dot and a `Crown` premium icon after `item.name`. The badge slots in naturally at the same position.
- `navigationGroups` — "Brief Executivo" item at `/dashboard/strategy` is clearly identified at line 289–294.

---

## Architecture

The `Sidebar` component already calls multiple hooks at the top level (`useWorkspace`, `useSubscription`, `useWorkspaceModules`, `useMenuPermissions`). Adding `useStrategicDecisions` here follows the exact same pattern — one hook call, result available to `renderNavItem` via the component's closure.

The badge count is derived from `decisions.length` (the array returned by `useStrategicDecisions`). Since this query is already being made by `DecisionsTab` inside `StrategyPage`, React Query deduplcates the network call — the sidebar gets the count for **free** from the shared cache whenever the page has been visited. On first load (before the Strategy page is visited), the sidebar fires its own background fetch.

---

## Scope of Changes

| File | Change |
|---|---|
| `src/components/layout/Sidebar.tsx` | Import `useStrategicDecisions`; call it at top of `Sidebar()`; pass count into `renderNavItem` via a special-case check on `item.href` |

**One file only. No new files. No database changes. No new hooks.**

---

## Implementation Detail

### 1. Import

```typescript
import { useStrategicDecisions } from "@/hooks/useStrategicDecisions";
```

Added alongside the other hook imports at the top of `Sidebar.tsx`.

### 2. Hook call inside `Sidebar()`

```typescript
const { data: openDecisions = [] } = useStrategicDecisions();
const openDecisionCount = openDecisions.length;
```

Placed after the existing hook calls (line ~365), before the `filteredNavigationGroups` memo. The `= []` default means the component renders instantly without waiting.

### 3. Badge injection in `renderNavItem`

The function already checks `item.href` implicitly (via `isActive`). We add a targeted check:

```tsx
const isStrategyItem = item.href === "/dashboard/strategy";
const showDecisionBadge = isStrategyItem && openDecisionCount > 0;
```

Then inside the `<Link>` JSX, **after** `<span className="flex-1">{item.name}</span>`, add:

```tsx
{showDecisionBadge && (
  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
    {openDecisionCount > 9 ? "9+" : openDecisionCount}
  </span>
)}
{isPremium && <Crown className="w-3.5 h-3.5 text-amber-400" />}
{item.highlight && !active && !showDecisionBadge && (
  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
)}
```

Key decisions:
- **Cap at 9+** to prevent the badge from pushing the layout on long counts.
- **Suppress the `highlight` pulse dot** when the badge is showing — both indicators compete for the same space; the numeric badge is more informative.
- **Red background** (`bg-red-500`) — universally understood as "attention needed", clearly visible against the dark `slate-900` sidebar background.
- **No border** — the rounded pill shape is enough to distinguish it.
- **Not `Badge` component from `@/components/ui/badge`** — that component is designed for light backgrounds and uses `border`. A raw `<span>` with tailwind classes is cleaner and avoids theming conflicts on the dark sidebar.

### 4. Badge also on the group trigger (optional visual)

The "Estratégia" group header also shows a `highlight` pulse dot (line 498–500 in `renderNavGroup`). When the sidebar is collapsed or the group is closed, users would see the group but not the item badge. To make the count visible at the group level too, a matching badge is added to `renderNavGroup` when `group.name === "Estratégia"`:

```tsx
// Inside renderNavGroup, after <span className="flex-1 text-left font-medium">{group.name}</span>
{group.name === "Estratégia" && openDecisionCount > 0 ? (
  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
    {openDecisionCount > 9 ? "9+" : openDecisionCount}
  </span>
) : group.highlight ? (
  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
) : null}
```

This means: when there are open decisions, the group header shows the red count badge instead of the generic pulse dot. When decisions are all resolved, it falls back to the normal highlight dot.

---

## Visual Result

```
Estratégia  [3]  ▼               ← group header: red badge replaces pulse dot
  Brief Executivo  [3]            ← item: red badge after name
```

When count = 0:
```
Estratégia  ●  ▶                 ← normal pulse dot returns
  Brief Executivo  ●             ← normal highlight dot
```

---

## Technical Details

- **React Query cache deduplication**: `useStrategicDecisions` uses `queryKey: ["strategic-decisions", workspaceId]`. The sidebar and the Strategy page share the same cache entry. When either invalidates it (dismiss, convert, generate), the sidebar badge updates automatically — no extra subscriptions needed.
- **No performance cost**: The hook call in the sidebar adds a subscriber to an already-existing React Query entry. If the cache is fresh, no network request is made.
- **`enabled: !!currentWorkspace`**: The hook is guarded — it won't fire before the workspace is loaded (same guard as in the Strategy page).
- **`staleTime` default**: React Query's default `staleTime` is 0, meaning data is always refetched on mount. The sidebar mounts once and stays mounted, so the badge will reflect the latest count after any Strategy page visit invalidates the cache.
- **Capped at `9+`**: Prevents overflow on very high counts. In practice, the engine generates at most 5 decisions at a time (one per rule), so the max natural display is `5`.

---

## Files to Edit

| File | What Changes |
|---|---|
| `src/components/layout/Sidebar.tsx` | Add import for `useStrategicDecisions`; add hook call in `Sidebar()`; add badge logic in `renderNavItem` and `renderNavGroup` |
