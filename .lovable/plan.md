
# Strategic Decision Engine

## What This Builds

A rule-based decision engine that reads from `deal_scores`, `revenue_forecasts`, `conversation_signals`, and `weekly_briefs` and generates concrete, actionable business decisions. Decisions are stored persistently, displayed as cards in a new "Decisões" tab on the `StrategyPage`, and can be converted to tasks with a single click.

This is **100% deterministic** — no AI/LLM calls. The engine evaluates 5 business rules and inserts structured `strategic_decisions` rows every time it runs.

---

## What Already Exists (No Duplication)

- `deal_scores` table + `useDealScores` hook — already working
- `revenue_forecasts` table + `useRevenueForecast` hook — already working
- `conversation_signals` table — queried by `DealIntelligenceTab` already
- `weekly_briefs` table — queried by `useStrategicBriefs`
- `StrategyPage` — has tabbed layout; adding a 4th tab is clean
- `useCreateTask` + `PriorityAction` pattern — already used in Brief tab for task creation
- Edge function patterns (`compute-deal-score`, `compute-revenue-forecast`) — exact model to follow

---

## Architecture

```text
[compute-strategic-decisions edge function]
         │
         ├─ Query: revenue_forecasts (latest 2, for drop detection)
         ├─ Query: deal_scores (hot/critical, last_activity)
         ├─ Query: conversation_signals (main_objection distribution)
         ├─ Query: opportunities (open, for concentration check)
         │
         ├─ Rule 1: revenue_forecast_drop > 20%
         ├─ Rule 2: hot deals inactive > 3 days
         ├─ Rule 3: same objection in > 25% of conversations
         ├─ Rule 4: churn_risk rising (avg > 0.6)
         ├─ Rule 5: pipeline concentration > 40% in one deal
         │
         ├─ For each triggered rule → INSERT strategic_decisions row
         └─ Return array of decisions created

[useStrategicDecisions hook]
         │
         └─ Reads open decisions for current workspace
            + exposes generateDecisions() mutation
            + exposes dismissDecision() and convertToTask() helpers

[StrategicDecisionCard component]
         │
         ├─ impact badge (high/medium/low)
         ├─ urgency badge (immediate/this_week/monitor)
         ├─ business_area chip
         ├─ explanation paragraph
         ├─ recommended_steps list (each with "+ Tarefa" button)
         └─ dismiss button (sets status → 'dismissed')

[StrategyPage — new "Decisões" tab]
         └─ Generate button + list of StrategicDecisionCard
```

---

## Scope of Changes

| Layer | File | Action |
|---|---|---|
| Database | migration | Create `strategic_decisions` table + RLS |
| Edge Function | `supabase/functions/compute-strategic-decisions/index.ts` | New |
| Config | `supabase/config.toml` | Add function entry |
| Hook | `src/hooks/useStrategicDecisions.ts` | New |
| Component | `src/components/strategy/StrategicDecisionCard.tsx` | New |
| Page | `src/pages/StrategyPage.tsx` | Add "Decisões" tab |

---

## 1. Database: `strategic_decisions` Table

```sql
CREATE TABLE public.strategic_decisions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  decision_title    text NOT NULL,
  business_area     text NOT NULL,  -- sales, marketing, pricing, operations, retention
  impact_level      text NOT NULL,  -- high, medium, low
  urgency           text NOT NULL,  -- immediate, this_week, monitor
  explanation       text NOT NULL,
  recommended_steps jsonb NOT NULL DEFAULT '[]',
  status            text NOT NULL DEFAULT 'open',  -- open, dismissed, converted
  rule_key          text           -- which rule triggered this (for dedup)
);

CREATE INDEX ON public.strategic_decisions(workspace_id, created_at DESC);
CREATE INDEX ON public.strategic_decisions(workspace_id, status);

ALTER TABLE public.strategic_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members read decisions"
  ON public.strategic_decisions FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "workspace members update decisions"
  ON public.strategic_decisions FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "service role manages decisions"
  ON public.strategic_decisions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

The `rule_key` column is used to detect if a decision for the same rule was already generated recently (within 7 days). This prevents duplicate decisions if the user regenerates frequently.

---

## 2. Edge Function: `compute-strategic-decisions`

**Input:** `{ workspace_id }` — on-demand from UI or cron.
**Output:** Array of inserted `strategic_decisions` rows.

### Data Queries (parallel)

```typescript
const [forecastsResult, scoresResult, signalsResult, oppsResult] = await Promise.all([
  // Latest 2 forecasts to detect revenue drop
  supabase.from("revenue_forecasts")
    .select("*").eq("workspace_id", workspace_id)
    .order("generated_at", { ascending: false }).limit(2),

  // All deal_scores (hot + critical urgency)
  supabase.from("deal_scores")
    .select("opportunity_id, close_score, category, urgency, next_action, updated_at")
    .eq("workspace_id", workspace_id),

  // All conversation_signals for objection analysis
  supabase.from("conversation_signals")
    .select("main_objection, churn_risk, temperature")
    .eq("workspace_id", workspace_id),

  // Open opportunities for value concentration check
  supabase.from("opportunities")
    .select("id, value, title")
    .eq("workspace_id", workspace_id)
    .eq("status", "open"),
]);
```

### 5 Decision Rules

**Rule 1 — Revenue Forecast Drop**
```
trigger: latest.expected_case < previous.expected_case * 0.80
  (i.e. dropped > 20%)

→ {
  decision_title: "Queda de receita prevista — acção de aquisição necessária",
  business_area: "sales",
  impact_level: "high",
  urgency: "immediate",
  explanation: "A receita esperada caiu X% em relação ao período anterior...",
  recommended_steps: [
    "Rever oportunidades estagnadas e activar follow-up urgente",
    "Lançar campanha de reactivação para leads frios",
    "Analisar deals perdidos recentes para identificar padrões"
  ]
}
```

**Rule 2 — Hot Deals Inactive**
```
trigger: count(deal_scores WHERE category='hot' AND updated_at < now - 3 days) > 0

→ {
  decision_title: "Negócios quentes sem actividade há mais de 3 dias",
  business_area: "sales",
  impact_level: "high",
  urgency: "immediate",
  explanation: "X negócios com probabilidade elevada não tiveram actividade...",
  recommended_steps: [
    "Contactar cada negócio quente com uma mensagem personalizada",
    "Agendar reuniões pendentes para esta semana",
    "Verificar se existem bloqueios ou objeções não registadas"
  ]
}
```

**Rule 3 — Objection Dominance**
```
trigger: most_common_objection_count / total_signals > 0.25
  AND most_common_objection !== "none"

→ {
  decision_title: "Objeção dominante: [LABEL] em X% das conversas",
  business_area: "pricing",  // or "marketing" depending on objection type
  impact_level: "medium",
  urgency: "this_week",
  explanation: "A objeção de [tipo] aparece em X% das conversas...",
  recommended_steps: [
    "Criar template de resposta específico para esta objeção",
    "Rever posicionamento de preço/oferta",
    "Analisar argumentação dos concorrentes"
  ]
}
```

**Rule 4 — Churn Risk Rising**
```
trigger: avg(churn_risk WHERE churn_risk > 0.5) > 0.6
  AND count(signals WHERE churn_risk > 0.7) >= 2

→ {
  decision_title: "Risco de churn elevado em múltiplos contactos",
  business_area: "retention",
  impact_level: "high",
  urgency: "immediate",
  explanation: "X contactos apresentam risco de churn acima de 70%...",
  recommended_steps: [
    "Contactar clientes de alto risco com oferta de valor personalizada",
    "Escalar casos críticos para gestor de conta",
    "Implementar check-in proactivo semanal para este segmento"
  ]
}
```

**Rule 5 — Pipeline Concentration**
```
trigger: max_single_opp_value / total_pipeline_value > 0.40
  AND total_pipeline_value > 0

→ {
  decision_title: "Concentração de pipeline — risco de dependência de um negócio",
  business_area: "operations",
  impact_level: "medium",
  urgency: "this_week",
  explanation: "O negócio '[title]' representa X% do valor total do pipeline...",
  recommended_steps: [
    "Diversificar pipeline com qualificação de novos leads",
    "Acelerar outros negócios em fase avançada",
    "Definir plano de contingência caso este negócio não feche"
  ]
}
```

### Deduplication

Before inserting, check if a decision with the same `rule_key` already exists with status `'open'` created in the last 7 days. If so, skip it. This prevents the same alert from being re-generated on every manual trigger.

```typescript
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const { data: existing } = await supabase
  .from("strategic_decisions")
  .select("rule_key")
  .eq("workspace_id", workspace_id)
  .eq("status", "open")
  .gte("created_at", sevenDaysAgo);

const existingRuleKeys = new Set(existing?.map(d => d.rule_key) ?? []);
// Only insert decisions whose rule_key is NOT in existingRuleKeys
```

### Storage

```typescript
// Batch insert all triggered decisions
await supabase.from("strategic_decisions").insert(triggeredDecisions);
```

Returns the list of inserted decisions.

---

## 3. React Hook: `useStrategicDecisions`

```typescript
// src/hooks/useStrategicDecisions.ts

export interface StrategicDecision {
  id: string;
  workspace_id: string;
  created_at: string;
  decision_title: string;
  business_area: "sales" | "marketing" | "pricing" | "operations" | "retention";
  impact_level: "high" | "medium" | "low";
  urgency: "immediate" | "this_week" | "monitor";
  explanation: string;
  recommended_steps: string[];
  status: "open" | "dismissed" | "converted";
  rule_key: string | null;
}

export function useStrategicDecisions() {
  // Fetches open decisions ordered by created_at DESC
  // queryKey: ["strategic-decisions", currentWorkspace?.id]
}

export function useGenerateStrategicDecisions() {
  // useMutation → calls compute-strategic-decisions
  // Invalidates ["strategic-decisions"] on success
}

export function useDismissDecision() {
  // useMutation → UPDATE strategic_decisions SET status='dismissed'
}

export function useConvertDecisionToTask() {
  // useMutation → creates a task via useCreateTask pattern
  // Then UPDATEs decision status to 'converted'
}
```

---

## 4. Component: `StrategicDecisionCard`

**Location:** `src/components/strategy/StrategicDecisionCard.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│ [🔴 Alto Impacto]  [⚡ Imediato]  [Vendas]           [✕ Fechar]│
├─────────────────────────────────────────────────────────────────┤
│ Negócios quentes sem actividade há mais de 3 dias               │
│                                                                  │
│ 3 negócios com probabilidade elevada (>80%) não registaram      │
│ actividade nos últimos 3 dias. Risco de perda aumenta          │
│ significativamente após 5 dias sem contacto.                    │
├─────────────────────────────────────────────────────────────────┤
│ Passos recomendados:                                             │
│ ① Contactar cada negócio quente com uma mensagem…  [+ Tarefa]  │
│ ② Agendar reuniões pendentes para esta semana      [+ Tarefa]  │
│ ③ Verificar se existem bloqueios não registados    [+ Tarefa]  │
│                                                           [Criar Todas as Tarefas] │
└─────────────────────────────────────────────────────────────────┘
```

**Badge color logic:**
- `impact_level`:
  - `high` → `bg-red-100 text-red-700 border-red-200`
  - `medium` → `bg-amber-100 text-amber-700 border-amber-200`
  - `low` → `bg-muted text-muted-foreground`
- `urgency`:
  - `immediate` → `bg-red-500 text-white` (solid)
  - `this_week` → `bg-amber-100 text-amber-700`
  - `monitor` → `bg-blue-100 text-blue-700`
- `business_area` → simple chip with emoji: 🎯 Vendas, 📣 Marketing, 💶 Preços, ⚙ Operações, 🛡 Retenção

**Per-step task creation:** Each recommended_step gets a `[+ Tarefa]` button that calls `createTask.mutateAsync({ title: step })`. When all steps have been converted, the card gets a "converted" visual.

**Dismiss:** `[✕]` in the top-right calls `dismissDecision(id)` and removes the card from the list.

---

## 5. Integration in `StrategyPage`

Add a **4th tab** `"⚡ Decisões"` to the existing `Tabs`:

```tsx
<TabsTrigger value="decisions">⚡ Decisões</TabsTrigger>
...
<TabsContent value="decisions">
  <DecisionsTab />
</TabsContent>
```

`DecisionsTab` (inline in `StrategyPage` following the same pattern as `DealIntelligenceTab`):
- Header with count badge: "3 decisões activas"
- `[Analisar e Gerar Decisões]` button (calls `generateDecisions()`)
- Loading skeleton
- Empty state: "Nenhuma decisão activa" + CTA to generate
- List of `StrategicDecisionCard` components
- Shows "Última análise: X tempo atrás" timestamp

---

## 6. Cron Schedule (optional)

Add a weekly cron (Monday 08:00 UTC) via the insert tool (not migration):

```sql
SELECT cron.schedule(
  'compute-strategic-decisions-weekly',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/compute-strategic-decisions',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

In cron mode (no `workspace_id`), the function iterates all workspaces from `deal_scores` — same pattern as `compute-revenue-forecast`.

---

## Technical Details

- **No AI/LLM** — 100% deterministic rule evaluation. Zero credits. Fast (<200ms).
- **Deduplication via `rule_key`** — each rule has a fixed key (`"revenue_drop"`, `"hot_inactive"`, `"objection_dominance"`, `"churn_rising"`, `"concentration"`). Only one open decision per rule per 7-day window is allowed.
- **`recommended_steps` as `jsonb` array of strings** — matches the `priority_actions` pattern from `weekly_briefs`.
- **RLS**: workspace members can SELECT and UPDATE (for dismiss/convert). Service role writes new decisions. No public access.
- **`status` flow**: `open` → `dismissed` (user closes card) or `open` → `converted` (all steps converted to tasks). The UI filters to show only `open` decisions.
- **Component pattern** mirrors `PriorityAction` from `StrategyPage` — same `[+ Tarefa]` button with `disabled` while creating. The "Criar Todas as Tarefas" button iterates all steps.
- **`config.toml`** gets `[functions.compute-strategic-decisions]` with `verify_jwt = false` (same as other compute functions).
- The `StrategicDecisionCard` can also show a "generated X ago" timestamp in the footer using `formatDistanceToNow` from `date-fns` with `pt` locale — consistent with `StrategyPage` styling.

---

## Files to Create / Edit

| File | Action |
|---|---|
| `supabase/migrations/<ts>_strategic_decisions.sql` | New — table + RLS |
| `supabase/functions/compute-strategic-decisions/index.ts` | New — 5-rule engine |
| `supabase/config.toml` | Add function entry |
| `src/hooks/useStrategicDecisions.ts` | New — hook with generate/dismiss/convert |
| `src/components/strategy/StrategicDecisionCard.tsx` | New — decision card UI |
| `src/pages/StrategyPage.tsx` | Edit — add "Decisões" tab |
