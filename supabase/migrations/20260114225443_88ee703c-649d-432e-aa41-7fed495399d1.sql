-- Add AI classification fields to conversations table
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS ai_priority text CHECK (ai_priority IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS ai_intent text CHECK (ai_intent IN ('support', 'sales', 'question', 'follow_up', 'complaint', 'other')),
ADD COLUMN IF NOT EXISTS ai_sentiment text CHECK (ai_sentiment IN ('positive', 'neutral', 'negative')),
ADD COLUMN IF NOT EXISTS ai_classification_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS user_priority text CHECK (user_priority IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS user_intent text CHECK (user_intent IN ('support', 'sales', 'question', 'follow_up', 'complaint', 'other')),
ADD COLUMN IF NOT EXISTS classification_confirmed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS classification_confirmed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS classification_confirmed_by uuid;