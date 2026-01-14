-- Expand custom_fields to support contacts and companies
ALTER TABLE public.custom_fields 
DROP CONSTRAINT IF EXISTS custom_fields_entity_type_check;

ALTER TABLE public.custom_fields 
ADD CONSTRAINT custom_fields_entity_type_check 
CHECK (entity_type IN ('lead', 'opportunity', 'contact', 'company'));