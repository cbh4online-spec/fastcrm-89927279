-- Drop the existing check constraint
ALTER TABLE public.crm_activities 
DROP CONSTRAINT IF EXISTS crm_activities_activity_type_check;

-- Create new check constraint with meeting activity types added
ALTER TABLE public.crm_activities 
ADD CONSTRAINT crm_activities_activity_type_check 
CHECK (activity_type = ANY (ARRAY[
  -- Existing types
  'message_sent'::text, 
  'message_received'::text, 
  'status_changed'::text, 
  'stage_changed'::text, 
  'opportunity_created'::text, 
  'opportunity_updated'::text, 
  'opportunity_won'::text, 
  'opportunity_lost'::text, 
  'lead_created'::text, 
  'lead_updated'::text, 
  'lead_contacted'::text, 
  'task_created'::text, 
  'task_completed'::text, 
  'note_added'::text, 
  'tag_added'::text, 
  'tag_removed'::text, 
  'assigned'::text, 
  'automation_triggered'::text, 
  'proposal_sent'::text, 
  'proposal_viewed'::text, 
  'proposal_accepted'::text, 
  'followup_scheduled'::text, 
  'followup_completed'::text, 
  'custom'::text,
  -- New meeting types
  'meeting_scheduled'::text,
  'meeting_confirmed'::text,
  'meeting_completed'::text,
  'meeting_cancelled'::text,
  'meeting_no_show'::text,
  'meeting_outcome'::text
]));