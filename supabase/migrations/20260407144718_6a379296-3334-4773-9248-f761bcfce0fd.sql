ALTER TABLE public.ai_agent_memory DROP CONSTRAINT ai_agent_memory_memory_type_check;

ALTER TABLE public.ai_agent_memory ADD CONSTRAINT ai_agent_memory_memory_type_check CHECK (memory_type = ANY (ARRAY['conclusion'::text, 'user_feedback'::text, 'important_signal'::text, 'risk'::text, 'pattern'::text, 'fact'::text, 'preference'::text]));