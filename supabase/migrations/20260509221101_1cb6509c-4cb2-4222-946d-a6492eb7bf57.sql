ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS ui_mode text NOT NULL DEFAULT 'auto';

ALTER TABLE public.workspaces
DROP CONSTRAINT IF EXISTS workspaces_ui_mode_check;

ALTER TABLE public.workspaces
ADD CONSTRAINT workspaces_ui_mode_check
CHECK (ui_mode IN ('auto','fastcrm','leadchef'));