

# Sprint 3: AI Workflow Nodes + Meeting Intelligence

## Overview

Two parallel tracks: (A) extend the Flow Builder with 6 AI-powered node types, and (B) build a full meeting recording pipeline with real-time transcription and AI analysis.

---

## Part A — AI Workflow Nodes

### What exists today
- Flow Builder uses `FlowStepType`: `message`, `question`, `condition`, `action`, `goal`, `handoff`
- Each step type has config in `STEP_TYPE_CONFIG` (label, icon, color, description)
- Sidebar (`FlowBuilderSidebar`) renders draggable step cards from the config
- `FlowStepNode` renders node visuals per type
- `StepPropertiesPanel` renders config forms per type
- `useConversationalFlows` handles CRUD for steps in `flow_steps` table

### New AI step types to add

| Type | Purpose | Icon |
|------|---------|------|
| `ai_analyze` | Analyze a record (lead/company/deal) with AI | Brain |
| `ai_research` | Research company via web/enrichment | Search |
| `ai_predict` | Predict deal outcome / score | TrendingUp |
| `ai_generate_message` | Generate personalized message | PenTool |
| `ai_summarize` | Summarize conversation/call | FileText |
| `ai_extract_tasks` | Extract action items from text | ListChecks |

### Changes required

1. **Types** (`src/types/conversational-flows.ts`)
   - Extend `FlowStepType` union with 6 new AI types
   - Extend `STEP_TYPE_CONFIG` with labels, icons, colors (use cyan/indigo palette for AI nodes)
   - Add `aiModel`, `aiPrompt`, `aiInputSource` optional fields to `FlowStep` interface

2. **Flow Builder Sidebar** (`FlowBuilderSidebar.tsx`)
   - Add new AI icons to `ICONS` map
   - Steps will auto-render from `STEP_TYPE_CONFIG` (no other changes needed)
   - Add a visual "AI" section separator in the sidebar

3. **Flow Step Node** (`FlowStepNode.tsx`)
   - Add AI icons to `ICONS` map
   - Add AI-specific content preview (show `aiInputSource` and model)

4. **Step Properties Panel** (`StepPropertiesPanel.tsx`)
   - Add configuration form for AI steps: input source selector, model picker, custom prompt textarea, output variable mapping

5. **Database** — Add columns to `flow_steps`:
   - `ai_model TEXT`
   - `ai_prompt TEXT`
   - `ai_input_source TEXT` (e.g., `current_lead`, `current_company`, `conversation_history`)
   - `ai_output_variable TEXT`

6. **Hook** (`useConversationalFlows.ts`)
   - Map new `ai_*` fields in `createStep` / `updateStep` / `mapStepFromDB`

7. **Edge Function** (`flow-engine/index.ts`)
   - Add AI step executor that calls Lovable AI Gateway for each AI node type with appropriate system prompts

---

## Part B — Meeting Intelligence Pipeline

### What exists today
- `meeting_recordings` table with upload, transcription status, AI fields (summary, action_items, topics, sentiment)
- `meeting_transcript_segments` and `meeting_transcript_highlights` tables
- `RecordingUploadCard` — drag-and-drop file upload
- `TranscriptViewer` — full viewer with search, speaker filter, key moments
- `ai-transcript-analyze` edge function — analyzes existing segments with AI
- `recording-upload` edge function — handles file upload to storage
- No actual transcription pipeline (audio → text)

### New components to build

1. **Database** — New `meeting_ai_analysis` table:
   - `id`, `recording_id`, `workspace_id`
   - `objections_detected JSONB` (array of objection objects with timestamp, text, severity)
   - `buying_signals JSONB`
   - `competitor_mentions JSONB`
   - `follow_up_suggestions JSONB`
   - `talk_ratio JSONB` (speaker talk time percentages)
   - `engagement_score NUMERIC`
   - `deal_impact TEXT` (positive/neutral/negative)
   - RLS: workspace members only

2. **Transcription Edge Function** (`meeting-transcribe/index.ts`)
   - Accept `recording_id`, fetch audio from storage
   - Call ElevenLabs Scribe API (`scribe_v2`) for batch transcription with diarization
   - Insert segments into `meeting_transcript_segments`
   - Update `meeting_recordings.transcription_status` → `completed`
   - Auto-trigger `ai-transcript-analyze` after transcription completes

3. **Enhanced `ai-transcript-analyze`** 
   - After generating summary/action items/topics, also populate `meeting_ai_analysis` with:
     - Objection detection
     - Buying signals
     - Competitor mentions
     - Talk ratio per speaker
     - Engagement score
     - Deal impact assessment

4. **Real-time Recording UI** (`MeetingLiveRecorder.tsx`)
   - In-browser microphone recording using MediaRecorder API
   - Real-time transcription preview via ElevenLabs `useScribe` hook
   - Start/stop/pause controls
   - Auto-upload on stop → triggers transcription pipeline

5. **Meeting Intelligence Panel** (`MeetingIntelligencePanel.tsx`)
   - Renders data from `meeting_ai_analysis`
   - Cards: Objections, Buying Signals, Talk Ratio (pie chart), Engagement Score, Deal Impact
   - Integrated into `TranscriptViewer`

6. **Hook** (`useMeetingIntelligence.ts`)
   - Query `meeting_ai_analysis` by recording_id
   - Realtime subscription for updates

### ElevenLabs API Key
- Will need `ELEVENLABS_API_KEY` secret for transcription
- Token generation endpoint for real-time scribe

---

## Implementation Order

| Step | Task | Depends on |
|------|------|-----------|
| 1 | DB migration: `flow_steps` AI columns + `meeting_ai_analysis` table | — |
| 2 | Types + STEP_TYPE_CONFIG for AI nodes | 1 |
| 3 | Sidebar, Node, Properties Panel for AI steps | 2 |
| 4 | Hook updates for AI fields mapping | 2 |
| 5 | `flow-engine` AI step executor | 4 |
| 6 | Request ElevenLabs API key | — |
| 7 | `meeting-transcribe` edge function | 6 |
| 8 | Enhanced `ai-transcript-analyze` | 1 |
| 9 | `MeetingLiveRecorder` component | 6 |
| 10 | `MeetingIntelligencePanel` + hook | 1, 8 |

---

## Summary

- **6 new AI node types** in the Flow Builder with full config UI and backend execution
- **Full meeting pipeline**: record → transcribe → analyze → display intelligence
- **1 migration**, **2 new edge functions**, **~8 new/modified components**
- ElevenLabs API key required for transcription (will prompt before proceeding)

