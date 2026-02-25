

# Call Recording Storage & CRM Auto-Link

## Current State

- `meeting_recordings` table exists with `file_url`, `file_size_bytes`, `status` columns but NO storage bucket for actual audio/video files
- `meetings` table already has `contact_id`, `company_id`, `opportunity_id` foreign keys -- CRM linking data is available
- `product-images-presign` edge function provides a proven pattern for signed upload URLs
- `useMeetingTranscript` hook fetches recording metadata but has no upload capability
- No `call-recordings` storage bucket exists

## What We'll Build

1. **Private storage bucket** `call-recordings` for audio/video files (private, workspace-scoped RLS)
2. **Edge function** `recording-upload` that validates JWT, generates presigned upload URL, creates/updates `meeting_recordings` row, and auto-links CRM entities from the parent meeting
3. **Frontend hook** `useRecordingUpload` with client-side compression awareness, progress tracking, and CRM association display
4. **Upload UI component** `RecordingUploadCard` embedded in the transcript viewer page
5. **CRM linking table** `recording_crm_links` to track which contacts/deals/companies are associated with each recording

## Architecture

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Upload UI  │────▶│ recording-upload  │────▶│ call-recordings  │
│  Component  │     │  Edge Function    │     │  Storage Bucket  │
└─────────────┘     └──────────────────┘     └─────────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
             meeting_recordings   recording_crm_links
             (file_url, status)   (contact, deal, company)
```

## Database Changes

### 1. Storage bucket `call-recordings` (private)

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'call-recordings', 'call-recordings', false,
  524288000,  -- 500MB
  ARRAY['audio/mpeg','audio/wav','audio/webm','audio/ogg','audio/mp4',
        'video/mp4','video/webm','video/quicktime']
);
```

RLS policies scoped to workspace members via path convention `workspaces/{workspace_id}/...`.

### 2. New table `recording_crm_links`

Tracks which CRM entities are associated with each recording (auto-populated from meeting, editable by user):

```sql
CREATE TABLE public.recording_crm_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.meeting_recordings(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,  -- 'contact', 'company', 'opportunity'
  entity_id UUID NOT NULL,
  entity_name TEXT,           -- denormalized for display
  linked_by TEXT NOT NULL DEFAULT 'auto',  -- 'auto' or 'manual'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS: workspace members can read/write their workspace data.

## Edge Function: `recording-upload`

Based on the `product-images-presign` pattern:

1. Validate JWT + workspace membership
2. Accept `{ meeting_id, filename, content_type, size_bytes }`
3. Look up the meeting to get `contact_id`, `company_id`, `opportunity_id`
4. Create or update `meeting_recordings` row with `status: 'uploading'`
5. Generate presigned upload URL to `call-recordings/workspaces/{wid}/recordings/{recording_id}/{filename}`
6. Auto-create `recording_crm_links` rows for any linked CRM entities from the meeting
7. Return `{ recording_id, signed_upload_url, public_url, crm_links }`

## Frontend Components

### `useRecordingUpload` hook

```typescript
interface UseRecordingUploadReturn {
  uploadRecording: (meetingId: string, file: File) => Promise<void>;
  isUploading: boolean;
  uploadProgress: number;
  confirmUpload: (recordingId: string) => Promise<void>;
}
```

Flow: request presigned URL -> PUT file directly to storage -> confirm upload status -> trigger transcript analysis.

### `RecordingUploadCard` component

Embedded in `TranscriptViewer.tsx` when no recording file exists:

- Drag-and-drop zone for audio/video files
- File type + size validation (max 500MB)
- Upload progress bar
- After upload: shows linked CRM entities (contacts, deals, companies) with badges
- "Analyze" button to trigger AI transcription

## File Plan

| File | Action | Description |
|---|---|---|
| **Database migration** | **NEW** | Create bucket + `recording_crm_links` table + RLS policies |
| `supabase/functions/recording-upload/index.ts` | **NEW** | Presigned URL generation + CRM auto-link |
| `src/hooks/useRecordingUpload.ts` | **NEW** | Upload flow with progress tracking |
| `src/components/meetings/RecordingUploadCard.tsx` | **NEW** | Drag-and-drop upload UI with CRM link display |
| `src/components/meetings/RecordingCrmLinks.tsx` | **NEW** | Display linked contacts/deals/companies |
| `src/components/meetings/TranscriptViewer.tsx` | **EDIT** | Integrate upload card when no file exists |
| `src/hooks/useMeetingTranscript.ts` | **EDIT** | Add `crmLinks` query for recording |
| `supabase/config.toml` | **EDIT** | Add `recording-upload` function config |
| `src/i18n/locales/{en,pt,es,fr}/meetings.json` | **EDIT** | Add ~15 upload + CRM link keys |

## New i18n Keys (~15)

```
recording_upload, recording_dropzone, recording_dropzoneHint,
recording_uploading, recording_uploadSuccess, recording_uploadFailed,
recording_maxSize, recording_invalidType,
recording_crmLinks, recording_linkedContact, recording_linkedDeal,
recording_linkedCompany, recording_autoLinked, recording_manualLink,
recording_confirmUpload
```

## Implementation Order

1. Database migration (bucket + table + RLS)
2. Edge function `recording-upload`
3. `useRecordingUpload` hook
4. `RecordingUploadCard` + `RecordingCrmLinks` components
5. Update `TranscriptViewer` and `useMeetingTranscript`
6. Add i18n keys
7. Register function in `config.toml`

## Technical Notes

- Bucket is **private** -- files accessed only via signed URLs (security)
- Max file size 500MB to accommodate long meeting recordings
- CRM auto-link reads `contact_id`, `company_id`, `opportunity_id` from the `meetings` table -- no user input needed
- Users can manually add additional CRM links after upload
- Upload uses PUT to presigned URL (binary direct), not multipart form
- After successful upload, `meeting_recordings.status` transitions from `uploading` -> `uploaded`
- The existing "Analyze with AI" button in TranscriptViewer works after upload completes

