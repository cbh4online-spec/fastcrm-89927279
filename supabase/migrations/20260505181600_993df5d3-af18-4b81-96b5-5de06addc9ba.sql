-- Tabela de snippets/respostas rápidas para o Inbox
CREATE TABLE public.inbox_snippets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  shortcut TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  is_personal BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Normalizar shortcut: minúsculas, sem espaços, sem barra inicial
CREATE OR REPLACE FUNCTION public.normalize_inbox_snippet_shortcut()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.shortcut := lower(regexp_replace(coalesce(NEW.shortcut, ''), '^/+', ''));
  NEW.shortcut := regexp_replace(NEW.shortcut, '\s+', '_', 'g');
  IF NEW.shortcut = '' THEN
    RAISE EXCEPTION 'shortcut cannot be empty';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_normalize_inbox_snippet_shortcut
BEFORE INSERT OR UPDATE ON public.inbox_snippets
FOR EACH ROW EXECUTE FUNCTION public.normalize_inbox_snippet_shortcut();

-- Índices únicos parciais: partilhados por workspace, pessoais por user
CREATE UNIQUE INDEX inbox_snippets_workspace_shortcut_unique
  ON public.inbox_snippets (workspace_id, shortcut)
  WHERE is_personal = false;

CREATE UNIQUE INDEX inbox_snippets_personal_shortcut_unique
  ON public.inbox_snippets (workspace_id, user_id, shortcut)
  WHERE is_personal = true;

CREATE INDEX idx_inbox_snippets_workspace ON public.inbox_snippets (workspace_id);
CREATE INDEX idx_inbox_snippets_user ON public.inbox_snippets (user_id);

-- RLS
ALTER TABLE public.inbox_snippets ENABLE ROW LEVEL SECURITY;

-- SELECT: snippets partilhados do workspace OU pessoais do próprio user
CREATE POLICY "snippets_select_workspace_or_own"
ON public.inbox_snippets
FOR SELECT
TO authenticated
USING (
  (
    is_personal = false
    AND public.is_workspace_member(auth.uid(), workspace_id)
  )
  OR (
    is_personal = true
    AND user_id = auth.uid()
    AND public.is_workspace_member(auth.uid(), workspace_id)
  )
);

-- INSERT: criar para si próprio dentro do workspace
CREATE POLICY "snippets_insert_own"
ON public.inbox_snippets
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_workspace_member(auth.uid(), workspace_id)
);

-- UPDATE: dono OU admin do workspace (para partilhados)
CREATE POLICY "snippets_update_own_or_admin"
ON public.inbox_snippets
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    is_personal = false
    AND public.is_workspace_admin(auth.uid(), workspace_id)
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR (
    is_personal = false
    AND public.is_workspace_admin(auth.uid(), workspace_id)
  )
);

-- DELETE: dono OU admin do workspace (para partilhados)
CREATE POLICY "snippets_delete_own_or_admin"
ON public.inbox_snippets
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    is_personal = false
    AND public.is_workspace_admin(auth.uid(), workspace_id)
  )
);