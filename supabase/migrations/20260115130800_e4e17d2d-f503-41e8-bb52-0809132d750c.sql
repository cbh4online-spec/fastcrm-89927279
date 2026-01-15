-- Add new automation triggers for form_submitted, score_changed, temperature_changed
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'form_submitted';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'lead_score_changed';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'lead_temperature_changed';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'contact_score_changed';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'contact_temperature_changed';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'company_score_changed';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'company_temperature_changed';