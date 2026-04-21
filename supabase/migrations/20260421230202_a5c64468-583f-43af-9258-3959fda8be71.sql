-- Permitir super admins criar/ler/atualizar jobs em qualquer workspace,
-- mantendo isolamento por workspace para membros regulares.

DROP POLICY IF EXISTS "Authenticated users can create generation jobs" ON public.ebook_generation_jobs;
DROP POLICY IF EXISTS "Workspace members can view generation jobs" ON public.ebook_generation_jobs;
DROP POLICY IF EXISTS "Workspace members can update generation jobs" ON public.ebook_generation_jobs;

CREATE POLICY "ebook_jobs_insert_members_or_admin"
ON public.ebook_generation_jobs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "ebook_jobs_select_members_or_admin"
ON public.ebook_generation_jobs
FOR SELECT
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "ebook_jobs_update_members_or_admin"
ON public.ebook_generation_jobs
FOR UPDATE
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "ebook_jobs_delete_members_or_admin"
ON public.ebook_generation_jobs
FOR DELETE
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  OR public.is_super_admin(auth.uid())
);