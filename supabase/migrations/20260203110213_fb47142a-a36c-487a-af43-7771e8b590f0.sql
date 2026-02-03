-- Drop the existing check constraint
ALTER TABLE public.crm_activities 
DROP CONSTRAINT IF EXISTS crm_activities_entity_type_check;

-- Create new check constraint with 'meeting' entity type added
ALTER TABLE public.crm_activities 
ADD CONSTRAINT crm_activities_entity_type_check 
CHECK (entity_type = ANY (ARRAY[
  'lead'::text, 
  'opportunity'::text, 
  'contact'::text, 
  'company'::text, 
  'conversation'::text,
  'meeting'::text
]));