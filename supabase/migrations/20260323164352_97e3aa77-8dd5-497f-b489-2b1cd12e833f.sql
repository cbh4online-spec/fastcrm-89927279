ALTER TABLE public.group_members DROP CONSTRAINT IF EXISTS member_entity_check;
ALTER TABLE public.group_members ADD CONSTRAINT member_entity_check CHECK (
  user_id IS NOT NULL OR contact_id IS NOT NULL OR lead_id IS NOT NULL OR telegram_username IS NOT NULL OR telegram_user_id IS NOT NULL
);