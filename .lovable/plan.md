

# Command Center — Nova Página Inicial do FastCRM

## Overview

Replace the current Dashboard (`/dashboard`) with a new Command Center that consolidates AI questioning, Kernel decisions, today's agenda, pipeline risk, and drift alerts into a single intelligent home page.

## Current State

- **Dashboard.tsx** (209 lines): renders Revenue Hero, KPI cards, pipeline, forecast, deals at risk, AI suggestions — classic widget grid
- **CommandCenterPage.tsx** (237 lines): separate page at `/dashboard/command-center` with tabs (Command, Decisions, Approvals, Context OS) — uses `CommandInput`, `CommandOutput`, `QuickCommandGrid`, `KernelDecisionsPanel`, `DriftOverview`
- **All hooks exist**: `useAskFastCRM`, `useSlashCommands`, `useRecentAskQueries`, `useKernelDecisions`, `useKernelActions`, `useDriftScores`, `useRevenueForecast`, `useDailyBrief`
- **All edge functions exist**: `ask-fastcrm`, `daily-revenue-brief`, `kernel-compute-decisions`, `kernel-run-actions`, `kernel-compute-drift`
- **calendar_events** and **tasks** tables exist with full hooks (`useCalendarEvents`, `useTasks`)
- Nav has "Home" → `/dashboard` and "Command Center" → `/dashboard/command-center` as separate items

## Architecture

The new page merges Dashboard + CommandCenterPage into one unified component. No new edge functions or DB tables needed.

```text
┌─────────────────────────────────────────────────────────────┐
│  HEADER — Greeting + date + 3 clickable KPI numbers        │
├─────────────────────────────────────────────────────────────┤
│  AI QUESTION BOX (gradient border, rotating placeholder)   │
│  [AI Response area — slides down when active]              │
├──────────────────────────┬──────────────────────────────────┤
│  LEFT (48%)              │  RIGHT (48%)                     │
│  Kernel Decisions        │  Today (meetings + tasks)        │
│  Drift Alerts            │  Pipeline at Risk                │
└──────────────────────────┴──────────────────────────────────┘
```

## Changes

### 1. New page: `src/pages/CommandCenter.tsx`
Single new component combining:
- **Header**: `getGreeting()` + formatted date + 3 stat chips (revenue today via `useDailyBrief`, hot leads count, pending decisions count via `useKernelDecisions`). Each clickable → navigates to respective module. If value is 0, show alternative metric.
- **AI Box**: Reuse `CommandInput` with enhanced wrapper — rotating placeholder (4s interval), gradient border (`from-indigo-500 to-purple-500`), glow on focus. Response appears inline below via `CommandOutput` with slide-down animation. History via arrow-up (`useRecentAskQueries`).
- **Left column**: 
  - `KernelDecisionsCard` — compact version showing max 3 decisions with urgency color border (red/yellow/blue left border), execute/ignore/details actions. "Ver todas" opens drawer.
  - `DriftAlertsCard` — from `useDriftScores`, shows outdated blocks with progress bar for global Context Score. Hidden if all blocks are current.
- **Right column**:
  - `TodayCard` — meetings from `useCalendarEvents` (today only) + tasks from `useTasks` (due today, max 4). Inline "+ Nova tarefa" button.
  - `PipelineRiskCard` — pipeline decisions from `useKernelDecisions` filtered by type, showing deal name, value, days stalled. "Agir →" opens drawer. Total at risk in footer.
- **Empty states**: New workspace shows welcome message with onboarding CTAs instead of numbers.
- **Loading**: Skeleton loaders per card, AI box always available. Auto-call `daily-revenue-brief` on mount.
- **Staggered fade-in**: Each card with 100ms delay via framer-motion.

### 2. Sub-components (new files in `src/components/command-center/`)
- `CommandCenterHeader.tsx` — greeting + date + 3 stat chips
- `AIQuestionBox.tsx` — enhanced wrapper around CommandInput with rotating placeholder, gradient border, inline response area
- `KernelDecisionsCard.tsx` — compact decisions list (max 3) with actions
- `TodayCard.tsx` — today's meetings + tasks
- `PipelineRiskCard.tsx` — at-risk deals from kernel decisions
- `DriftAlertsCard.tsx` — drift scores summary with progress bar

### 3. Routing changes (`App.tsx`)
- `/dashboard` → render new `CommandCenter` instead of `Dashboard`
- `/dashboard/command-center` → `Navigate` redirect to `/dashboard`
- Remove old Dashboard import

### 4. Navigation changes (`nav.v2.ts`)
- Rename "Home" to "Command Center", change icon to `Zap`
- Remove the separate "Command Center" entry (line with `/dashboard/command-center`)

### 5. Keyboard shortcuts
- `Space` (when not in input) → focus AI question box
- `↑` in AI field → navigate history
- `Esc` → close AI response
- `Cmd+K` → already wired to ActionCommandPalette

## File Summary

| File | Action |
|------|--------|
| `src/pages/CommandCenter.tsx` | New: main page |
| `src/components/command-center/CommandCenterHeader.tsx` | New: header with greeting + stats |
| `src/components/command-center/AIQuestionBox.tsx` | New: enhanced AI input with rotating placeholder |
| `src/components/command-center/KernelDecisionsCard.tsx` | New: compact decisions card |
| `src/components/command-center/TodayCard.tsx` | New: today's meetings + tasks |
| `src/components/command-center/PipelineRiskCard.tsx` | New: pipeline at risk card |
| `src/components/command-center/DriftAlertsCard.tsx` | New: drift alerts with progress |
| `src/App.tsx` | Update routes: `/dashboard` → CommandCenter, redirect old command-center |
| `src/config/nav.v2.ts` | Rename Home → Command Center with Zap icon, remove old CC entry |

No database migrations needed.

