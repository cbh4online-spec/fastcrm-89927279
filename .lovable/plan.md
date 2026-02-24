

# Add Health Status Sorting to Table View

## Changes

### `src/components/opportunities/OpportunityTableView.tsx`

Add a `healthSortDir` state (like `scoreSortDir`) and a sortable button on the "Health" column header. The sort order maps `AT_RISK=0, WATCH=1, HEALTHY=2` so descending (default) puts AT_RISK first.

**Specific edits:**

1. **Line 63** — Add `healthSortDir` state next to `scoreSortDir`:
   ```typescript
   const [healthSortDir, setHealthSortDir] = useState<"asc" | "desc" | null>(null);
   ```

2. **Lines 94-100** — Extend `sortedOpportunities` to also handle health sorting. If `healthSortDir` is set, sort by health label rank (`AT_RISK=0, WATCH=1, HEALTHY=2`); if `scoreSortDir` is set, sort by score; otherwise use original order.

3. **Line 104-108** — Add `handleHealthSort` function (same toggle pattern as `handleScoreSort`).

4. **Line 142** — Replace the static `<TableHead>Health</TableHead>` with a sortable button matching the Score sort button pattern:
   ```tsx
   <TableHead className="text-center">
     <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-medium gap-1" onClick={handleHealthSort}>
       <ArrowUpDown className="w-3 h-3" />
       Health
       {healthSortDir && <span className="text-primary">{healthSortDir === "desc" ? "↓" : "↑"}</span>}
     </Button>
   </TableHead>
   ```

No other files need changes — the `healthMap` is already passed to the table view.

