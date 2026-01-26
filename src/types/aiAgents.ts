/**
 * AI Agents Architecture - Type Definitions
 * 
 * Central type contracts for the CRM Decision Intelligence Layer.
 * All agents MUST follow these output contracts for auditability.
 */

// =============================================================================
// AGENT TYPES
// =============================================================================

export type AgentType = 'lead' | 'contact' | 'opportunity' | 'client';

export type AgentTrigger = 
  | 'manual'           // User clicked "Analyze"
  | 'entity_created'   // New entity added
  | 'status_changed'   // Status/stage changed
  | 'time_based'       // Scheduled analysis
  | 'message_received'; // New message in conversation

export type ConfidenceLevel = 'low' | 'medium' | 'high';

// =============================================================================
// ACTION TYPES PER AGENT
// =============================================================================

export type LeadAgentAction = 
  | 'reply_manual'
  | 'send_template'
  | 'create_opportunity'
  | 'qualify'
  | 'nurture'
  | 'archive'
  | 'schedule_followup'
  | 'request_info';

export type ContactAgentAction =
  | 'update_profile'
  | 'merge_duplicate'
  | 'enrich_data'
  | 'schedule_outreach'
  | 'add_to_segment';

export type OpportunityAgentAction =
  | 'send_proposal'
  | 'schedule_meeting'
  | 'follow_up_urgently'
  | 'add_stakeholder'
  | 'negotiate_terms'
  | 'close_won'
  | 'close_lost'
  | 'update_probability';

export type ClientAgentAction =
  | 'check_satisfaction'
  | 'upsell_opportunity'
  | 'retention_outreach'
  | 'schedule_review'
  | 'escalate_issue'
  | 'renew_contract';

export type AgentActionType = 
  | LeadAgentAction 
  | ContactAgentAction 
  | OpportunityAgentAction 
  | ClientAgentAction;

// =============================================================================
// REASONING TRACE (Auditability)
// =============================================================================

export interface ReasoningStep {
  step: number;
  action: string;        // What the agent did
  input: string;         // Data/context used
  output: string;        // Result of this step
  confidence: number;    // 0-1 confidence for this step
  durationMs?: number;
  toolUsed?: string;
}

// =============================================================================
// OUTPUT CONTRACT (MANDATORY)
// =============================================================================

export interface AgentOutput {
  // Business language outputs
  executiveSummary: string;      // Plain language summary
  statusAssessment: string;      // Current state description
  keySignals: string[];          // Observed positive/neutral signals
  riskIndicators: string[];      // Warning signs (if any)
  recommendedAction: string;     // Next best action description
  recommendedActionType: AgentActionType;
  confidenceLevel: ConfidenceLevel;
  
  // Optional enrichment
  score?: number;                // 0-100 score if applicable
  temperature?: 'cold' | 'warm' | 'hot';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  nextReviewDate?: string;       // ISO date for follow-up
}

// =============================================================================
// EXECUTION RECORDS
// =============================================================================

export interface AgentExecution {
  id: string;
  workspaceId: string;
  agentType: AgentType;
  entityId: string;
  entityType: string;
  triggerType: AgentTrigger;
  
  // Input/Output
  inputSummary: Record<string, unknown>;
  output: AgentOutput;
  reasoningTrace: ReasoningStep[];
  
  // Output contract fields (denormalized for querying)
  executiveSummary: string;
  statusAssessment: string | null;
  keySignals: string[];
  riskIndicators: string[];
  recommendedAction: string | null;
  recommendedActionType: string | null;
  confidenceLevel: ConfidenceLevel | null;
  
  // Performance
  durationMs: number | null;
  tokensUsed: number | null;
  errorMessage: string | null;
  
  createdAt: string;
}

// =============================================================================
// MEMORY SYSTEM
// =============================================================================

export type MemoryType = 'conclusion' | 'user_feedback' | 'important_signal';

export interface AgentMemory {
  id: string;
  workspaceId: string;
  entityId: string;
  entityType: string;
  memoryType: MemoryType;
  content: string;
  relevanceScore: number;  // 0-1
  expiresAt: string | null;
  createdAt: string;
  createdBy: string | null;
}

// =============================================================================
// FEEDBACK SYSTEM
// =============================================================================

export type FeedbackType = 'useful' | 'not_useful' | 'action_taken' | 'action_ignored';

export interface AgentFeedback {
  id: string;
  executionId: string;
  workspaceId: string;
  feedbackType: FeedbackType;
  feedbackNotes: string | null;
  outcome: string | null;        // What actually happened
  createdAt: string;
  createdBy: string | null;
}

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

export interface AgentRequest {
  agentType: AgentType;
  entityId: string;
  entityType: string;
  triggerType: AgentTrigger;
  context?: Record<string, unknown>;
  
  // Optional overrides
  maxReasoningSteps?: number;
  includeHistory?: boolean;
}

export interface AgentResponse {
  success: boolean;
  executionId: string;
  output: AgentOutput;
  reasoningTrace: ReasoningStep[];
  dataSourcesUsed: string[];
  
  // Performance metrics
  durationMs: number;
  tokensUsed: number;
  
  // Error handling
  error?: string;
  partialAnalysis?: boolean;     // True if analysis incomplete
  missingData?: string[];        // What data was needed
}

// =============================================================================
// AGENT CONFIGURATION
// =============================================================================

export interface AgentConfig {
  agentType: AgentType;
  enabled: boolean;
  
  // Execution limits
  maxReasoningIterations: number;
  maxToolCalls: number;
  timeoutMs: number;
  
  // Triggers enabled
  enabledTriggers: AgentTrigger[];
  
  // Rate limiting
  maxExecutionsPerHour: number;
}

// =============================================================================
// TOOL REGISTRY
// =============================================================================

export interface AgentTool {
  name: string;
  description: string;
  category: 'data_retrieval' | 'analytics' | 'scoring' | 'memory';
  allowedAgents: AgentType[];
}

// Default tool registry
export const AGENT_TOOLS: AgentTool[] = [
  {
    name: 'get_entity_data',
    description: 'Retrieve full entity data (lead, contact, company, opportunity)',
    category: 'data_retrieval',
    allowedAgents: ['lead', 'contact', 'opportunity', 'client'],
  },
  {
    name: 'get_conversation_history',
    description: 'Get recent messages from conversations',
    category: 'data_retrieval',
    allowedAgents: ['lead', 'contact', 'opportunity', 'client'],
  },
  {
    name: 'get_previous_conclusions',
    description: 'Retrieve previous agent conclusions for context',
    category: 'memory',
    allowedAgents: ['lead', 'contact', 'opportunity', 'client'],
  },
  {
    name: 'calculate_score',
    description: 'Calculate entity scores (lead score, health score, etc.)',
    category: 'scoring',
    allowedAgents: ['lead', 'contact', 'client'],
  },
  {
    name: 'get_pipeline_context',
    description: 'Get pipeline stage and funnel analytics',
    category: 'analytics',
    allowedAgents: ['opportunity'],
  },
  {
    name: 'get_activity_timeline',
    description: 'Get recent activities and interactions',
    category: 'data_retrieval',
    allowedAgents: ['lead', 'contact', 'opportunity', 'client'],
  },
];

// =============================================================================
// CONTEXT WINDOW TYPES
// =============================================================================

export type ContextTierLevel = 1 | 2 | 3 | 4;
export type ContextStrategyType = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface TokenBudget {
  total: number;
  systemPrompt: number;
  responseBuffer: number;
  available: number;
  used: number;
  remaining: number;
}

export interface ContextMetrics {
  budget: TokenBudget;
  strategy: ContextStrategyType;
  usagePercent: number;
  isHealthy: boolean;
  warnings: string[];
}

// =============================================================================
// HELPERS
// =============================================================================

export function isValidAgentType(type: string): type is AgentType {
  return ['lead', 'contact', 'opportunity', 'client'].includes(type);
}

export function isValidTrigger(trigger: string): trigger is AgentTrigger {
  return ['manual', 'entity_created', 'status_changed', 'time_based', 'message_received'].includes(trigger);
}

export function isValidConfidence(level: string): level is ConfidenceLevel {
  return ['low', 'medium', 'high'].includes(level);
}

export function getConfidenceColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'high': return 'text-green-600';
    case 'medium': return 'text-amber-600';
    case 'low': return 'text-red-600';
  }
}

export function getConfidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case 'high': return 'Alta confiança';
    case 'medium': return 'Confiança média';
    case 'low': return 'Baixa confiança';
  }
}
