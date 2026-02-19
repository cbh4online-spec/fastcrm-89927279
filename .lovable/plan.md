
# Bulk "Convert All Steps to Tasks" Action

## What This Adds

A single **"Converter Tudo em Tarefas"** button at the top of the Decisões tab that:
1. Iterates through every open strategic decision
2. Creates a task for each recommended step across all decisions
3. Marks every decision as `converted`
4. Shows a summary toast: "X tarefas criadas a partir de Y decisões"

---

## What Already Exists (No Duplication)

- `useConvertAllDecisionSteps` in `useStrategicDecisions.ts` — handles one decision at a time (steps + mark converted)
- `DecisionsTab` header row already has the "Analisar e Gerar Decisões" button
- `useStrategicDecisions` returns all open decisions
- Cache invalidation for both `strategic-decisions` and `strategic-decisions-history` already wired

---

## Scope of Changes

| File | Change |
|---|---|
| `src/hooks/useStrategicDecisions.ts` | Add `useBulkConvertAllDecisions` hook |
| `src/pages/StrategyPage.tsx` | Add bulk convert button to `DecisionsTab` header |

No new files. No database changes.

---

## 1. New Hook: `useBulkConvertAllDecisions`

Added to `src/hooks/useStrategicDecisions.ts`:

```typescript
export function useBulkConvertAllDecisions() {
  const createTask = useCreateTask();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (decisions: StrategicDecision[]) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      let totalTasks = 0;

      for (const decision of decisions) {
        // Create a task for each step
        for (const step of decision.recommended_steps) {
          await createTask.mutateAsync({ title: step, due_at: dueDate.toISOString() });
          totalTasks++;
        }
        // Mark decision as converted
        const { error } = await supabase
          .from("strategic_decisions")
          .update({ status: "converted" })
          .eq("id", decision.id);
        if (error) throw error;
      }

      return { totalTasks, totalDecisions: decisions.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["strategic-decisions", currentWorkspace?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["strategic-decisions-history", currentWorkspace?.id],
      });
    },
  });
}
```

Key design decisions:
- Accepts the full `decisions` array (passed from the UI, which already has the data loaded)
- Sequential `for` loops (not `Promise.all`) — same pattern as `useConvertAllDecisionSteps`, avoids race conditions in task creation
- Returns `{ totalTasks, totalDecisions }` so the UI can show a meaningful success toast
- Invalidates both query keys on success — active list clears, history updates

---

## 2. UI: Bulk Convert Button in `DecisionsTab`

The button is added to the existing header row in `DecisionsTab`, to the **left** of the "Analisar e Gerar Decisões" button. It only renders when `decisions.length > 0` (hidden in empty state).

### Updated header row layout:

```
┌──────────────────────────────────────────────────────────────────┐
│ Decisões Estratégicas  [2 activas]  · última análise há 1 hora   │
│                        [✅ Converter Tudo em Tarefas]  [🔄 Analisar] │
└──────────────────────────────────────────────────────────────────┘
```

### Code change in `DecisionsTab`:

```tsx
// Import the new hook
const bulkConvert = useBulkConvertAllDecisions();

// Bulk convert handler
const handleBulkConvert = async () => {
  if (decisions.length === 0) return;
  try {
    const result = await bulkConvert.mutateAsync(decisions);
    toast.success(
      `${result.totalTasks} tarefa${result.totalTasks !== 1 ? "s" : ""} criada${result.totalTasks !== 1 ? "s" : ""} a partir de ${result.totalDecisions} decisão${result.totalDecisions !== 1 ? "ões" : ""}!`
    );
  } catch {
    toast.error("Erro ao converter decisões em tarefas.");
  }
};

// Button (only shown when decisions exist)
{decisions.length > 0 && (
  <Button
    size="sm"
    variant="outline"
    onClick={handleBulkConvert}
    disabled={bulkConvert.isPending || generate.isPending}
    className="gap-1.5"
  >
    {bulkConvert.isPending ? (
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
    ) : (
      <CheckCircle2 className="w-3.5 h-3.5" />
    )}
    {bulkConvert.isPending ? "A converter..." : "Converter Tudo em Tarefas"}
  </Button>
)}
```

### Disabled states:
- Disabled while `bulkConvert.isPending` (self)
- Disabled while `generate.isPending` (prevents converting while generating new ones simultaneously)
- Hidden entirely when `decisions.length === 0` (not just disabled — the empty state already has the generate CTA)

### Icons needed:
- `CheckCircle2` — already imported in `StrategyPage.tsx` (line 22)
- `Loader2` — needs to be added to the imports from `lucide-react`

---

## Technical Details

- **Sequential processing** — tasks are created one by one, same as the per-card "Criar Todas as Tarefas" pattern. Prevents concurrent write issues.
- **Decisions with zero steps** — if a decision has no `recommended_steps`, the inner loop is skipped but the decision is still marked as `converted`. This is the correct behavior.
- **No confirmation dialog** — consistent with the per-card "Criar Todas as Tarefas" button which also has no confirmation. The action is immediately reversible by viewing tasks and deleting them.
- **Toast message** — uses Portuguese pluralization matching the existing pattern in the file (e.g. `"${count} nova${count > 1 ? "s" : ""} decisão${count > 1 ? "ões" : ""} gerada${count > 1 ? "s" : ""}"`)
- **Cache invalidation** — after bulk convert, `["strategic-decisions"]` is invalidated → active list becomes empty → the empty state + history accordion are shown automatically.

---

## Files to Edit

| File | What Changes |
|---|---|
| `src/hooks/useStrategicDecisions.ts` | Add `useBulkConvertAllDecisions` export at the bottom |
| `src/pages/StrategyPage.tsx` | Import `useBulkConvertAllDecisions` + `Loader2`; add bulk button + handler to `DecisionsTab` |
