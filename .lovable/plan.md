

# Communications Module — Complete Redesign

This is a large-scope redesign covering the Inbox, Email Campaigns, and Templates modules. Given the size, I'll break it into **4 phases** to be implemented sequentially.

---

## Phase 1 — Critical Fixes (MIME + Contact Matching)

### 1A. `cleanEmailPreview()` utility
Create `src/lib/cleanEmailPreview.ts`:
- Strip MIME boundaries (`------=_Part_*`)
- Strip MIME headers (`Content-Type:`, `MIME-Version:`, `Content-Transfer-Encoding:`, etc.)
- If HTML detected, use DOMParser to extract plain text
- Remove quoted replies (lines starting with `>`)
- Collapse whitespace, truncate to 100 chars for preview mode
- Full version for thread view (no truncation, but with collapsible quoted text)

Apply in:
- `ConversationList.tsx` — wrap `conv.last_message_preview` with `cleanEmailPreview()`
- `EmailMessageBubble.tsx` — apply full clean (no truncation) to message content
- `MessageBubble.tsx` — apply to `message.content`

### 1B. Unknown Contact Resolution
In `ConversationDetail.tsx`:
- When conversation loads with no `contact` and no `lead` (shows "Desconhecido"), attempt email match by calling `contact-enrich` and `ai-analyze-lead` edge functions
- If no match found, show inline buttons "+ Criar Lead" and "+ Criar Contacto" in the conversation header
- Wire buttons to existing `useCreateLead` / `useCreateContact` hooks, pre-filling the email address

---

## Phase 2 — Inbox Three-Panel Redesign

### 2A. Left Sidebar Panel (240px, collapsible)
Redesign `InboxSidebar.tsx` to match the spec:
- "Nova Mensagem" button at top
- Smart folders with real-time counters: Todas, Email, WhatsApp, Instagram, SMS, Follow-up, Prioritárias, Sem resposta, Resolvidas
- Dynamic tags section from `conversation_tags` with counts
- Tag click filters the conversation list

### 2B. Update `InboxView.tsx` Layout
- Add the left sidebar panel (currently not rendered in InboxView)
- Left panel: 240px collapsible sidebar
- Center: 340px conversation list
- Right: flex conversation detail
- Far right: CRM panel (toggle)

### 2C. Conversation List Enhancements
Update `ConversationList.tsx`:
- Hover quick actions: Resolve, Follow-up, Archive, Quick Reply
- Bulk select with checkbox on hover
- Bulk actions bar: Resolve all, Assign, Apply tag, Archive
- Sort options: Most recent, Unread, AI Priority, Last activity

### 2D. Compose Box Redesign
Update `AIMessageComposer.tsx`:
- AI buttons row: Suggest reply, Shorten, More formal, Translate
- Channel toggle (Email/WhatsApp/SMS)
- "/" command palette for templates
- "Send and Resolve" as primary action (Cmd+Enter)
- CRM data insertion button

### 2E. Keyboard Shortcuts
Create `src/hooks/useInboxHotkeys.ts`:
- `C` new message, `J`/`K` navigate, `E` resolve, `R` reply, `F` follow-up, `#` archive, `P` toggle CRM panel, `[` toggle sidebar, `Cmd+Enter` send, `Esc` close, `?` show shortcuts modal

---

## Phase 3 — Email Campaigns (Build from Scratch)

### 3A. Database Tables
Create via migration:
- `email_campaigns` (id, workspace_id, name, subject, body, template_id, from_email_account_id, segment_type, segment_config, status [draft/scheduled/sending/sent/paused], scheduled_at, sent_at, total_recipients, tracking_opens, tracking_clicks, created_by, created_at, updated_at)
- `campaign_recipients` (id, campaign_id, workspace_id, contact_id, lead_id, email, status [pending/sent/delivered/opened/clicked/bounced/unsubscribed], sent_at, opened_at, clicked_at, bounced_at)
- `campaign_analytics` (id, campaign_id, workspace_id, metric_type, metric_value, recorded_at)
- RLS policies scoped to workspace_id

### 3B. Hooks
Create `src/hooks/useEmailCampaigns.ts` — CRUD for campaigns
Create `src/hooks/useCampaignAnalytics.ts` — analytics queries

### 3C. Campaign Dashboard Page
Replace `EmailCampaignsPage.tsx`:
- KPI row: Total campaigns, Active, Avg open rate, Avg click rate
- Campaigns table: Name, Segment, Sent, Opens%, Clicks%, Status badge, Actions
- Empty state with CTA

### 3D. Campaign Creation Wizard
Create `src/components/campaigns/CampaignWizard.tsx` — 4-step wizard:
1. **Audience**: Segment selection (all contacts, by tag, by lead score, by last interaction, CSV upload), recipient estimate
2. **Content**: Template picker or inline editor, subject line with AI suggestion, desktop/mobile preview, variable personalization
3. **Settings**: From account, reply-to, tracking toggles, unsubscribe info
4. **Send**: Send now / Schedule, test send, summary, confirm button (calls `marketing-send-campaign`)

### 3E. Campaign Detail Page
Create `src/components/campaigns/CampaignDetail.tsx`:
- Funnel metrics: Sent → Delivered → Opened → Clicked → Converted
- Opens over time chart (recharts)
- "Who opened" list with CRM links
- Top clicked links
- Bounces and unsubscribes list
- Calls `marketing-campaign-insights` for data

---

## Phase 4 — Templates + Realtime + Polish

### 4A. Template Improvements
- Template cards: channel badge, AI badge, active/inactive toggle, usage counter, "Use now" button
- "Use now" opens compose with template via `template-compose-message`
- AI generation drawer with prompt input
- Sequences tab: visual timeline for follow-up sequences (Email 1 → wait X days → Email 2)

### 4B. Realtime Notifications
- Supabase Realtime on `conversations` and `messages` (already partially implemented)
- Toast for new inbound messages with sender name + clean preview
- Unread badge in sidebar navigation
- Auto-classify new messages via `classify-conversation`

### 4C. Design Polish
- Ensure dark theme consistency (`#0f1117` bg, `#1a1d27` surfaces, `#2a2d3e` borders, `#6366f1` primary)
- List density toggle (72px normal / 52px compact)
- Mobile responsive: 3 panels → bottom tab navigation (Inbox | Write | CRM)

---

## File Summary

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 1 | `src/lib/cleanEmailPreview.ts` | `ConversationList.tsx`, `EmailMessageBubble.tsx`, `MessageBubble.tsx`, `ConversationDetail.tsx` |
| 2 | `src/hooks/useInboxHotkeys.ts`, `src/components/inbox/KeyboardShortcutsModal.tsx` | `InboxView.tsx`, `InboxSidebar.tsx`, `ConversationList.tsx`, `AIMessageComposer.tsx` |
| 3 | `src/hooks/useEmailCampaigns.ts`, `src/hooks/useCampaignAnalytics.ts`, `src/components/campaigns/CampaignWizard.tsx`, `src/components/campaigns/CampaignDetail.tsx`, `src/components/campaigns/CampaignDashboard.tsx` | `EmailCampaignsPage.tsx` |
| 4 | `src/components/communication/TemplateSequenceEditor.tsx` | `TemplatesListPage.tsx`, `ConversationList.tsx`, `InboxView.tsx` |

**Database migrations needed**: `email_campaigns`, `campaign_recipients`, `campaign_analytics` tables with RLS policies (Phase 3).

**Edge functions used (existing, no new ones)**: `ai-inbox-reply`, `ai-inbox-actions`, `classify-conversation`, `email-send`, `template-compose-message`, `marketing-send-campaign`, `marketing-campaign-insights`, `contact-enrich`, `ai-analyze-lead`.

---

## Implementation Order

Given the scope, I recommend implementing **Phase 1 first** (critical bug fixes), then proceeding phase by phase. Shall I start with Phase 1?

