ALTER TABLE public.price_optimization_logs
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refs_count INTEGER,
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS limited_by_margin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;

-- Backfill: histórico existente passa a refletir o estado real.
UPDATE public.price_optimization_logs
   SET status = CASE WHEN applied THEN 'applied' ELSE 'superseded' END
 WHERE status = 'pending';

ALTER TABLE public.price_optimization_logs
  ADD CONSTRAINT price_optimization_logs_status_check
  CHECK (status IN ('pending', 'applied', 'dismissed', 'superseded'));

CREATE INDEX IF NOT EXISTS price_optimization_logs_ws_product_status_idx
  ON public.price_optimization_logs (workspace_id, product_id, status);

CREATE INDEX IF NOT EXISTS price_optimization_logs_pending_idx
  ON public.price_optimization_logs (workspace_id, status, expires_at DESC);