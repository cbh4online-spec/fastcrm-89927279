-- Function to get count of public tables
CREATE OR REPLACE FUNCTION public.get_public_table_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';
$$;

-- Function to get RLS policy count
CREATE OR REPLACE FUNCTION public.get_rls_policy_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM pg_policies
  WHERE schemaname = 'public';
$$;

-- Function to get trigger count
CREATE OR REPLACE FUNCTION public.get_trigger_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM information_schema.triggers
  WHERE trigger_schema = 'public';
$$;

-- Function to get table details (simplified for audit)
CREATE OR REPLACE FUNCTION public.get_table_details()
RETURNS TABLE(
  name text,
  row_count bigint,
  has_rls boolean,
  policy_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::text as name,
    0::bigint as row_count, -- Placeholder, actual count would be expensive
    t.rowsecurity as has_rls,
    COALESCE(p.policy_count, 0)::integer as policy_count
  FROM pg_tables t
  LEFT JOIN (
    SELECT 
      tablename,
      COUNT(*)::integer as policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
  ) p ON t.tablename = p.tablename
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$$;