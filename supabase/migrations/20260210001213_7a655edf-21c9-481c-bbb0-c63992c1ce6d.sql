
-- =============================================
-- Portal B2B 2.0 - Phase 1: Roles & Permissions
-- =============================================

-- 1. Create enum for B2B client roles
CREATE TYPE public.client_role AS ENUM ('client_admin', 'client_financial', 'client_operational', 'client_viewer');

-- 2. Create client_user_roles table
CREATE TABLE public.client_user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_user_id UUID NOT NULL REFERENCES public.client_users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role public.client_role NOT NULL DEFAULT 'client_viewer',
  spending_limit NUMERIC(12,2) DEFAULT NULL,
  allowed_product_categories JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_user_id, role)
);

-- 3. Enable RLS
ALTER TABLE public.client_user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function to check client role (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_client_role(_auth_user_id UUID, _role public.client_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_user_roles cur
    JOIN public.client_users cu ON cu.id = cur.client_user_id
    WHERE cu.auth_user_id = _auth_user_id
      AND cur.role = _role
  )
$$;

-- Helper: get all roles for a client auth user
CREATE OR REPLACE FUNCTION public.get_client_roles(_auth_user_id UUID)
RETURNS SETOF public.client_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cur.role
  FROM public.client_user_roles cur
  JOIN public.client_users cu ON cu.id = cur.client_user_id
  WHERE cu.auth_user_id = _auth_user_id
$$;

-- Helper: check if user belongs to same company
CREATE OR REPLACE FUNCTION public.is_same_client_company(_auth_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_users
    WHERE auth_user_id = _auth_user_id
      AND company_id = _company_id
  )
$$;

-- 5. RLS Policies for client_user_roles

-- Client admins can view all roles in their company
CREATE POLICY "Client admins can view company roles"
ON public.client_user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_users cu
    WHERE cu.id = client_user_id
    AND public.is_same_client_company(auth.uid(), cu.company_id)
  )
);

-- Client admins can manage roles
CREATE POLICY "Client admins can insert roles"
ON public.client_user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_client_role(auth.uid(), 'client_admin')
  AND EXISTS (
    SELECT 1 FROM public.client_users cu
    WHERE cu.id = client_user_id
    AND public.is_same_client_company(auth.uid(), cu.company_id)
  )
);

CREATE POLICY "Client admins can update roles"
ON public.client_user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_client_role(auth.uid(), 'client_admin')
  AND EXISTS (
    SELECT 1 FROM public.client_users cu
    WHERE cu.id = client_user_id
    AND public.is_same_client_company(auth.uid(), cu.company_id)
  )
);

CREATE POLICY "Client admins can delete roles"
ON public.client_user_roles
FOR DELETE
TO authenticated
USING (
  public.has_client_role(auth.uid(), 'client_admin')
  AND EXISTS (
    SELECT 1 FROM public.client_users cu
    WHERE cu.id = client_user_id
    AND public.is_same_client_company(auth.uid(), cu.company_id)
  )
);

-- Super admins / workspace owners can also manage
CREATE POLICY "Super admins can manage all roles"
ON public.client_user_roles
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 6. Trigger for updated_at
CREATE TRIGGER update_client_user_roles_updated_at
BEFORE UPDATE ON public.client_user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Index for performance
CREATE INDEX idx_client_user_roles_client_user ON public.client_user_roles(client_user_id);
CREATE INDEX idx_client_user_roles_workspace ON public.client_user_roles(workspace_id);
