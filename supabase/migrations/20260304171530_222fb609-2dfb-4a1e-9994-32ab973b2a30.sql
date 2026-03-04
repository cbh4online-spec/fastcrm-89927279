
ALTER TABLE public.c2c_messages ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text';
ALTER TABLE public.c2c_messages ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
