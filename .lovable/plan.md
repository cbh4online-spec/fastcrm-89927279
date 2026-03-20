

## Sistema de Propostas de Melhoria — Plano de Implementacao

### Arquitectura

```text
VerticalStatsTab.tsx                    (add "Propor Melhorias" button + Sheet trigger)
└── stats/OptimizationDrawer.tsx        (NEW — right-side Sheet with 3 sections)
    ├── FunnelHealthScore              (circular score 0-100, inline)
    ├── ImprovementCard                (priority cards with checklists, inline)
    └── ABTestSuggestion               (test cards, inline)
stats/statsHelpers.ts                   (add health score + improvement generation logic)
```

### Ficheiros a criar

**1. `src/components/funnels/stats/OptimizationDrawer.tsx`** (~450 lines)

Right-side Sheet (420px) with 3 sections:

- **Diagnostico Atual**: Circular SVG score (0-100) computed from conversion rate vs benchmark (40%), bounce rate (30%), traffic diversity (15%), mobile compatibility (15%). Color bands: red 0-40, amber 41-70, green 71-100. Summary badges: "Criticos X | A Melhorar Y | Bom Z"

- **Propostas de Melhoria**: Auto-generated cards based on data conditions. Each card has: priority badge (CRITICO/IMPORTANTE/SUGERIDO), impact estimate bar, effort badge, title, explanation, checkable action items (local state), "Implementar agora" CTA. Conditions engine:
  - bounce_rate > 80% → landing page retention card
  - conversion_rate < benchmark * 0.5 → below benchmark card
  - source with visits > 30 and conversions = 0 → tracking problem card
  - mobile traffic > 50% and mobile conv < desktop * 0.5 → mobile experience card
  - single source > 70% traffic → traffic diversity card
  - no section_view events → scroll tracking inactive card

- **Testes A/B Sugeridos**: 2-3 auto-suggested tests with hypothesis, variant A/B, metric to watch. "Criar Teste" button (disabled with "Em breve" badge). Tests are contextual based on data.

- **Historico** (collapsible at bottom): LocalStorage-persisted list of dismissed/implemented suggestions with date badges. Mark as "Implementado" or "Ignorar".

- **Notification dot**: Red dot on button when critical issues exist (computed from improvement cards with CRITICO priority).

Props: receives all computed stats data (bounceRate, conversionRate, sources, devices, sections, events).

### Ficheiros a alterar

**2. `src/components/funnels/stats/statsHelpers.ts`**
- Add `computeFunnelHealthScore(convRate, bounceRate, sources, devices): { score, criticals, improvements, good }`
- Add `ImprovementCard` interface and `generateImprovementCards(...)` function
- Add `ABTestSuggestion` interface and `generateABTests(...)` function

**3. `src/components/funnels/vertical-tabs/VerticalStatsTab.tsx`**
- Import `OptimizationDrawer` and Sheet components
- Add amber "Propor Melhorias" button next to "Exportar" with notification dot
- Sheet state management (open/close)
- Pass computed data to drawer

### Design
- Uses existing Sheet component (right side)
- Amber accent (#F5A623) for button and accents
- Dark cards with border-white/[0.08]
- Circular score via SVG circle with stroke-dasharray
- Checklists use local state (no DB persistence for MVP)
- History persisted in localStorage keyed by templateSlug

