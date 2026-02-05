-- Add commission fields to opportunities table
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS commission_percentage numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_amount numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_notes text;

COMMENT ON COLUMN opportunities.commission_percentage IS 'Percentage of deal value as commission';
COMMENT ON COLUMN opportunities.commission_amount IS 'Fixed commission amount for this deal';
COMMENT ON COLUMN opportunities.commission_notes IS 'Notes about commission calculation or payment';