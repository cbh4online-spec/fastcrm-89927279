

# AI CEO Copilot — Unified Executive Intelligence Hub

## What Already Exists

All four AI report engines are **already built**:

| Report | Edge Function | Hook | Page |
|--------|--------------|------|------|
| Daily Brief | `daily-revenue-brief` | `useDailyBrief` | `DailyBriefPage` |
| Weekly Strategy | `ai-weekly-strategy` | `useWeeklyStrategy` | (inline in `WeeklyDashboard`) |
| Pipeline Risk | — (client-side) | `usePipelineRiskAnalysis` | `PipelineRiskCard` component |
| Growth Insights | `ai-growth-insights` | `useGrowthInsights` | `GrowthInsightsModule` |

No new edge functions or database tables are needed. This is a **frontend composition task** — creating a unified page that orchestrates existing hooks and adds auto-generation on mount.

## Implementation

### 1. New Page: `src/pages/CEOCopilotPage.tsx`

Route: `/dashboard/ceo-copilot`

Four-tab layout using existing components and hooks:

**Tab 1 — Daily Brief**: Reuses `useDailyBrief` hook. Shows KPI strip (leads, revenue, stalled deals, tasks) + AI summary sections (hot leads, stuck deals, revenue highlight, action suggestions). Auto-generates on mount if no brief exists for today.

**Tab 2 — Weekly Strategy**: Reuses `useWeeklyStrategy` hook. Shows gap analysis table (metric/actual/target/status), risk alerts, recommendations with priority badges, and quick wins list.

**Tab 3 — Pipeline Health**: Reuses `usePipelineRiskAnalysis` hook + queries stalled/declining opportunities directly. Shows risk buckets pie chart, stalled deals list, low-probability deals, inactive leads count.

**Tab 4 — Growth Insights**: Reuses `useGrowthInsights` hook. Shows top customers, top sellers, need matching panel, AI analysis.

**Auto-generation**: On mount, if `todaysBrief` is null, automatically call `generateDailyBrief()`. This satisfies the "generate on login" requirement since the dashboard is the first page users see.

### 2. Route Addition in `App.tsx`

```tsx
import CEOCopilotPage from "./pages/CEOCopilotPage";
// ...
<Route path="/dashboard/ceo-copilot" element={<CEOCopilotPage />} />
```

### 3. Navigation in `nav.v2.ts`

Add "AI CEO Copilot" item in the intelligence/strategy section, between "Brief Executivo" and "Context OS":

```ts
{ type: "item", name: "AI CEO Copilot", href: "/dashboard/ceo-copilot", icon: Brain, iconColor: "text-violet-500" },
```

### 4. New Pipeline Risk Edge Function: `ai-pipeline-risk`

While client-side pipeline analysis exists, we need a dedicated AI-powered analysis function for deeper risk detection (declining opportunities, inactive leads, probability analysis). This function will:

- Query open opportunities with last activity dates
- Detect stalled deals (>5 days no activity)
- Detect declining opportunities (score drops, stage regression)
- Identify inactive leads (no engagement >7 days)
- Identify low probability deals (<30% close probability)
- Call Lovable AI to generate risk assessment and recommended actions via tool calling
- Return structured risk report

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/CEOCopilotPage.tsx` | New — unified 4-tab page |
| `src/hooks/usePipelineRiskReport.ts` | New — calls `ai-pipeline-risk` |
| `supabase/functions/ai-pipeline-risk/index.ts` | New — AI pipeline risk analysis |
| `src/App.tsx` | Modified — add route + import |
| `src/config/nav.v2.ts` | Modified — add nav item |

### Implementation Order

1. Edge function: `ai-pipeline-risk`
2. Hook: `usePipelineRiskReport`
3. Page: `CEOCopilotPage` with 4 tabs + auto-generate
4. Route + nav updates

