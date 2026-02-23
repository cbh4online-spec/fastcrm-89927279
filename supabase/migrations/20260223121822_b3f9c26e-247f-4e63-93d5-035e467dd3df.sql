
CREATE TABLE public.product_creation_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  workspace_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  response_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  UNIQUE(idempotency_key, workspace_id)
);

ALTER TABLE public.product_creation_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own idempotency keys"
  ON public.product_creation_idempotency FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_idempotency_key_workspace ON public.product_creation_idempotency(idempotency_key, workspace_id);
CREATE INDEX idx_idempotency_expires ON public.product_creation_idempotency(expires_at);
