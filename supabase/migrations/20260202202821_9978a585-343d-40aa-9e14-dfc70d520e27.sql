-- 1. Workspaces: Permitir leitura pública para propostas publicadas
CREATE POLICY "Public can view workspace for published proposals"
ON public.workspaces
FOR SELECT
TO anon, authenticated
USING (
  id IN (
    SELECT workspace_id FROM public.proposals 
    WHERE status = 'published'
  )
);

-- 2. Contacts: Permitir leitura pública para propostas publicadas
CREATE POLICY "Public can view contact for published proposals"
ON public.contacts
FOR SELECT
TO anon, authenticated
USING (
  id IN (
    SELECT contact_id FROM public.proposals 
    WHERE status = 'published' AND contact_id IS NOT NULL
  )
);

-- 3. Companies: Permitir leitura pública para propostas publicadas
CREATE POLICY "Public can view company for published proposals"
ON public.companies
FOR SELECT
TO anon, authenticated
USING (
  id IN (
    SELECT company_id FROM public.proposals 
    WHERE status = 'published' AND company_id IS NOT NULL
  )
);

-- 4. Proposal Items: Permitir leitura pública para propostas publicadas
CREATE POLICY "Public can view items of published proposals"
ON public.proposal_items
FOR SELECT
TO anon, authenticated
USING (
  proposal_id IN (
    SELECT id FROM public.proposals 
    WHERE status = 'published'
  )
);