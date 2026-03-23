export type SuggestionType = 'tag' | 'field_value' | 'automation';
export type SuggestionStatus = 'pending' | 'accepted' | 'dismissed' | 'applied' | 'rejected' | 'expired';
export type SuggestionEntityType = 'contact' | 'lead' | 'company' | 'opportunity';

export interface AutomationTrigger {
  event: string;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: string | number | boolean;
  }>;
}

export interface AutomationAction {
  type: 'send_email' | 'create_task' | 'update_field' | 'add_tag' | 'notify' | 'webhook' | 'move_opportunity_stage' | 'assign_owner';
  params: Record<string, unknown>;
  delay_minutes?: number;
}

export interface AISuggestion {
  id: string;
  workspace_id: string;
  suggestion_type: SuggestionType;

  // Entity context
  entity_type?: SuggestionEntityType | string | null;
  entity_id?: string | null;

  // Tag fields
  tag_value?: string | null;
  tag_color?: string | null;

  // Field value fields
  field_name?: string | null;
  field_type?: string | null;
  custom_field_id?: string | null;
  suggested_value?: unknown;
  explanation?: string | null;

  // Automation fields
  automation_title?: string | null;
  automation_description?: string | null;
  automation_trigger?: AutomationTrigger | null;
  automation_actions?: AutomationAction[] | null;
  automation_example?: string | null;

  // Common
  confidence: number;
  reasoning?: string | null;
  status: string;
  applied_at?: string | null;
  dismissed_at?: string | null;
  dismissed_reason?: string | null;
  source_context?: Record<string, unknown> | null;
  created_by_ai?: boolean;
  created_at: string;
  updated_at?: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export interface SuggestionHubStats {
  total_pending: number;
  tags_pending: number;
  fields_pending: number;
  automations_pending: number;
  accepted_last_7_days: number;
  dismissed_last_7_days: number;
}

export interface SuggestionSettings {
  workspace_id: string;
  auto_tags_enabled: boolean;
  field_suggestions_enabled: boolean;
  automation_suggestions_enabled: boolean;
  auto_tag_entities: string[];
  min_confidence: number;
  max_pending_per_entity: number;
}
