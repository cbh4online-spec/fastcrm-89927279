-- Drop existing policies
DROP POLICY IF EXISTS "Membros podem ver config GHL do workspace" ON public.workspace_ghl_config;
DROP POLICY IF EXISTS "Membros podem inserir config GHL do workspace" ON public.workspace_ghl_config;
DROP POLICY IF EXISTS "Membros podem atualizar config GHL do workspace" ON public.workspace_ghl_config;
DROP POLICY IF EXISTS "Membros podem apagar config GHL do workspace" ON public.workspace_ghl_config;

-- Create new policies that include super admin access
CREATE POLICY "Super admin ou membros podem ver config GHL" 
ON public.workspace_ghl_config 
FOR SELECT 
USING (
  public.is_super_admin(auth.uid()) 
  OR workspace_id IN (SELECT get_user_workspace_ids())
);

CREATE POLICY "Super admin pode inserir config GHL" 
ON public.workspace_ghl_config 
FOR INSERT 
WITH CHECK (
  public.is_super_admin(auth.uid())
);

CREATE POLICY "Super admin pode atualizar config GHL" 
ON public.workspace_ghl_config 
FOR UPDATE 
USING (
  public.is_super_admin(auth.uid())
);

CREATE POLICY "Super admin pode apagar config GHL" 
ON public.workspace_ghl_config 
FOR DELETE 
USING (
  public.is_super_admin(auth.uid())
);