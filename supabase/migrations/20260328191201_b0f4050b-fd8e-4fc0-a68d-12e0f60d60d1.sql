ALTER TABLE public.verticals
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS target_audience text,
  ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pain_points text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS value_proposition text,
  ADD COLUMN IF NOT EXISTS avg_ticket numeric,
  ADD COLUMN IF NOT EXISTS market_size text,
  ADD COLUMN IF NOT EXISTS priority integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS default_cta text,
  ADD COLUMN IF NOT EXISTS notes text;