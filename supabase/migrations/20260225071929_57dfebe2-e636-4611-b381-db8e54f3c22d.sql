ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'invoice_created';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'invoice_overdue';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'invoice_status_changed';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'due_date_approaching';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'contact_no_activity';

ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'mark_as_at_risk';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'send_overdue_alert';