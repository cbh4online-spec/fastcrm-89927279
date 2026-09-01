ALTER TABLE public.entity_activities
  DROP CONSTRAINT IF EXISTS entity_activities_activity_type_check;

ALTER TABLE public.entity_activities
  ADD CONSTRAINT entity_activities_activity_type_check
  CHECK (activity_type = ANY (ARRAY[
    'created','updated','status_change','stage_change','note_added',
    'task_created','task_completed','email_sent','email_received',
    'call_made','call_received','meeting_scheduled','meeting_completed',
    'opportunity_created','opportunity_won','opportunity_lost',
    'invoice_sent','invoice_paid','document_uploaded','proposal_sent',
    'proposal_viewed','tag_added','tag_removed','assigned','custom',
    'message_sent','message_received','whatsapp_sent','whatsapp_received',
    'consent_granted','consent_revoked','workflow_step'
  ]::text[]));