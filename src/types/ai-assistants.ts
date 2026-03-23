export type VibeProfileTone = 'formal' | 'professional' | 'neutral' | 'friendly' | 'casual';
export type ResponseLength = 'concise' | 'medium' | 'detailed';
export type EmojiUsage = 'none' | 'minimal' | 'moderate' | 'expressive';
export type PersonaRole = 'assistant' | 'sales' | 'support' | 'onboarding';
export type PersonaStatus = 'active' | 'archived' | 'draft';
export type AgentTriggerType = 'manual' | 'new_conversation' | 'keyword' | 'lead_created' | 'form_submitted';
export type AgentStatus = 'draft' | 'active' | 'paused' | 'archived';
export type SessionStatus = 'active' | 'completed' | 'abandoned' | 'error';

export type FlowNodeType = 'message' | 'condition' | 'action' | 'collect_input' | 'end';

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  config: FlowNodeConfig;
  position: { x: number; y: number };
}

export type FlowNodeConfig =
  | MessageNodeConfig
  | ConditionNodeConfig
  | ActionNodeConfig
  | CollectInputNodeConfig
  | EndNodeConfig;

export interface MessageNodeConfig {
  type: 'message';
  content: string;
  delay_seconds?: number;
  use_ai?: boolean;
  ai_prompt?: string;
}

export interface ConditionNodeConfig {
  type: 'condition';
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty';
  value: string;
  true_node_id: string;
  false_node_id: string;
}

export interface ActionNodeConfig {
  type: 'action';
  action: 'create_lead' | 'update_contact' | 'create_task' | 'add_tag' | 'notify_member' | 'end_flow';
  params: Record<string, unknown>;
}

export interface CollectInputNodeConfig {
  type: 'collect_input';
  prompt: string;
  variable_name: string;
  validation?: 'email' | 'phone' | 'text' | 'number';
  next_node_id: string;
}

export interface EndNodeConfig {
  type: 'end';
  closing_message?: string;
}

export interface FlowEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  label?: string;
}

export interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
  entry_node_id: string | null;
}

export interface VibeProfileFull {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  tone: VibeProfileTone;
  formality_level: number;
  response_length: ResponseLength;
  emoji_usage: EmojiUsage;
  language: string;
  vocabulary_notes?: string | null;
  avoid_phrases?: string[] | null;
  preferred_phrases?: string[] | null;
  greeting_template?: string | null;
  closing_template?: string | null;
  system_prompt_fragment?: string | null;
  is_default: boolean;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface AIPersona {
  id: string;
  workspace_id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  avatar_url?: string | null;
  role?: PersonaRole | null;
  expertise_domain?: string | null;
  backstory?: string | null;
  vibe_profile_id?: string | null;
  vibe_profile?: VibeProfileFull | null;
  knowledge_base_ids?: string[] | null;
  max_response_tokens: number;
  temperature: number;
  fallback_message?: string | null;
  compiled_system_prompt?: string | null;
  active_in_inbox: boolean;
  active_in_copilot: boolean;
  active_in_b2b_portal: boolean;
  is_default?: boolean;
  is_active?: boolean;
  status?: PersonaStatus;
  persona_type?: string;
  tone_of_voice?: string;
  system_prompt?: string | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AIAgentFlow {
  id: string;
  workspace_id: string;
  persona_id?: string | null;
  persona?: Pick<AIPersona, 'id' | 'name' | 'avatar_url'> | null;
  name: string;
  description?: string | null;
  trigger_type?: AgentTriggerType;
  trigger_config?: Record<string, unknown>;
  flow_definition?: FlowDefinition;
  total_executions: number;
  completed_executions: number;
  avg_completion_rate?: number | null;
  status?: AgentStatus;
  created_at: string;
  updated_at: string;
}

export interface AIAgentSession {
  id: string;
  workspace_id: string;
  agent_id: string;
  conversation_id?: string | null;
  contact_id?: string | null;
  lead_id?: string | null;
  current_node_id?: string | null;
  context: Record<string, unknown>;
  history: Array<{
    node_id: string;
    role: 'assistant' | 'user';
    content: string;
    timestamp: string;
  }>;
  status: SessionStatus;
  error_message?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonaChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface PersonaChatResponse {
  message: string;
  tokens_used?: number;
}
