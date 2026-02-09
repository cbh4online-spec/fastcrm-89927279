
-- Add contact_id column to store_orders for CRM tracking
ALTER TABLE public.store_orders 
ADD COLUMN contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX idx_store_orders_contact_id ON public.store_orders(contact_id);
