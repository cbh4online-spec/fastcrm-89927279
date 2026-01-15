-- Add auto-tagging columns to conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS ai_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS user_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags_auto_assigned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tags_assigned_at TIMESTAMP WITH TIME ZONE;

-- Create index for tag searching
CREATE INDEX IF NOT EXISTS idx_conversations_ai_tags ON public.conversations USING GIN(ai_tags);
CREATE INDEX IF NOT EXISTS idx_conversations_user_tags ON public.conversations USING GIN(user_tags);