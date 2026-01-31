// Unified Entity Types for CRM
export type EntityType = 'lead' | 'contact' | 'company';

export interface EntityBase {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  source?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  workspace_id: string;
  // AI fields
  ai_temperature?: string | null;
  ai_insight?: string | null;
  ai_next_action?: string | null;
  ai_next_action_type?: string | null;
  ai_analyzed_at?: string | null;
  // Scores
  lead_score?: number | null;
  contact_score?: number | null;
  company_score?: number | null;
  conversion_probability?: number | null;
  estimated_value?: number | null;
}

export interface LeadEntity extends EntityBase {
  status: 'new' | 'in_progress' | 'completed';
  company?: string | null;
}

export interface ContactEntity extends EntityBase {
  company?: string | null;
  job_title?: string | null;
  ai_contact_type?: string | null;
}

export interface CompanyEntity extends EntityBase {
  website?: string | null;
  industry?: string | null;
  size?: string | null;
  address?: string | null;
  annual_revenue?: number | null;
  employee_count?: number | null;
  ai_company_type?: string | null;
}

export type Entity = LeadEntity | ContactEntity | CompanyEntity;

export interface EntityDetailConfig {
  type: EntityType;
  entity: Entity | null;
  isLoading: boolean;
  onUpdate: (data: Partial<Entity>) => Promise<void>;
  onDelete: () => Promise<void>;
  backPath: string;
  backLabel: string;
}

// Entity menu sections
export type MenuSection = 
  | 'overview' 
  | 'insights' 
  | 'timeline' 
  | 'notes' 
  | 'messages' 
  | 'tasks'
  | 'opportunities'
  | 'proposals'
  | 'payments'
  | 'details'
  | 'custom-fields'
  | 'history'
  | 'contacts'
  | 'automations'
  | 'credit'
  | 'orders'; // B2B Order Notes

export interface MenuItemConfig {
  id: MenuSection;
  label: string;
  icon: string;
  visible: boolean;
  emptyStateMessage?: string;
}

// AI Suggestion action types
export interface AISuggestionAction {
  id: string;
  type: 'follow_up' | 'convert' | 'create_opportunity' | 'send_message' | 'add_task' | 'update_field';
  label: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  data?: Record<string, unknown>;
}
