
-- Add missing columns to ai_agents first
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_agents' AND column_name='total_executions') THEN
    ALTER TABLE public.ai_agents ADD COLUMN total_executions integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_agents' AND column_name='completed_executions') THEN
    ALTER TABLE public.ai_agents ADD COLUMN completed_executions integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_agents' AND column_name='avg_completion_rate') THEN
    ALTER TABLE public.ai_agents ADD COLUMN avg_completion_rate float;
  END IF;
END $$;

-- Add missing columns to ai_personas
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_personas' AND column_name='slug') THEN
    ALTER TABLE public.ai_personas ADD COLUMN slug text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_personas' AND column_name='avatar_url') THEN
    ALTER TABLE public.ai_personas ADD COLUMN avatar_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_personas' AND column_name='expertise_domain') THEN
    ALTER TABLE public.ai_personas ADD COLUMN expertise_domain text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_personas' AND column_name='backstory') THEN
    ALTER TABLE public.ai_personas ADD COLUMN backstory text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_personas' AND column_name='compiled_system_prompt') THEN
    ALTER TABLE public.ai_personas ADD COLUMN compiled_system_prompt text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_personas' AND column_name='active_in_inbox') THEN
    ALTER TABLE public.ai_personas ADD COLUMN active_in_inbox boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_personas' AND column_name='active_in_copilot') THEN
    ALTER TABLE public.ai_personas ADD COLUMN active_in_copilot boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_personas' AND column_name='active_in_b2b_portal') THEN
    ALTER TABLE public.ai_personas ADD COLUMN active_in_b2b_portal boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_personas' AND column_name='max_response_tokens') THEN
    ALTER TABLE public.ai_personas ADD COLUMN max_response_tokens integer NOT NULL DEFAULT 512;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_personas' AND column_name='temperature') THEN
    ALTER TABLE public.ai_personas ADD COLUMN temperature float NOT NULL DEFAULT 0.7;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_personas' AND column_name='fallback_message') THEN
    ALTER TABLE public.ai_personas ADD COLUMN fallback_message text;
  END IF;
END $$;

-- Now create the function after columns exist
CREATE OR REPLACE FUNCTION public.increment_agent_completion(p_agent_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.ai_agents
  SET
    completed_executions = COALESCE(completed_executions, 0) + 1,
    avg_completion_rate = (COALESCE(completed_executions, 0) + 1)::float / NULLIF(COALESCE(total_executions, 1), 0)
  WHERE id = p_agent_id;
$$;
