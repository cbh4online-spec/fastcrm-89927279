
-- Ensure credit_pricing_rules table exists
CREATE TABLE IF NOT EXISTS public.credit_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  credits_cost INTEGER NOT NULL DEFAULT 1,
  module TEXT NOT NULL DEFAULT 'general',
  category TEXT NOT NULL DEFAULT 'ai',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_pricing_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view active pricing rules' AND tablename = 'credit_pricing_rules') THEN
    CREATE POLICY "Anyone can view active pricing rules" ON public.credit_pricing_rules
      FOR SELECT TO authenticated
      USING (is_active = true);
  END IF;
END $$;

-- Insert brief pricing rules
INSERT INTO public.credit_pricing_rules (action_key, label, description, credits_cost, module, category, is_active)
VALUES
  ('daily_brief', 'Daily Revenue Brief', 'Gerar resumo executivo diário', 2, 'strategy', 'intelligence', true),
  ('weekly_brief', 'Brief Executivo Semanal', 'Gerar brief estratégico semanal', 3, 'strategy', 'intelligence', true)
ON CONFLICT (action_key) DO NOTHING;
