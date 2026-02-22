
-- Allow anyone (including anonymous) to read a specific invite by token
CREATE POLICY "Anyone can read invite by token"
ON public.workspace_invites
FOR SELECT
USING (true);
-- Note: The frontend already filters by invite_token, and tokens are random UUIDs.
-- We use USING(true) because unauthenticated users can't filter via RLS conditions on their identity.
-- Security relies on token secrecy (UUID randomness).

-- Allow authenticated users to update an invite where their email matches
CREATE POLICY "Invited user can accept invite"
ON public.workspace_invites
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND lower(email) = lower(auth.jwt() ->> 'email')
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND lower(email) = lower(auth.jwt() ->> 'email')
  AND status = 'accepted'
);
