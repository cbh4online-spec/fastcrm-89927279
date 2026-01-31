-- Add design_json column to store visual email builder state
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS design_json JSONB;

COMMENT ON COLUMN marketing_campaigns.design_json IS 
'Design visual do email (JSON do EmailBuilder) para permitir re-edição';