

# Plan: Comments Tab with Real-Time Collaborative Comments, @Mentions, and Threaded Replies

## Overview

Add a fully functional **Comments** tab to the opportunity detail page with real-time collaboration. Comments will be stored in a new database table, support threaded replies (parent_id), @mentions of workspace members, and real-time updates via Supabase Realtime.

## Database

### New Table: `opportunity_comments`

```sql
CREATE TABLE public.opportunity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.opportunity_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_opp_comments_opportunity ON public.opportunity_comments(opportunity_id);
CREATE INDEX idx_opp_comments_parent ON public.opportunity_comments(parent_id);

-- RLS
ALTER TABLE public.opportunity_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments in their workspace"
  ON public.opportunity_comments FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert comments in their workspace"
  ON public.opportunity_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own comments"
  ON public.opportunity_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.opportunity_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunity_comments;
```

## New Files

### 1. `src/hooks/useOpportunityComments.ts`
Custom hook for CRUD + realtime subscription on `opportunity_comments`:
- `useOpportunityComments(opportunityId)` -- fetches all comments for an opportunity, joins with `profiles` table for author name/avatar
- `useAddComment()` -- mutation to insert a comment (top-level or reply via `parent_id`)
- `useDeleteComment()` -- mutation to delete own comment
- Realtime subscription via `supabase.channel()` on `postgres_changes` for the `opportunity_comments` table filtered by `opportunity_id`, invalidating the query cache on changes

### 2. `src/components/opportunities/detail/OpportunityCommentsTab.tsx`
Main tab component:
- Renders list of top-level comments (where `parent_id IS NULL`)
- Each comment shows: avatar, author name, timestamp, content with parsed @mentions highlighted, reply button, delete button (own comments only)
- **Threaded replies**: Clicking "Reply" expands an inline textarea under the comment; replies are indented and shown below the parent
- **@Mentions**: A `MentionInput` subcomponent -- typing `@` in the textarea opens a popover/dropdown listing workspace members (from `useWorkspaceMembers`), selecting one inserts `@Name` into the text and adds the user_id to the `mentions[]` array
- **New comment form**: Textarea at the top with the MentionInput behavior and a "Post" button
- **Empty state**: Icon + "No comments yet" message

### Component Structure
```text
OpportunityCommentsTab
├── NewCommentForm (textarea + @mention dropdown + Post button)
└── CommentThread[] (for each top-level comment)
    ├── CommentItem (avatar, name, time, content, Reply/Delete buttons)
    ├── ReplyForm (inline textarea, shown on click "Reply")
    └── CommentItem[] (nested replies, indented)
```

### @Mention Dropdown Behavior
- Triggered by typing `@` in the textarea
- Filters workspace members by typed text after `@`
- Shows member name + avatar in dropdown
- On select: replaces `@partial` with `@FullName` and stores `user_id` in mentions array
- Rendered mentions in displayed comments are highlighted with a distinct style (e.g., `text-primary font-medium`)

## Edited Files

### 3. `src/components/opportunities/OpportunityDetailPage.tsx`
- Import `OpportunityCommentsTab` and `MessageSquare` icon
- Add `comments` tab to `tabDotColors` (e.g., `"bg-violet-500"`)
- Add `TabsTrigger` for "Comments" with badge showing comment count
- Add `TabsContent` rendering `<OpportunityCommentsTab opportunityId={opportunity.id} />`
- Fetch comment count for badge (from the hook or a separate count query)

### 4. i18n files (all 4 locales: `en`, `pt`, `es`, `fr`)
New keys (~12):
| Key | EN | PT | ES | FR |
|---|---|---|---|---|
| `oppDetail_commentsTab` | Comments | Comentarios | Comentarios | Commentaires |
| `oppDetail_noComments` | No comments yet | Sem comentarios ainda | Sin comentarios aun | Aucun commentaire |
| `oppDetail_addComment` | Write a comment... | Escrever um comentario... | Escribir un comentario... | Ecrire un commentaire... |
| `oppDetail_postComment` | Post | Publicar | Publicar | Publier |
| `oppDetail_reply` | Reply | Responder | Responder | Repondre |
| `oppDetail_deleteComment` | Delete | Eliminar | Eliminar | Supprimer |
| `oppDetail_deleteCommentConfirm` | Delete this comment? | Eliminar este comentario? | Eliminar este comentario? | Supprimer ce commentaire? |
| `oppDetail_editComment` | Edit | Editar | Editar | Modifier |
| `oppDetail_repliesCount` | {{count}} replies | {{count}} respostas | {{count}} respuestas | {{count}} reponses |
| `oppDetail_mentionSearch` | Search team members... | Procurar membros... | Buscar miembros... | Rechercher des membres... |
| `oppDetail_commentPosted` | Comment posted | Comentario publicado | Comentario publicado | Commentaire publie |
| `oppDetail_commentDeleted` | Comment deleted | Comentario eliminado | Comentario eliminado | Commentaire supprime |

## Implementation Order

1. Database migration (create table + RLS + realtime)
2. `useOpportunityComments.ts` hook
3. `OpportunityCommentsTab.tsx` component with @mentions and threads
4. Edit `OpportunityDetailPage.tsx` to add the tab
5. Add i18n keys to all 4 locales

## Technical Details

- **Realtime**: Subscribe to `postgres_changes` on `opportunity_comments` filtered by `opportunity_id` using `eq` filter. On any event (`INSERT`, `UPDATE`, `DELETE`), invalidate the `["opportunity_comments", opportunityId]` query key.
- **Auth**: Uses `useAuth()` to get current `user.id` for comment ownership checks.
- **Members**: Uses existing `useWorkspaceMembers()` for the @mention dropdown.
- **Workspace isolation**: All queries filter by `workspace_id` via RLS policies tied to `workspace_members`.

