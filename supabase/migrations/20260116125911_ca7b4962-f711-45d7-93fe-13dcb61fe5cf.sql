-- Add missing super admin RLS policies (excluding ones that already exist)

-- CONTACTS - Super admin full access (UPDATE, DELETE, INSERT - SELECT already exists)
DROP POLICY IF EXISTS "Super admins can update all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Super admins can delete all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Super admins can insert contacts" ON public.contacts;

CREATE POLICY "Super admins can update all contacts"
ON public.contacts FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all contacts"
ON public.contacts FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert contacts"
ON public.contacts FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- COMPANIES - Super admin full access (UPDATE, DELETE, INSERT - SELECT already exists)
DROP POLICY IF EXISTS "Super admins can update all companies" ON public.companies;
DROP POLICY IF EXISTS "Super admins can delete all companies" ON public.companies;
DROP POLICY IF EXISTS "Super admins can insert companies" ON public.companies;

CREATE POLICY "Super admins can update all companies"
ON public.companies FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all companies"
ON public.companies FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert companies"
ON public.companies FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- LEADS - Super admin full access (UPDATE, DELETE, INSERT - SELECT already exists)
DROP POLICY IF EXISTS "Super admins can update all leads" ON public.leads;
DROP POLICY IF EXISTS "Super admins can delete all leads" ON public.leads;
DROP POLICY IF EXISTS "Super admins can insert leads" ON public.leads;

CREATE POLICY "Super admins can update all leads"
ON public.leads FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all leads"
ON public.leads FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert leads"
ON public.leads FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- OPPORTUNITIES - Super admin full access
DROP POLICY IF EXISTS "Super admins can view all opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Super admins can update all opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Super admins can delete all opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Super admins can insert opportunities" ON public.opportunities;

CREATE POLICY "Super admins can view all opportunities"
ON public.opportunities FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all opportunities"
ON public.opportunities FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all opportunities"
ON public.opportunities FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert opportunities"
ON public.opportunities FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- WORKSPACES - Super admin delete/insert (already has select/update)
DROP POLICY IF EXISTS "Super admins can delete all workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Super admins can insert workspaces" ON public.workspaces;

CREATE POLICY "Super admins can delete all workspaces"
ON public.workspaces FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert workspaces"
ON public.workspaces FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- WORKSPACE_MEMBERS - Super admin full access
DROP POLICY IF EXISTS "Super admins can view all workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Super admins can update all workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Super admins can delete all workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Super admins can insert workspace members" ON public.workspace_members;

CREATE POLICY "Super admins can view all workspace members"
ON public.workspace_members FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all workspace members"
ON public.workspace_members FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all workspace members"
ON public.workspace_members FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert workspace members"
ON public.workspace_members FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- PRODUCTS - Super admin full access
DROP POLICY IF EXISTS "Super admins can view all products" ON public.products;
DROP POLICY IF EXISTS "Super admins can update all products" ON public.products;
DROP POLICY IF EXISTS "Super admins can delete all products" ON public.products;
DROP POLICY IF EXISTS "Super admins can insert products" ON public.products;

CREATE POLICY "Super admins can view all products"
ON public.products FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all products"
ON public.products FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all products"
ON public.products FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- PROPOSALS - Super admin full access
DROP POLICY IF EXISTS "Super admins can view all proposals" ON public.proposals;
DROP POLICY IF EXISTS "Super admins can update all proposals" ON public.proposals;
DROP POLICY IF EXISTS "Super admins can delete all proposals" ON public.proposals;
DROP POLICY IF EXISTS "Super admins can insert proposals" ON public.proposals;

CREATE POLICY "Super admins can view all proposals"
ON public.proposals FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all proposals"
ON public.proposals FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all proposals"
ON public.proposals FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert proposals"
ON public.proposals FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- CRM_ACTIVITIES - Super admin full access
DROP POLICY IF EXISTS "Super admins can view all activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Super admins can update all activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Super admins can delete all activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Super admins can insert activities" ON public.crm_activities;

CREATE POLICY "Super admins can view all activities"
ON public.crm_activities FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all activities"
ON public.crm_activities FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all activities"
ON public.crm_activities FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert activities"
ON public.crm_activities FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- CUSTOM_FIELDS - Super admin full access
DROP POLICY IF EXISTS "Super admins can view all custom fields" ON public.custom_fields;
DROP POLICY IF EXISTS "Super admins can update all custom fields" ON public.custom_fields;
DROP POLICY IF EXISTS "Super admins can delete all custom fields" ON public.custom_fields;
DROP POLICY IF EXISTS "Super admins can insert custom fields" ON public.custom_fields;

CREATE POLICY "Super admins can view all custom fields"
ON public.custom_fields FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all custom fields"
ON public.custom_fields FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all custom fields"
ON public.custom_fields FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert custom fields"
ON public.custom_fields FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- AUTOMATION_RULES - Super admin full access
DROP POLICY IF EXISTS "Super admins can view all automations" ON public.automation_rules;
DROP POLICY IF EXISTS "Super admins can update all automations" ON public.automation_rules;
DROP POLICY IF EXISTS "Super admins can delete all automations" ON public.automation_rules;
DROP POLICY IF EXISTS "Super admins can insert automations" ON public.automation_rules;

CREATE POLICY "Super admins can view all automations"
ON public.automation_rules FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all automations"
ON public.automation_rules FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all automations"
ON public.automation_rules FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert automations"
ON public.automation_rules FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- CONVERSATIONS - Super admin full access
DROP POLICY IF EXISTS "Super admins can view all conversations" ON public.conversations;
DROP POLICY IF EXISTS "Super admins can update all conversations" ON public.conversations;
DROP POLICY IF EXISTS "Super admins can delete all conversations" ON public.conversations;
DROP POLICY IF EXISTS "Super admins can insert conversations" ON public.conversations;

CREATE POLICY "Super admins can view all conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all conversations"
ON public.conversations FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- MESSAGES - Super admin full access
DROP POLICY IF EXISTS "Super admins can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Super admins can update all messages" ON public.messages;
DROP POLICY IF EXISTS "Super admins can delete all messages" ON public.messages;
DROP POLICY IF EXISTS "Super admins can insert messages" ON public.messages;

CREATE POLICY "Super admins can view all messages"
ON public.messages FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all messages"
ON public.messages FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all messages"
ON public.messages FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));