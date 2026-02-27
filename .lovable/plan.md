

# Redesign Landing Page FastCRM — Fase 2

The previous redesign updated 8 files but 4 sections were left with the old typography style. Additionally, the already-updated sections can be pushed further to match the robertocortez.pt aesthetic.

## Changes needed

### 1. `LandingArchitectureSection.tsx` — Apply uppercase bold style
- Add label badge "Built For" above headline
- Change `font-bold` → `font-black uppercase tracking-tight`
- Add hover effects on cards matching other sections

### 2. `LandingPricingSection.tsx` — Stronger typography
- Change headline to `font-black uppercase tracking-tight`
- Add label badge "Pricing" above title
- Make CTA buttons uppercase with tracking

### 3. `LandingFastClubSection.tsx` — Consistent style
- Change `font-bold` → `font-black uppercase tracking-tight` on headline
- Make card titles and CTA button uppercase bold
- Add tracking to button text

### 4. `LandingFAQSection.tsx` — Typography alignment
- Change `font-bold` → `font-black uppercase tracking-tight` on headline
- Add label badge "FAQ" above title

### 5. `LandingHeroSection.tsx` — Add name field to form
- Add a "Your name" input before the email field (plan specified "nome + email + botão")
- Pass name as query param to /auth

### 6. `LandingProblemSection.tsx` — Stronger card hover effects
- Add `hover:bg-[hsl(222,47%,8%)]` and scale on hover for more impact

## Files to modify
1. `src/components/landing-fastcrm/LandingArchitectureSection.tsx`
2. `src/components/landing-fastcrm/LandingPricingSection.tsx`
3. `src/components/landing-fastcrm/LandingFastClubSection.tsx`
4. `src/components/landing-fastcrm/LandingFAQSection.tsx`
5. `src/components/landing-fastcrm/LandingHeroSection.tsx`
6. `src/components/landing-fastcrm/LandingProblemSection.tsx`

