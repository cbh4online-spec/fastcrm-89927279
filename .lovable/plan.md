

# AI-Powered Meeting Transcript Viewer

## Overview

Build a full-stack meeting transcript viewer that stores call recordings metadata and AI-generated transcriptions, then presents them in a rich, interactive UI with timestamped segments, speaker identification, key moment highlights, and AI summaries. This leverages the existing Call Intelligence settings infrastructure and the Meetings module.

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│  Database                                                       │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐  │
│  │ meeting_recordings   │  │ meeting_transcript_segments      │  │
│  │ (1 per meeting)      │──│ (N per recording)                │  │
│  └─────────────────────┘  └──────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ meeting_transcript_highlights (key moments per recording) │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────────┐
│ Edge Function    │     │ Frontend Component   │
│ ai-transcript-   │◄────│ TranscriptViewer.tsx  │
│ analyze          │     │ + hook                │
└──────────────────┘     └──────────────────────┘
```

## Database Tables

### 1. `meeting_recordings`

One row per recording, linked to a meeting.

```sql
CREATE TABLE public.meeting_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
  duration_seconds INTEGER,
  file_url TEXT,
  file_size_bytes BIGINT,
  transcription_status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  transcription_language TEXT DEFAULT 'pt',
  ai_summary TEXT,
  ai_action_items JSONB DEFAULT '[]',
  ai_topics JSONB DEFAULT '[]',
  ai_sentiment TEXT,  -- positive, neutral, negative, mixed
  speaker_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2. `meeting_transcript_segments`

Individual timestamped segments with speaker identification.

```sql
CREATE TABLE public.meeting_transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.meeting_recordings(id) ON DELETE CASCADE,
  speaker_label TEXT NOT NULL,        -- 'Speaker 1', 'João Silva', etc.
  speaker_role TEXT,                  -- 'host', 'client', 'attendee'
  start_time_ms INTEGER NOT NULL,     -- milliseconds from start
  end_time_ms INTEGER NOT NULL,
  content TEXT NOT NULL,
  confidence NUMERIC(4,3),            -- 0.000–1.000
  is_key_moment BOOLEAN DEFAULT false,
  sentiment TEXT,                     -- positive, neutral, negative
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3. `meeting_transcript_highlights`

AI-detected key moments (decisions, action items, questions, objections).

```sql
CREATE TABLE public.meeting_transcript_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.meeting_recordings(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES public.meeting_transcript_segments(id) ON DELETE SET NULL,
  highlight_type TEXT NOT NULL,       -- decision, action_item, question, objection, insight, commitment
  title TEXT NOT NULL,
  description TEXT,
  start_time_ms INTEGER NOT NULL,
  assignee TEXT,                      -- for action items
  due_date DATE,                      -- for action items
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS policies on all three tables: workspace members can read/write their own workspace data.

Enable realtime on `meeting_recordings` for live status updates during processing.

## Visual Design

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📹 Meeting Recording: "Q1 Review with Client"                     │
│  Duration: 45:23  •  3 speakers  •  Sentiment: Positive            │
│                                                                     │
│  ┌─ AI Summary ─────────────────────────────────────────────────┐   │
│  │ The team reviewed Q1 performance, agreed on pricing changes, │   │
│  │ and scheduled a follow-up for next week.                      │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ Key Moments ────────────────────────────────────────────────┐   │
│  │ 🔵 03:22  Decision: Approve new pricing tier                 │   │
│  │ 🟡 12:45  Action Item: Send updated proposal (→ João)        │   │
│  │ 🔴 28:10  Objection: Concerns about delivery timeline        │   │
│  │ 🟢 35:00  Commitment: Follow-up meeting next Tuesday         │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ Topics ─────┐  ┌─ Action Items ──────────────────────────┐     │
│  │ Pricing       │  │ ☐ Send updated proposal    → João  📅  │     │
│  │ Timeline      │  │ ☐ Review contract terms    → Maria 📅  │     │
│  │ Deliverables  │  │ ☐ Schedule follow-up       → Ana   📅  │     │
│  └───────────────┘  └────────────────────────────────────────┘     │
│                                                                     │
│  ── Transcript ──────────────────────────────── 🔍 Search ──────   │
│  │ [Filter: All ▾]  [Speaker: All ▾]  [Show key moments only ☐] │  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 00:00  👤 João Silva (Host)                                  │   │
│  │        Bom dia a todos, vamos começar com a revisão do Q1.   │   │
│  │                                                               │   │
│  │ 00:15  👤 Maria Santos (Client)                    ⭐ KEY    │   │
│  │        Obrigada João. Quero começar pelo tema do pricing.    │   │
│  │                                                               │   │
│  │ 03:22  👤 João Silva (Host)                   🔵 DECISION   │   │
│  │        Então ficamos com o novo tier aprovado.                │   │
│  │        ────────────────────────────────                      │   │
│  │        ✅ Decision: Approve new pricing tier                 │   │
│  │        ────────────────────────────────                      │   │
│  │                                                               │   │
│  │ 12:45  👤 Maria Santos (Client)              🟡 ACTION      │   │
│  │        Precisamos da proposta atualizada esta semana.        │   │
│  │        ────────────────────────────────                      │   │
│  │        📋 Action: Send updated proposal → João, Fri          │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Edge Function: `ai-transcript-analyze`

Accepts a recording ID, fetches its transcript segments, calls Lovable AI (`google/gemini-3-flash-preview`) to:

1. Generate a summary
2. Extract action items with assignees
3. Identify topics
4. Detect key moments (decisions, objections, commitments)
5. Analyze overall sentiment

Returns structured data via tool calling and updates the `meeting_recordings` and `meeting_transcript_highlights` tables.

## File Plan

| File | Action | Description |
|---|---|---|
| **Database migration** | **NEW** | Create 3 tables + RLS + realtime |
| `supabase/functions/ai-transcript-analyze/index.ts` | **NEW** | AI analysis edge function using Lovable AI |
| `src/hooks/useMeetingTranscript.ts` | **NEW** | Hook to fetch recording, segments, highlights; trigger AI analysis |
| `src/components/meetings/TranscriptViewer.tsx` | **NEW** | Main transcript viewer component |
| `src/components/meetings/TranscriptSegment.tsx` | **NEW** | Individual segment row with speaker, timestamp, badges |
| `src/components/meetings/TranscriptSummaryPanel.tsx` | **NEW** | AI summary, topics, action items, key moments panels |
| `src/components/meetings/TranscriptKeyMoments.tsx` | **NEW** | Clickable key moments timeline |
| `src/pages/MeetingTranscriptPage.tsx` | **NEW** | Route page wrapping TranscriptViewer |
| `src/App.tsx` | **EDIT** | Add route `/meetings/:meetingId/transcript` |
| `src/components/meetings/MeetingCard.tsx` | **EDIT** | Add "View Transcript" button when recording exists |
| `src/i18n/locales/pt/meetings.json` | **NEW** | ~40 transcript-related keys |
| `src/i18n/locales/en/meetings.json` | **NEW** | Same |
| `src/i18n/locales/es/meetings.json` | **NEW** | Same |
| `src/i18n/locales/fr/meetings.json` | **NEW** | Same |

## i18n Keys (~40)

```
transcript_title, transcript_duration, transcript_speakers,
transcript_sentiment, transcript_sentimentPositive, transcript_sentimentNegative,
transcript_sentimentNeutral, transcript_sentimentMixed,
transcript_aiSummary, transcript_keyMoments, transcript_topics,
transcript_actionItems, transcript_search, transcript_filterAll,
transcript_filterSpeaker, transcript_showKeyOnly,
transcript_decision, transcript_actionItem, transcript_question,
transcript_objection, transcript_insight, transcript_commitment,
transcript_processing, transcript_completed, transcript_failed,
transcript_pending, transcript_analyze, transcript_reanalyze,
transcript_noTranscript, transcript_noSegments,
transcript_assignee, transcript_dueDate, transcript_confidence,
transcript_host, transcript_client, transcript_attendee,
transcript_exportPdf, transcript_copyText, transcript_backToMeeting,
transcript_statusLabel, transcript_keyMoment
```

## Hook: `useMeetingTranscript`

```typescript
interface UseMeetingTranscriptReturn {
  recording: MeetingRecording | null;
  segments: TranscriptSegment[];
  highlights: TranscriptHighlight[];
  isLoading: boolean;
  analyzeTranscript: () => Promise<void>;
  isAnalyzing: boolean;
}
```

- Fetches recording by `meeting_id`
- Fetches segments ordered by `start_time_ms`
- Fetches highlights ordered by `start_time_ms`
- `analyzeTranscript` invokes the edge function
- Subscribes to realtime on `meeting_recordings` for live status updates during processing

## TranscriptViewer Component Structure

```text
TranscriptViewer
├── Header (back button, title, duration, speakers, sentiment badge)
├── TranscriptSummaryPanel (collapsible)
│   ├── AI Summary text
│   ├── Topics as badges
│   └── Action Items checklist
├── TranscriptKeyMoments (horizontal scrollable timeline)
│   └── Clickable moment cards that scroll to segment
├── Toolbar (search, speaker filter, key moments toggle)
└── Segments list (virtualized scroll)
    └── TranscriptSegment × N
        ├── Timestamp (clickable)
        ├── Speaker avatar + name + role badge
        ├── Content text
        ├── Key moment inline card (if applicable)
        └── Sentiment indicator (subtle)
```

## Speaker Colors

Deterministic colors per speaker for visual differentiation:

```typescript
const speakerColors = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-green-100 text-green-700 border-green-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-pink-100 text-pink-700 border-pink-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
];
```

## Highlight Type Icons & Colors

```typescript
const highlightConfig = {
  decision:   { icon: CheckCircle2, color: "blue",   label: "Decisão" },
  action_item:{ icon: ListTodo,     color: "amber",  label: "Ação" },
  question:   { icon: HelpCircle,   color: "purple", label: "Pergunta" },
  objection:  { icon: AlertTriangle,color: "red",    label: "Objeção" },
  insight:    { icon: Lightbulb,    color: "green",  label: "Insight" },
  commitment: { icon: Handshake,    color: "emerald",label: "Compromisso" },
};
```

## Implementation Order

1. Database migration (3 tables + RLS + realtime)
2. Edge function `ai-transcript-analyze`
3. Create hook `useMeetingTranscript`
4. Add i18n keys to all 4 locales
5. Build sub-components: `TranscriptSegment`, `TranscriptSummaryPanel`, `TranscriptKeyMoments`
6. Build main `TranscriptViewer` component
7. Create `MeetingTranscriptPage` and add route
8. Add "View Transcript" link to `MeetingCard`

## Technical Notes

- No recording/upload infrastructure is built here -- only the transcript viewing and AI analysis layer. Recording upload can be added later.
- The AI edge function uses `google/gemini-3-flash-preview` via Lovable AI with tool calling for structured output.
- Segments list uses `ScrollArea` for performance; virtualization can be added later for very long transcripts.
- Key moments in the timeline are clickable and scroll to the corresponding segment using `scrollIntoView`.
- The "Analyze" button is available when `transcription_status` is `completed` but `ai_summary` is null.
- Realtime subscription updates the recording status badge live during AI processing.

