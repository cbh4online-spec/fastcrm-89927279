
CREATE TABLE public.c2c_seller_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.c2c_sellers(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.c2c_seller_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage seller notes"
  ON public.c2c_seller_notes FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));
