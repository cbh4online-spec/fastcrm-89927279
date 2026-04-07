ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.store_reviews
DROP CONSTRAINT IF EXISTS store_reviews_product_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS store_reviews_one_non_bot_review_per_product_user_idx
ON public.store_reviews (product_id, user_id)
WHERE source <> 'bot';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'store_reviews'
      AND policyname = 'Workspace members can view workspace reviews'
  ) THEN
    CREATE POLICY "Workspace members can view workspace reviews"
    ON public.store_reviews
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.workspace_members wm
        WHERE wm.workspace_id = store_reviews.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'store_reviews'
      AND policyname = 'Workspace members can update workspace reviews'
  ) THEN
    CREATE POLICY "Workspace members can update workspace reviews"
    ON public.store_reviews
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.workspace_members wm
        WHERE wm.workspace_id = store_reviews.workspace_id
          AND wm.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.workspace_members wm
        WHERE wm.workspace_id = store_reviews.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'store_reviews'
      AND policyname = 'Workspace members can delete workspace reviews'
  ) THEN
    CREATE POLICY "Workspace members can delete workspace reviews"
    ON public.store_reviews
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.workspace_members wm
        WHERE wm.workspace_id = store_reviews.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
  END IF;
END $$;