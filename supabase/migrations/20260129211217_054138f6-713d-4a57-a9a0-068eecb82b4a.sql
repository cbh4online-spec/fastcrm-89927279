-- Drop and recreate the channel check constraint to include 'messenger'
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_channel_check;

ALTER TABLE public.conversations ADD CONSTRAINT conversations_channel_check 
CHECK (channel IN ('whatsapp', 'sms', 'email', 'instagram', 'facebook', 'messenger', 'live_chat', 'web_widget', 'phone', 'other'));