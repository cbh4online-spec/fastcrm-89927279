
-- Helper RPC to safely increment bot_analytics counters
CREATE OR REPLACE FUNCTION public.increment_bot_analytics(
  p_bot_id       UUID,
  p_workspace_id UUID,
  p_conversations INT DEFAULT 0,
  p_messages_in  INT DEFAULT 0,
  p_messages_out INT DEFAULT 0,
  p_leads        INT DEFAULT 0,
  p_handovers    INT DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.bot_analytics (
    bot_id, workspace_id,
    total_conversations, total_messages_in, total_messages_out,
    total_leads, total_handovers, updated_at
  )
  VALUES (
    p_bot_id, p_workspace_id,
    p_conversations, p_messages_in, p_messages_out,
    p_leads, p_handovers, now()
  )
  ON CONFLICT (bot_id) DO UPDATE SET
    total_conversations = bot_analytics.total_conversations + EXCLUDED.total_conversations,
    total_messages_in   = bot_analytics.total_messages_in   + EXCLUDED.total_messages_in,
    total_messages_out  = bot_analytics.total_messages_out  + EXCLUDED.total_messages_out,
    total_leads         = bot_analytics.total_leads         + EXCLUDED.total_leads,
    total_handovers     = bot_analytics.total_handovers     + EXCLUDED.total_handovers,
    updated_at          = now();
END;
$$;
