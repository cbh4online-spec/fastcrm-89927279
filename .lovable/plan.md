

# FastCRM 2.0 — Plan Model, Homepage Relaunch, Growth Loops

## Current State Analysis

### Plans (Now)
- **4 plans**: Free / Basic (€29) / Pro (€79) / Agency (€199)
- Stripe products already mapped: `prod_Tn6lMOO7zRREaL` (basic), `prod_Tn6mQSM7DNs1TO` (pro), `prod_Tn6mBblFLd6lD2` (agency)
- Plan limits defined in both `check-subscription` edge function and `SubscriptionContext.tsx`
- `create-checkout` maps plan names to Stripe price IDs: basic → `price_1SpWYGQpSN9dntDnbou09co0`, pro → `price_1SpWYwQpSN9dntDneKmQwHUU`, agency → `price_1SpWZ8QpSN9dntDnMeNvHIVO`

### Landing Page (Now)
- **Narrative**: "Não é apenas um CRM. É a Infraestrutura Digital da Sua Empresa." — ERP/infrastructure positioning
- **Sections**: Problem → Solution (10 modules) → Architecture (5 pillars) → Metrics (tables, policies count) → Pricing (4 plans: Free/Business/Professional/Enterprise — different from internal plan names!) → FastClub → FAQ
- Landing pricing cards are **disconnected** from internal plan logic (landing shows Business €129 + Professional "Personalizado" + Enterprise "Sob Consulta" while code uses basic/pro/agency)
- Solution section lists "10 módulos core" — exactly the "52 modules" vibe we want to eliminate

### Growth Loops (Now)
- `UsageAlertsBanner` exists in billing settings only — no in-product contextual upsell
- `FeatureGate` and `LockedOverlay` exist for feature-gated UI
- No smart banners based on usage patterns
- No extension recommendation based on user behavior

## Plan

### 1. Rename Plans — Starter / Growth / Scale

The internal plan names change from `free/basic/pro/agency` to `starter/growth/scale`. This is a **breaking rename** that touches many files.

**1a. Create new Stripe products and prices**

Using the Stripe tools, create 3 new products with prices:
- **Starter**: €0/month (free tier, no Stripe product needed)
- **Growth**: €49/month
- **Scale**: €149/month

We keep the old Stripe products in `PRODUCT_TO_PLAN` as legacy mappings for existing subscribers.

**1b. Update `SubscriptionContext.tsx`**

- Change `SubscriptionPlan` type to `"starter" | "growth" | "scale"`
- Update `PLAN_INFO` with new names, prices, and features:
  - **Starter** (€0): CRM core (Objects + Inbox), Intelligence basic (health score), Basic automations, 1 pipeline, 1-3 users
  - **Growth** (€49): Multi-pipeline, Stage benchmarks, Advanced automation templates, Marketplace active, Up to 10 users
  - **Scale** (€149): Advanced Intelligence, Advanced automations, API access, Advanced roles, Priority support, Unlimited users
- Update `FEATURE_REQUIRED_PLAN` with new plan names
- Update `PlanLimits` to add: `multi_pipeline`, `marketplace_access`, `api_access`, `advanced_roles`, `priority_support`

**1c. Update `check-subscription` edge function**

- Add new Stripe product IDs to `PRODUCT_TO_PLAN`
- Keep old product IDs mapping to nearest equivalent (basic→growth, pro→scale, agency→scale)
- Update `PLAN_LIMITS` with new plan structure
- Default plan becomes `"starter"` instead of `"free"`

**1d. Update `create-checkout` edge function**

- Update `PLAN_PRICE_MAP` with new price IDs
- Keep old plan names as aliases for backward compatibility

**1e. Update `src/types/saas.ts`**

- Change `SubscriptionPlan` to `"starter" | "growth" | "scale"`
- Update `PLAN_DISPLAY_INFO` with new plan details

**1f. Grep and update all references**

Files that reference `"free" | "basic" | "pro" | "agency"` or `SubscriptionPlan`:
- `src/components/subscription/FeatureGate.tsx` — update suggested plan logic
- `src/components/subscription/PricingCards.tsx` — update plan display
- `src/config/extensionPacks.ts` — update `PlanTier` type
- `src/components/saas/CurrentPlanOverview.tsx` — plan badge colors
- `src/components/saas/UsageDashboard.tsx`
- `src/components/settings/sections/BillingSettings.tsx`
- `src/components/onboarding/ConversationalOnboarding.tsx`

### 2. Extension Pricing — Bundles with Discount

**2a. Update `extensionPacks.ts`**

Add pricing metadata to `ONBOARDING_BUNDLES`:

```typescript
export interface OnboardingBundle {
  // ...existing fields
  pricing: {
    individual_total: number;  // sum of individual extension prices
    bundle_price: number;      // discounted bundle price
    discount_percent: number;
  };
}
```

Extension individual prices (metadata only for now — no Stripe billing yet):
- Proposals Pack: €19/month
- Finance Pack: €19/month  
- B2B Revenue Pack: €29/month
- Advanced Intelligence Pack: €29/month

Bundle discounts:
- Startup Bundle (Proposals): €19 (no discount, single extension)
- SMB Bundle (Proposals + Finance): €29 (vs €38, ~24% off)
- B2B Bundle (Proposals + Finance + B2B Revenue): €49 (vs €67, ~27% off)

**2b. Update `marketplace_modules` seed data**

Add `price_monthly` to the marketplace_modules rows for each extension (using insert tool, not migration).

### 3. Homepage Relaunch 2.0

Complete rewrite of the landing page narrative from "infrastructure digital" to "AI-Native Revenue CRM."

**3a. Rewrite `LandingHeroSection.tsx`**

New hero copy:
- Badge: "AI-Native Revenue CRM"
- H1: "Build your CRM. Grow your revenue."
- Subtitle: "FastCRM adapts to your business from day one. Simple core, smart extensions, revenue intelligence built in."
- CTA: "Start Free" / "See how it works"
- Dashboard mockup stays but update labels to English-first

**3b. Rewrite `LandingProblemSection.tsx`**

New angle — not "fragmented tools" but "CRM that doesn't grow with you":
- "Your CRM shouldn't be a spreadsheet upgrade"
- 3-4 pain points focused on revenue loss, not tool fragmentation

**3c. Rewrite `LandingSolutionSection.tsx`**

Replace "10 módulos core" with 4 capability pillars (not modules):
1. **Flexible Object-Based CRM** — Contacts, Companies, Deals as flexible objects
2. **Revenue Intelligence Built In** — Health scores, stage benchmarks, deal insights
3. **Automations That Scale** — Templates, triggers, smart suggestions
4. **Extend with Marketplace Apps** — Official extensions, bundles, one-click activation

**3d. Rewrite `LandingArchitectureSection.tsx`**

Remove technical pillars (RLS, multi-tenant, etc.). Replace with:
- "Built for Founders and Sales Teams"
- 3 personas: Solo founder, Sales team (5-10), Scaling company
- Each with a brief value prop

**3e. Remove `LandingMetricsSection.tsx`**

The "404 tables, 1177 RLS policies" section is developer-facing — remove entirely from the landing page flow.

**3f. Rewrite `LandingPricingSection.tsx`**

Replace 4-plan grid with clean 3-plan layout (Starter / Growth / Scale):
- Remove "Custo da inação" pain points block
- Remove "Porque não publicamos todos os valores?" section
- Clean, transparent pricing with feature comparison
- Starter: €0 — "For getting started"
- Growth: €49/mo — "For growing teams" (highlighted)
- Scale: €149/mo — "For scaling companies"
- Below plans: "Extend with bundles" section showing 3 bundle cards with prices

**3g. Rewrite `LandingPositioningSection.tsx`**

Keep the "Not for everyone" angle but reframe for revenue-focused teams:
- Founders building their first sales process
- Sales teams ready to move beyond spreadsheets
- Companies scaling revenue operations

**3h. Keep `LandingFastClubSection.tsx`** — no changes needed

**3i. Rewrite `LandingFinalCTA.tsx`**

- "Ready to grow your revenue?" 
- "Start free. No credit card required."

**3j. Update `LandingStickyHeader.tsx`**

New nav links matching new sections:
- Features / Intelligence / Pricing / FAQ / FastClub

**3k. Update `LandingFAQSection.tsx`**

Rewrite FAQs to match new positioning — remove technical questions, add:
- "What's included in the free plan?"
- "How do extensions work?"
- "Can I switch plans anytime?"
- "What's the difference between extensions and bundles?"

**3l. Update `FastCRMLanding.tsx`**

Remove `LandingMetricsSection` from the section order.

### 4. In-Product Growth Loops

**4a. Create `SmartUpgradeBanner.tsx`**

A new component that renders contextual upgrade prompts based on usage patterns:

```typescript
interface SmartUpgradeBannerProps {
  context: "pipeline" | "intelligence" | "marketplace" | "automations";
}
```

Logic:
- **Pipeline context**: If user has 1 pipeline and tries to create another → "Upgrade to Growth for multi-pipeline"
- **Intelligence context**: If user views intelligence panel on Starter → "Upgrade to Growth for stage benchmarks"
- **Marketplace context**: If user browses extensions on Starter → "Upgrade to Growth to activate extensions"
- **Automations context**: If user hits automation limit → "Upgrade for more automations"

Styling: Subtle gradient banner (amber/blue), dismiss-able, with "Upgrade" CTA.

**4b. Create `ExtensionInsightBanner.tsx`**

Shows contextual extension recommendations based on deal data:

- If 3+ deals in "Proposal" stage and Proposals Pack not installed → "3 deals in Proposal stage. Activate Proposals Pack?"
- If any overdue invoice and Finance Pack not installed → "You have overdue payments. Activate Finance Pack?"

Renders inside relevant pages (pipeline view, deal detail).

**4c. Integrate banners into existing pages**

- `src/pages/PipelinePage.tsx` or equivalent — add `SmartUpgradeBanner` with context="pipeline"
- `src/components/intelligence/DealIntelligencePanel.tsx` — add `SmartUpgradeBanner` with context="intelligence" for Starter users
- `src/pages/Marketplace.tsx` — add `SmartUpgradeBanner` with context="marketplace" for Starter users
- Pipeline/Kanban view — add `ExtensionInsightBanner` when conditions are met

### 5. Update `LandingFooter.tsx`

Update tagline from "Infraestrutura Digital Empresarial" to "AI-Native Revenue CRM"

## Files Summary

| File | Action |
|---|---|
| Stripe products/prices | **Create** — Growth (€49/mo) and Scale (€149/mo) products via Stripe tools |
| `src/contexts/SubscriptionContext.tsx` | **Edit** — rename plans to starter/growth/scale, update limits |
| `supabase/functions/check-subscription/index.ts` | **Edit** — add new product mappings, keep legacy |
| `supabase/functions/create-checkout/index.ts` | **Edit** — update price map |
| `src/types/saas.ts` | **Edit** — rename plan type + display info |
| `src/config/extensionPacks.ts` | **Edit** — add bundle pricing metadata |
| `src/components/subscription/FeatureGate.tsx` | **Edit** — update plan references |
| `src/components/landing-fastcrm/LandingHeroSection.tsx` | **Rewrite** — new narrative |
| `src/components/landing-fastcrm/LandingProblemSection.tsx` | **Rewrite** — new angle |
| `src/components/landing-fastcrm/LandingSolutionSection.tsx` | **Rewrite** — 4 pillars not 10 modules |
| `src/components/landing-fastcrm/LandingArchitectureSection.tsx` | **Rewrite** — personas not tech pillars |
| `src/components/landing-fastcrm/LandingPricingSection.tsx` | **Rewrite** — 3 clean plans + bundles |
| `src/components/landing-fastcrm/LandingPositioningSection.tsx` | **Rewrite** — revenue-focused |
| `src/components/landing-fastcrm/LandingFinalCTA.tsx` | **Rewrite** — new copy |
| `src/components/landing-fastcrm/LandingStickyHeader.tsx` | **Edit** — new nav links |
| `src/components/landing-fastcrm/LandingFAQSection.tsx` | **Rewrite** — new questions |
| `src/components/landing-fastcrm/LandingFooter.tsx` | **Edit** — new tagline |
| `src/pages/FastCRMLanding.tsx` | **Edit** — remove MetricsSection |
| `src/components/growth/SmartUpgradeBanner.tsx` | **Create** — contextual upgrade prompts |
| `src/components/growth/ExtensionInsightBanner.tsx` | **Create** — extension recommendations |
| `src/components/saas/CurrentPlanOverview.tsx` | **Edit** — new plan names/colors |
| `src/components/subscription/PricingCards.tsx` | **Edit** — 3 plans |

## Technical Details

- **Stripe backward compatibility**: Old product IDs stay in `PRODUCT_TO_PLAN` mapping to their nearest new equivalent. Existing subscribers keep working. New subscribers use new prices.
- **Plan name migration**: The `workspace_subscriptions` table stores plan names. Existing rows with `basic/pro/agency` will be mapped on read by the `check-subscription` function (basic→growth, pro→scale, agency→scale). No database migration needed.
- **Extension billing is metadata-only**: Bundle prices shown in UI but no Stripe checkout for extensions yet. The "Activate" button uses the existing provisioner. Real billing for extensions is a future sprint.
- **Growth banners are dismiss-able**: Store dismissals in `localStorage` with a 7-day cooldown to avoid annoyance.
- **Landing page language**: The spec uses English copy ("Build your CRM. Grow your revenue."). The implementation will use this English-first approach since the product targets an international market. Portuguese variants can be added later via i18n.

