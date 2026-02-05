-- Add price_tier_id to contacts table for tiered pricing
ALTER TABLE contacts 
ADD COLUMN price_tier_id uuid REFERENCES client_price_tiers(id);

COMMENT ON COLUMN contacts.price_tier_id IS 
  'Escalão de preço atribuído ao contacto para cálculo de descontos';

-- Create index for performance
CREATE INDEX idx_contacts_price_tier_id ON contacts(price_tier_id) WHERE price_tier_id IS NOT NULL;