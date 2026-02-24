

# Onboarding Inteligente v2 — Bundles, Provisioning Data-Driven, Primeiro Dashboard Personalizado

## Current State

- **ConversationalOnboarding.tsx** already implements 7 conversational steps (business_type → revenue_model → team_size → sales_complexity → success → process → channels → generating → preview → applying → extensions → done)
- **ai-onboarding-setup** edge function generates CRM config via LLM (pipeline, fields, forms, automations, KPIs)
- **ApplyingStep** provisions pipeline, stages, custom fields, forms, and saves answers to `workspace_onboarding`
- **ExtensionSuggestions** shows individual packs based on business type via `getRecommendedPacks()` — but has no bundle concept, no segment profiling, no provisioner integration
- **extension-provisioner** edge function handles enable/disable with feature flags and audit logs
- **`workspace_onboarding`** table stores: business_type, custom_business_type, channels, success_definition, process_description, skipped, completed_at — but NOT revenue_model, team_size, sales_complexity, or computed segment/profile
- **`extensionPacks.ts`** has pack definitions + `BUSINESS_TO_PACKS` mapping but no bundle/segment logic
- **Post-onboarding**: redirects to generic `/dashboard` — no first-dashboard personalization

### What's Missing

1. **No segment profiling** — answers aren't mapped to Startup/SMB/B2B segments
2. **No bundle recommendations** — only individual packs, no curated bundles per segment
3. **No bundle activation** — clicking "Install" on ExtensionSuggestions doesn't use the provisioner
4. **No revenue_model/team_size/sales_complexity persistence** — these fields don't exist in `workspace_onboarding`
5. **No onboarding analytics** — no telemetry for completion rates, bundle activation, time-to-first-deal
6. **No personalized first dashboard** — post-onboarding always shows the same view
7. **Objective "principal"** step is missing from the conversation flow

## Plan

### 1. Database Migration — Extend `workspace_onboarding` with segment data

Add columns to persist the new answers and the computed segment:

```sql
ALTER TABLE public.workspace_onboarding
  ADD COLUMN IF NOT EXISTS revenue_model text,
  ADD COLUMN IF NOT EXISTS team_size text,
  ADD COLUMN IF NOT EXISTS sales_complexity text,
  ADD COLUMN IF NOT EXISTS primary_objective text,
  ADD COLUMN IF NOT EXISTS computed_segment text,
  ADD COLUMN IF NOT EXISTS activated_bundle text,
  ADD COLUMN IF NOT EXISTS onboarding_duration_ms integer;
```

No new tables. The spec mentions `onboarding_profiles`, `onboarding_templates`, `onboarding_bundle_recommendations` — but these are unnecessary given we already have `workspace_onboarding` + config-driven logic. Keeping it lean.

### 2. Add Segment Profiling Logic

**Create: `src/config/onboardingSegments.ts`**

Data-driven segment profiles with bundle + CRM config mappings:

```typescript
export type OnboardingSegment = "startup_saas" | "smb_traditional" | "b2b_complex" | "generic";

export interface SegmentProfile {
  id: OnboardingSegment;
  label: string;
  description: string;
  bundleId: string;
  bundleModules: string[];  // module slugs to activate
  pipelineHints: { stageCount: number; complexity: string };
  intelligenceDefaults: { enableBenchmarks: boolean; enableForecast: boolean };
}
```

Segment resolution function: maps `(businessType, revenueModel, teamSize, salesComplexity)` → segment via weighted scoring:
- SaaS + subscription + any team → `startup_saas`
- Services/retail/consulting + one-time/project + solo/2-5 → `smb_traditional`
- B2B/consulting + complex + 6+ team → `b2b_complex`
- Fallback → `generic`

### 3. Create Bundle Definitions

**Edit: `src/config/extensionPacks.ts`**

Add `ONBOARDING_BUNDLES` alongside existing `EXTENSION_PACKS`:

```typescript
export interface OnboardingBundle {
  id: string;
  name: string;
  description: string;
  icon: string;
  segments: OnboardingSegment[];
  modules: string[];  // module slugs
  highlights: string[];  // 3 bullet points
}

export const ONBOARDING_BUNDLES: OnboardingBundle[] = [
  {
    id: "startup-growth",
    name: "Startup Growth Bundle",
    segments: ["startup_saas"],
    modules: ["proposals"],
    highlights: [
      "Propostas comerciais integradas",
      "Intelligence scoring avançado",
      "Templates de follow-up automático",
    ],
  },
  {
    id: "smb-revenue",
    name: "SMB Revenue Bundle",
    segments: ["smb_traditional"],
    modules: ["proposals", "invoices"],
    highlights: [
      "Propostas e faturação integradas",
      "Alertas de faturas vencidas",
      "Pipeline otimizado para ciclos curtos",
    ],
  },
  {
    id: "b2b-revenue",
    name: "B2B Revenue Bundle",
    segments: ["b2b_complex"],
    modules: ["proposals", "invoices", "b2b-portal"],
    highlights: [
      "Encomendas com aprovações",
      "Forecast benchmarks avançados",
      "Pipeline para vendas complexas",
    ],
  },
];
```

### 4. Add Step 4 — Primary Objective

**Edit: `src/components/onboarding/ConversationalOnboarding.tsx`**

Add a new `ConvoStep: "objective"` between `sales_complexity` and `success`.

Options:
- "Organizar pipeline" → `organize_pipeline`
- "Melhorar forecast" → `improve_forecast`
- "Automatizar follow-ups" → `automate_followups`
- "Gerir propostas/faturas" → `manage_docs`

After the user answers, the assistant shows a transition message with the detected segment: `"Entendido! Parece que tens um perfil de [Startup SaaS / SMB / B2B Complexo]. Vou adaptar tudo para ti."` — then continues to the `success` step.

### 5. Update ConversationalOnboarding — Bundle Activation Step

**Edit: `src/components/onboarding/ConversationalOnboarding.tsx`**

Replace the current `ExtensionSuggestions` screen (step `"extensions"`) with an inline bundle recommendation:

- After `applying` completes, show a new assistant message: `"Baseado nas tuas respostas, recomendo o **{Bundle Name}** para o teu negócio."`
- Show 3 bullet highlights from the bundle
- Two buttons: **"Ativar agora"** / **"Saltar"**
- "Ativar agora" calls `installModule(slug)` from `useWorkspaceModules` for each module in the bundle — sequentially, showing progress
- After activation, show success message + transition to done

### 6. Update `ApplyingStep` — Persist New Fields + Segment

**Edit: `src/components/onboarding/steps/ApplyingStep.tsx`**

- Extend `OnboardingAnswers` interface to include `revenueModel`, `teamSize`, `salesComplexity`, `primaryObjective`
- Compute segment using the profiling function from step 2
- Save all new fields + `computed_segment` to `workspace_onboarding`
- Track `onboarding_duration_ms` (start time captured in ConversationalOnboarding, passed as prop)

### 7. Update `ai-onboarding-setup` — Use Objective for Better Config

**Edit: `supabase/functions/ai-onboarding-setup/index.ts`**

- Accept `primaryObjective` in the input
- Add it to the user prompt: `"Objetivo principal: Organizar pipeline"`
- This helps the LLM generate more relevant automations and KPIs

### 8. Personalized First Dashboard

**Edit: `src/components/onboarding/ConversationalOnboarding.tsx`** (done step)

After onboarding completes, navigate to `/dashboard` with a query param `?onboarding=complete&segment={segment}`.

**Edit: `src/pages/Dashboard.tsx`** (or equivalent)

- Detect the `onboarding=complete` query param
- Show a one-time "Welcome" overlay/banner with:
  - Revenue forecast widget (if data exists) or placeholder
  - Pipeline health summary
  - 1 contextual insight based on segment (e.g., "Start by creating your first deal")
  - Suggested action button ("Create first deal" / "Import contacts")
  - If bundle was activated: show a "Bundle Active" badge
- Use `localStorage` or `workspace_onboarding.completed_at` to show this only once

### 9. Onboarding Telemetry

**Edit: `src/hooks/useCRMAnalytics.ts`**

Add 4 tracking functions:

- `trackOnboardingStepCompleted(step, duration_ms)` — fired at each step transition
- `trackOnboardingCompleted(segment, duration_ms, bundle_activated)` — fired at completion
- `trackOnboardingSkipped(last_step)` — fired on skip
- `trackBundleActivated(bundle_id, modules_count)` — fired when bundle is activated

### 10. Timing + Progress Bar

**Edit: `src/components/onboarding/ConversationalOnboarding.tsx`**

- Add a subtle progress indicator in the header (thin bar, not numbered steps)
- Track start time with `useRef(Date.now())` to compute duration
- Progress: business_type=15%, revenue_model=30%, team_size=45%, objective=55%, success=65%, process=75%, channels=85%, generating=90%, preview=95%, done=100%

## Files Summary

| File | Action |
|---|---|
| Database migration | **Create** — add 7 columns to `workspace_onboarding` |
| `src/config/onboardingSegments.ts` | **Create** — segment profiling logic + types |
| `src/config/extensionPacks.ts` | **Edit** — add `ONBOARDING_BUNDLES` + `OnboardingBundle` type |
| `src/components/onboarding/ConversationalOnboarding.tsx` | **Edit** — add objective step, bundle activation, progress bar, timing |
| `src/components/onboarding/steps/ApplyingStep.tsx` | **Edit** — persist new fields + computed segment |
| `supabase/functions/ai-onboarding-setup/index.ts` | **Edit** — accept primaryObjective in prompt |
| `src/hooks/useCRMAnalytics.ts` | **Edit** — add 4 onboarding telemetry functions |
| `src/pages/Dashboard.tsx` | **Edit** — detect onboarding completion, show welcome state |

## Technical Details

- **No new tables** — all data stored in existing `workspace_onboarding` with new columns (defaults null, backward compatible)
- **Segment computation is deterministic** — pure function mapping 4 answers to 1 of 4 segments, no LLM needed
- **Bundle activation reuses `useWorkspaceModules.installModule()`** which calls the existing `extension-provisioner` edge function — full audit trail, feature flags, and idempotency already handled
- **Progress bar is cosmetic** — calculated from step position, not actual completion percentage
- **First dashboard personalization is additive** — regular dashboard continues to work; the welcome state is a one-time overlay gated by query param + `completed_at` check
- **Total onboarding stays at 5-6 interaction steps** (business_type, revenue_model, team_size, objective, success+process combined, channels) — well under 60 seconds target
- **The `success` and `process` free-text steps are the only ones requiring typing** — everything else is quick-reply taps

