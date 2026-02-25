

# Call Intelligence Settings Page

## Overview

Create a dedicated "Call Intelligence" settings page inspired by the Attio screenshot, with significant improvements. This will be a new settings category in the workspace navigation that manages call recording preferences, AI-powered transcription/summarization, and insights templates -- going well beyond Attio's basic auto-record toggle.

## Reference Analysis (Attio Screenshot)

The screenshot shows:
- A "Call intelligence" nav item under Personal settings
- Auto-record meetings with radio card selection (External meetings / None)
- Default insights template dropdown

## Improvements Over Attio

1. **Auto-record mode**: 3 options instead of 2 (All meetings, External only, None)
2. **AI Transcription settings**: Language selection, auto-transcription toggle
3. **AI Summary**: Toggle to auto-generate meeting summaries with model selection
4. **Recording consent**: Toggle to notify participants about recording
5. **CRM auto-linking**: Auto-associate recordings with deals/contacts
6. **Insights templates**: Manage templates (not just select from dropdown)
7. **Storage & retention**: Configure how long recordings are kept

## Database Changes

New table `workspace_call_intelligence_config` (1 row per workspace):

```sql
CREATE TABLE public.workspace_call_intelligence_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  auto_record_mode TEXT NOT NULL DEFAULT 'none',        -- 'all', 'external', 'none'
  transcription_enabled BOOLEAN NOT NULL DEFAULT true,
  transcription_language TEXT NOT NULL DEFAULT 'pt',     -- ISO 639-1
  ai_summary_enabled BOOLEAN NOT NULL DEFAULT true,
  consent_notification BOOLEAN NOT NULL DEFAULT true,
  crm_auto_link BOOLEAN NOT NULL DEFAULT true,
  retention_days INTEGER NOT NULL DEFAULT 90,
  default_insights_template TEXT DEFAULT NULL,           -- template name/id
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_call_intel_unique UNIQUE (workspace_id)
);

ALTER TABLE public.workspace_call_intelligence_config ENABLE ROW LEVEL SECURITY;

-- RLS: workspace members can read/write their own config
CREATE POLICY "workspace_members_call_intel" ON public.workspace_call_intelligence_config
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );
```

## Visual Design

```text
┌─────────────────────────────────────────────────────────────┐
│  Call Intelligence                                          │
│  Manage your call recording and AI analysis settings        │
│                                                             │
│  ┌─ Auto-record meetings ──────────────────────────────┐    │
│  │  Manage which meetings should be automatically       │    │
│  │  recorded.                                           │    │
│  │                                                      │    │
│  │  ◉ [👥] External meetings        [Recommended]      │    │
│  │         Only meetings with external participants     │    │
│  │                                                      │    │
│  │  ○ [📹] All meetings                                │    │
│  │         Every meeting will be recorded               │    │
│  │                                                      │    │
│  │  ○ [⊘] None                                         │    │
│  │         No meetings will be recorded                 │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─ AI Transcription & Summary ────────────────────────┐    │
│  │                                                      │    │
│  │  Auto-transcription          [═══════○] ON           │    │
│  │  Transcription language      [Português ▾]           │    │
│  │                                                      │    │
│  │  AI Meeting Summary          [═══════○] ON           │    │
│  │  Automatically generate summaries with key topics    │    │
│  │  and action items after each call.                   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─ Privacy & CRM ─────────────────────────────────────┐    │
│  │                                                      │    │
│  │  Consent notification        [═══════○] ON           │    │
│  │  Notify participants that the call is being recorded │    │
│  │                                                      │    │
│  │  Auto-link to CRM            [═══════○] ON           │    │
│  │  Associate recordings with contacts and deals        │    │
│  │                                                      │    │
│  │  Recording retention         [90 days ▾]             │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─ Default insights template ─────────────────────────┐    │
│  │  The selected template will be automatically         │    │
│  │  applied to your meetings.                           │    │
│  │                                                      │    │
│  │  Template:                   [None ▾]                │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## File Plan

| File | Action | Description |
|---|---|---|
| **Database migration** | **NEW** | Create `workspace_call_intelligence_config` table with RLS |
| `src/hooks/useCallIntelligenceConfig.ts` | **NEW** | Hook to read/upsert call intelligence settings |
| `src/components/settings/sections/CallIntelligenceSettings.tsx` | **NEW** | Full settings UI with radio cards, toggles, selects |
| `src/components/settings/SettingsNavigation.tsx` | **EDIT** | Add `callIntelligence` category to workspace group |
| `src/pages/Settings.tsx` | **EDIT** | Add `callIntelligence` case to render + categoryMeta |
| `src/components/settings/settingsSearchData.ts` | **EDIT** | Add search entries for call intelligence |
| `src/i18n/locales/pt/settings.json` | **EDIT** | Add ~25 new keys |
| `src/i18n/locales/en/settings.json` | **EDIT** | Same |
| `src/i18n/locales/es/settings.json` | **EDIT** | Same |
| `src/i18n/locales/fr/settings.json` | **EDIT** | Same |

## New i18n Keys (~25)

```
nav_callIntelligence,
callIntel_title, callIntel_description,
callIntel_autoRecord, callIntel_autoRecordDesc,
callIntel_external, callIntel_externalDesc, callIntel_recommended,
callIntel_allMeetings, callIntel_allMeetingsDesc,
callIntel_none, callIntel_noneDesc,
callIntel_transcription, callIntel_transcriptionToggle, callIntel_transcriptionLang,
callIntel_aiSummary, callIntel_aiSummaryToggle, callIntel_aiSummaryDesc,
callIntel_privacy, callIntel_consent, callIntel_consentDesc,
callIntel_crmAutoLink, callIntel_crmAutoLinkDesc,
callIntel_retention, callIntel_retentionDays,
callIntel_insightsTemplate, callIntel_insightsTemplateDesc,
callIntel_saved
```

## Hook Details (`useCallIntelligenceConfig.ts`)

```typescript
interface CallIntelligenceConfig {
  auto_record_mode: 'all' | 'external' | 'none';
  transcription_enabled: boolean;
  transcription_language: string;
  ai_summary_enabled: boolean;
  consent_notification: boolean;
  crm_auto_link: boolean;
  retention_days: number;
  default_insights_template: string | null;
}
```

- Uses `useQuery` to fetch from `workspace_call_intelligence_config`
- Uses `useMutation` with upsert pattern (check if row exists, insert or update)
- Returns `{ config, isLoading, updateConfig }`

## Component Details (`CallIntelligenceSettings.tsx`)

- **Auto-record section**: 3 radio cards styled like the Attio screenshot (border highlight on selected, recommended badge on external)
- **AI section**: Two switch toggles with descriptions, a language `<Select>` dropdown (PT, EN, ES, FR, DE, IT)
- **Privacy & CRM section**: Two switch toggles, a retention days `<Select>` (30, 60, 90, 180, 365)
- **Insights template section**: A `<Select>` with "None" default
- Each section auto-saves on change via `updateConfig.mutate()`
- Uses `useTranslation("settings")` throughout
- Loading state with Skeleton components

## Navigation Changes

Add `callIntelligence` to the workspace group in `SettingsNavigation.tsx` after `channels`, using `Phone` icon from lucide-react (matching Attio's "Call intelligence" placement).

## Implementation Order

1. Database migration (create table + RLS)
2. Create hook
3. Add i18n keys (all 4 locales)
4. Create settings component
5. Wire into Settings page + navigation + search data

