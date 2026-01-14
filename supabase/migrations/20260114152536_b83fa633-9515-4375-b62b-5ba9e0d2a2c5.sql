-- Add new automation trigger types
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'lead_updated';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'custom_field_updated';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'opportunity_created';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'opportunity_updated';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'contact_created';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'contact_updated';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'company_created';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'company_updated';

-- Add new automation action types
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'assign_owner';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'add_tag';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'create_opportunity';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'update_field';