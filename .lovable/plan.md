

# B2B-Intelligence — Kernel V2 Stabilization

## Current State

| Area | File(s) | Kernel Events | Logging |
|------|---------|---------------|---------|
| Growth Insights (hook) | `useGrowthInsights.ts` | None | `console.error` only |
| AI Growth Analysis (edge fn) | `ai-growth-insights/index.ts` | None | `console.error` only |
| Cart Recommendations (hook) | `useAIRecommendations.ts` | None | `console.error` only |
| Cart Recommendations (edge fn) | `ai-cart-recommendations/index.ts` | None | Minimal |
| Protocol Recommendations (hook) | `useAIRecommendations.ts` | None | `console.error` only |
| Protocol Recommendations (edge fn) | `ai-protocol-recommendations/index.ts` | None | Minimal |
| Growth Insights Services | `services/growth-insights/*.ts` | None | None |
| Smoke Tests | `system-run-smoke-tests` | — | No b2b-intelligence checks |

Zero kernel events. No standardized logging. The module spans: growth insights (rankings, need matching, lifecycle), AI-powered growth analysis, cart recommendations, and protocol recommendations.

## Implementation Plan

### A) Kernel Events (source: `b2b-intelligence`)

**`useGrowthInsights.ts`:**
1. After `fetchAIAnalysis` succeeds → emit `B2B.INSIGHT_GENERATED` (entity_kind: `growth_analysis`, payload: `confidence_level`, `insights_count`, `recommendations_count`)

**`useAIRecommendations.ts`:**
2. Not mutation-based (useQuery) — no event emission. Logging only.

### B) Logging (prefix: `[B2B-INTELLIGENCE]`)

**`useGrowthInsights.ts`:**
- `fetchData` error → `console.warn('[B2B-INTELLIGENCE] GROWTH_DATA_FAILED')`
- `fetchAIAnalysis` success → `console.log('[B2B-INTELLIGENCE] INSIGHT_GENERATED')`
- `fetchAIAnalysis` error → `console.error('[B2B-INTELLIGENCE] AI_ANALYSIS_FAILED')`

**`useAIRecommendations.ts`:**
- Protocol recommendations error → `console.warn('[B2B-INTELLIGENCE] PROTOCOL_RECS_FAILED')`
- Cart recommendations error → `console.warn('[B2B-INTELLIGENCE] CART_RECS_FAILED')`

**`ai-growth-insights/index.ts`:**
- Align existing `console.error` to `[B2B-INTELLIGENCE]` prefix
- Add success log with evidence: `console.log('[B2B-INTELLIGENCE] INSIGHT_GENERATED confidence=... insights=... recommendations=...')`

**`ai-cart-recommendations/index.ts`:**
- Add `[B2B-INTELLIGENCE]` prefix to error logs

**`ai-protocol-recommendations/index.ts`:**
- Add `[B2B-INTELLIGENCE]` prefix to error logs

### C) Smoke Tests

Add to `system-run-smoke-tests`:
- No dedicated b2b-intelligence tables exist (insights are computed on-the-fly from `contacts`, `opportunities`, `products`). Skip smoke additions — the underlying tables are already covered by other modules.

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useGrowthInsights.ts` | Import `emitKernelEvent`; emit `B2B.INSIGHT_GENERATED` on AI analysis success; add `[B2B-INTELLIGENCE]` logging |
| `src/hooks/client-portal/useAIRecommendations.ts` | Add `[B2B-INTELLIGENCE]` error logging |
| `supabase/functions/ai-growth-insights/index.ts` | Add `[B2B-INTELLIGENCE]` prefix + evidence logging on success |
| `supabase/functions/ai-cart-recommendations/index.ts` | Add `[B2B-INTELLIGENCE]` prefix to error logs |
| `supabase/functions/ai-protocol-recommendations/index.ts` | Add `[B2B-INTELLIGENCE]` prefix to error logs |

