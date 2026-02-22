
-- Allow invited users to add themselves to workspace_members when they have a valid pending invite
CREATE POLICY "Invited users can add themselves via invite"
ON public.workspace_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.workspace_invites wi
    WHERE wi.workspace_id = workspace_members.workspace_id
      AND wi.status = 'pending'
      AND wi.expires_at > now()
      AND lower(wi.email) = lower(auth.jwt() ->> 'email')
      AND wi.role::text = workspace_members.role::text
  )
);
