UPDATE public.checkout_funnel_steps s SET offer_id = NULL WHERE offer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.checkout_offers o WHERE o.id = s.offer_id);

ALTER TABLE public.checkout_funnel_steps
  ADD CONSTRAINT checkout_funnel_steps_offer_id_fkey
  FOREIGN KEY (offer_id) REFERENCES public.checkout_offers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_checkout_funnel_steps_offer ON public.checkout_funnel_steps(offer_id);
CREATE INDEX IF NOT EXISTS idx_checkout_order_bumps_offer ON public.checkout_order_bumps(offer_id);