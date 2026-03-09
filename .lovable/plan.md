

# Command Center — `/command-center`

## What exists today

The platform already has a robust AI chat at `/dashboard` powered by `ask-fastcrm` (2900-line edge function) with keyword-based intent routing, slash commands, conversation memory, and action execution. However, it lacks the **deep contextual command types** requested (prepare-meeting, analyze-company, win-deal, etc.) that require cross-entity data aggregation and AI synthesis.

## What will be built

### 1. Edge Function: `ai-command-orchestrator`

A new edge function that handles 7 structured command types. For each command, it:
- Identifies the command intent from natural language
- Fetches deep CRM context (companies, contacts, opportunities, meetings, emails, notes, proposals, activity_logs)
- Calls Lovable AI (Gemini 3 Flash) with full context to generate strategic analysis
- Returns structured output via tool calling

**Command handlers:**

| Command | Data fetched | AI output |
|---------|-------------|-----------|
| `prepare-meeting` | Company profile, deal status, recent interactions, contact history | Talking points, company summary, risk signals |
| `analyze-company` | Company data, ICP score, revenue potential, deal history | Profile analysis, ICP fit, growth assessment |
| `analyze-deal` | Deal details, stage history, activities, stakeholders | Health assessment, risk signals, next actions |
| `win-deal` | Deal data, competitor mentions, stakeholder map | Closing probability, blockers, recommended strategy |
| `send-followup` | Last interactions, deal context, contact preferences | Follow-up draft, timing recommendation |
| `generate-proposal` | Company needs, deal value, offers catalog | Proposal outline, pricing suggestions |
| `pipeline-status` | All open deals, stage distribution, velocity | Pipeline health, bottlenecks, forecast |

### 2. Page: `/command-center` (`CommandCenterPage.tsx`)

Layout:
- **Top**: Large AI command input with auto-complete for the 7 commands
- **Middle**: AI response area with markdown rendering, structured data cards, and entity links
- **Bottom**: Quick action buttons (contextual based on last response)
- **Sidebar suggestion chips**: The 7 command types as clickable cards when idle

### 3. Hook: `useCommandOrchestrator.ts`

- Sends commands to `ai-command-orchestrator`
- Manages conversation state and loading
- Handles action execution (navigate, create task, etc.)

### 4. Components (`src/components/command-center-v2/`)

- `CommandHero.tsx` — Full-width command input with gradient border and command suggestions
- `CommandResponseCard.tsx` — Renders AI response with sections (summary, data points, actions)
- `CommandQuickActions.tsx` — Contextual action buttons based on command type
- `CommandSuggestionGrid.tsx` — Grid of 7 command type cards shown when idle

### 5. Route + Nav

- Add `/command-center` route in `App.tsx`
- Add "Command Center" nav item in `nav.v1.ts`

## Implementation order

1. Edge function: `ai-command-orchestrator` with all 7 command handlers
2. Hook: `useCommandOrchestrator`
3. Components: CommandHero, CommandResponseCard, CommandQuickActions, CommandSuggestionGrid
4. Page: `CommandCenterPage.tsx`
5. Route + nav updates

## Files

- **New**: `supabase/functions/ai-command-orchestrator/index.ts`
- **New**: `src/hooks/useCommandOrchestrator.ts`
- **New**: `src/components/command-center-v2/` (4 components)
- **New**: `src/pages/CommandCenterPage.tsx`
- **Modified**: `src/App.tsx`, `src/config/nav.v1.ts`, `supabase/config.toml`

