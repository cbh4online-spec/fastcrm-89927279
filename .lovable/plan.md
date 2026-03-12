

# Phase 5B — Command Center COMPLETO

## Gap Analysis: Current vs Spec

The current Command Center has 4 cards (Decisions, Drift, Today, Pipeline Risk). The complete spec adds 3 more sections and enhances existing ones significantly.

**Already implemented (needs enhancement):**
- Header with greeting + 3 KPIs — needs larger font (32px), labels below
- AI Question Box — needs slash command suggestions row below input
- Kernel Decisions — needs "Ver evidências" expand, slide-left on resolve
- Today Card — needs "+ Nova tarefa" button, "Entrar →" meeting links
- Pipeline Risk — needs total at risk footer, drawer on "Agir →"
- Drift Alerts — needs "Rever →" links to Context OS blocks

**New sections to build:**
1. **Ações do Dia** (Kernel Actions Log) — left column, below Decisions. Shows today's `kernel_action_runs` with status icons, timestamps, retry button for failures. Uses existing `useKernelActions` hook.
2. **Kernel Live Feed** — left column, bottom. Three sub-sections:
   - Change Events (last 5 from `useChangeEvents` with realtime)
   - Entity Activity (top 3 entities from `useKernelEntities`)
   - Impact Score (top 2 from `useImpactMapData`)
3. **Brief Executivo** — right column, below Pipeline Risk. Preview of latest `strategic_briefs` via `useStrategicBriefs`, with "Ler completo →" and "Gerar novo →" buttons.

**Enhanced Command Palette (⌘K):**
- Already exists (`ActionCommandPalette`). Spec wants CRM entity search + Kernel section + keyboard shortcut hints. Enhancement, not rebuild.

**Spotlight (Space key):**
- Opens AI Question Box as a modal from any page. New global component.

## Implementation Plan — 3 Sub-phases

Given the scope, I recommend splitting into 3 batches:

### Batch 1: New Cards (Ações do Dia + Kernel Live Feed + Brief Executivo)
| File | Action |
|------|--------|
| `src/components/command-center/KernelActionsCard.tsx` | New: today's action runs feed |
| `src/components/command-center/KernelLiveFeedCard.tsx` | New: change events + entity activity + impact score |
| `src/components/command-center/StrategicBriefCard.tsx` | New: brief preview with generate button |
| `src/pages/CommandCenter.tsx` | Add 3 new cards to layout |

### Batch 2: Enhance Existing Cards
| File | Action |
|------|--------|
| `src/components/command-center/CommandCenterHeader.tsx` | Larger numbers (text-3xl), labels below, user name |
| `src/components/command-center/AIQuestionBox.tsx` | Add slash command suggestion chips below input |
| `src/components/command-center/KernelDecisionsCard.tsx` | Add "Ver evidências" expand, slide-left animation on resolve |
| `src/components/command-center/TodayCard.tsx` | Add "+ Nova tarefa" inline button, meeting "Entrar →" links |
| `src/components/command-center/PipelineRiskCard.tsx` | Add total at risk footer |
| `src/components/command-center/DriftAlertsCard.tsx` | Add "Rever →" and "Ver Context OS →" links |

### Batch 3: Spotlight Modal + Command Palette Enhancement
| File | Action |
|------|--------|
| `src/components/command-center/SpotlightModal.tsx` | New: AI question box as modal, triggered by Space key globally |
| `src/components/command-center/ActionCommandPalette.tsx` | Enhance: add CRM entity search, Kernel section, shortcut hints |
| `src/components/layout/DashboardLayout.tsx` | Wire Space key listener + Spotlight |

### Realtime subscriptions needed
- `change_events` table for Kernel Live Feed auto-update
- `kernel_action_runs` for Ações do Dia auto-update
- Already have `kernel_decisions` and `conversations`

No database migrations needed. All hooks, edge functions, and tables already exist.

**Shall I start with Batch 1?**

