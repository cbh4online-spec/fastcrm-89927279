
-- =========================================================================
-- 1. Extend ai_field_suggestions for tags + automation suggestions
-- =========================================================================

-- Add suggestion_type discriminator (backward compat: default to field_value)
ALTER TABLE public.ai_field_suggestions 
  ADD COLUMN IF NOT EXISTS suggestion_type text NOT NULL DEFAULT 'field_value';

-- Make entity columns nullable (automation suggestions are workspace-level)
ALTER TABLE public.ai_field_suggestions 
  ALTER COLUMN entity_id DROP NOT NULL,
  ALTER COLUMN entity_type DROP NOT NULL,
  ALTER COLUMN field_name DROP NOT NULL,
  ALTER COLUMN field_type DROP NOT NULL,
  ALTER COLUMN explanation DROP NOT NULL;

-- Make suggested_value nullable (tags don't use it)
ALTER TABLE public.ai_field_suggestions 
  ALTER COLUMN suggested_value DROP NOT NULL;

-- Tag suggestion columns
ALTER TABLE public.ai_field_suggestions
  ADD COLUMN IF NOT EXISTS tag_value text,
  ADD COLUMN IF NOT EXISTS tag_color text;

-- Automation suggestion columns
ALTER TABLE public.ai_field_suggestions
  ADD COLUMN IF NOT EXISTS automation_title text,
  ADD COLUMN IF NOT EXISTS automation_description text,
  ADD COLUMN IF NOT EXISTS automation_trigger jsonb,
  ADD COLUMN IF NOT EXISTS automation_actions jsonb,
  ADD COLUMN IF NOT EXISTS automation_example text;

-- Lifecycle columns
ALTER TABLE public.ai_field_suggestions
  ADD COLUMN IF NOT EXISTS applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dismissed_reason text,
  ADD COLUMN IF NOT EXISTS reasoning text,
  ADD COLUMN IF NOT EXISTS created_by_ai boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Indexes for the new patterns
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_workspace_type 
  ON public.ai_field_suggestions(workspace_id, status, suggestion_type);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_entity 
  ON public.ai_field_suggestions(entity_type, entity_id) 
  WHERE entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_pending 
  ON public.ai_field_suggestions(workspace_id, created_at DESC) 
  WHERE status = 'pending';

-- =========================================================================
-- 2. Create ai_suggestion_settings table
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.ai_suggestion_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  auto_tags_enabled boolean NOT NULL DEFAULT true,
  field_suggestions_enabled boolean NOT NULL DEFAULT true,
  automation_suggestions_enabled boolean NOT NULL DEFAULT true,
  auto_tag_entities text[] NOT NULL DEFAULT ARRAY['contact','lead','company','opportunity'],
  min_confidence float NOT NULL DEFAULT 0.7,
  max_pending_per_entity integer NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_suggestion_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_access" ON public.ai_suggestion_settings
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );
