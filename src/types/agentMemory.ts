/**
 * Agent Memory System - Type Definitions
 * 
 * Tiered memory architecture for CRM AI agents.
 * Supports short-term, entity-level, and strategic memories.
 */

// =============================================================================
// MEMORY TIERS
// =============================================================================

export type MemoryTier = 'short_term' | 'entity' | 'strategic';

// =============================================================================
// MEMORY TYPES
// =============================================================================

export type MemoryType = 
  | 'conclusion'       // Agent final conclusion
  | 'user_feedback'    // User validation/correction
  | 'important_signal' // Key signal detected
  | 'fact'             // Verified fact about entity
  | 'preference'       // Known preference
  | 'pattern'          // Behavioral pattern
  | 'objection'        // Recorded objection
  | 'risk';            // Identified risk

// =============================================================================
// MEMORY CATEGORIES
// =============================================================================

export type MemoryCategory = 
  | 'contact_preference'  // How they prefer to be contacted
  | 'decision_criteria'   // What influences their decisions
  | 'relationship'        // Relationship dynamics
  | 'timeline'            // Time-related patterns
  | 'price_sensitivity'   // Price/value concerns
  | 'competitive'         // Competitor mentions
  | 'product_interest'    // Product/service interests
  | 'general';            // Other

// =============================================================================
// MEMORY SOURCE
// =============================================================================

export type MemorySource = 
  | 'agent_conclusion'
  | 'user_input'
  | 'conversation_analysis'
  | 'pattern_detection'
  | 'consolidation';

// =============================================================================
// ENTITY MEMORY
// =============================================================================

export interface EntityMemory {
  id: string;
  workspaceId: string;
  entityId: string;
  entityType: string;
  
  // Content
  memoryType: MemoryType;
  memoryCategory: MemoryCategory;
  content: string;
  
  // Scoring
  relevanceScore: number;      // 0-1, base relevance
  semanticScore?: number;      // 0-1, similarity to query
  combinedScore?: number;      // Weighted combination
  
  // Provenance
  sourceType: MemorySource;
  sourceExecutionId?: string;
  
  // Validation
  isValidated: boolean;
  validatedBy?: string;
  validatedAt?: string;
  
  // Versioning
  version: number;
  supersededBy?: string;
  
  // Usage tracking
  accessCount: number;
  lastAccessedAt?: string;
  
  // Lifecycle
  expiresAt?: string;
  createdAt: string;
  createdBy?: string;
}

// =============================================================================
// STRATEGIC MEMORY
// =============================================================================

export type StrategicPatternType = 
  | 'objection'    // Common objections
  | 'conversion'   // Conversion patterns
  | 'churn'        // Churn indicators
  | 'success'      // Success patterns
  | 'failure'      // Failure patterns
  | 'preference'   // Common preferences
  | 'behavior';    // Behavioral patterns

export interface StrategicMemory {
  id: string;
  workspaceId: string;
  
  // Pattern identification
  patternType: StrategicPatternType;
  patternDescription: string;
  
  // Context
  entityTypes: string[];
  conditions: Record<string, unknown>;
  
  // Statistics
  occurrenceCount: number;
  confidenceScore: number;  // 0-1
  lastOccurrenceAt: string;
  
  // Derived insights
  recommendedActions: string[];
  contraindicatedActions: string[];
  
  // Lifecycle
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// MEMORY RETRIEVAL
// =============================================================================

export interface MemoryRetrievalRequest {
  entityId: string;
  entityType: string;
  
  // Filtering
  memoryTypes?: MemoryType[];
  minRelevance?: number;
  includeExpired?: boolean;
  
  // Semantic search
  queryText?: string;           // Will be embedded for semantic search
  queryEmbedding?: number[];    // Pre-computed embedding
  
  // Limits
  maxResults?: number;
  
  // Options
  includeStrategic?: boolean;   // Include workspace-level patterns
  onlyValidated?: boolean;      // Only validated memories
}

export interface MemoryRetrievalResponse {
  success: boolean;
  memories: EntityMemory[];
  strategicMemories?: StrategicMemory[];
  promptContext: MemoryPromptContext;
  
  // Metadata
  metadata: {
    totalRetrieved: number;
    usedSemanticSearch: boolean;
    queryText?: string;
  };
}

// =============================================================================
// MEMORY PROMPT CONTEXT
// =============================================================================

export interface MemoryPromptContext {
  // Labeled sections for prompt injection
  knownFacts: string[];         // Verified facts about entity
  preferences: string[];        // Known preferences
  historicalPatterns: string[]; // Observed patterns
  recentSignals: string[];      // Recent important signals
  risks: string[];              // Known risks
  
  // Confidence
  overallConfidence: 'high' | 'medium' | 'low';
  staleDataWarning?: string;
}

// =============================================================================
// MEMORY STORAGE
// =============================================================================

export interface StoreMemoryRequest {
  workspaceId: string;
  entityId: string;
  entityType: string;
  memoryType: MemoryType;
  content: string;
  relevanceScore?: number;
  memoryCategory?: MemoryCategory;
  sourceExecutionId?: string;
  expiresInDays?: number;
}

export interface StoreMemoryResponse {
  success: boolean;
  memoryId: string;
  message?: string;
  error?: string;
}

// =============================================================================
// MEMORY STATS
// =============================================================================

export interface MemoryStats {
  totalMemories: number;
  activeMemories: number;
  validatedMemories: number;
  averageRelevance: number;
  memoryTypes: Record<string, number>;
  oldestMemory?: string;
  newestMemory?: string;
}

// =============================================================================
// VALIDATION
// =============================================================================

export interface ValidateMemoryRequest {
  memoryId: string;
  isValid: boolean;
}

export interface ValidateMemoryResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// =============================================================================
// CONSOLIDATION
// =============================================================================

export interface ConsolidateRequest {
  workspaceId: string;
  entityId?: string;
  entityType?: string;
}

export interface ConsolidateResponse {
  success: boolean;
  consolidated: number;
  message?: string;
  error?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

export function getMemoryTypeLabel(type: MemoryType): string {
  const labels: Record<MemoryType, string> = {
    conclusion: 'Conclusão',
    user_feedback: 'Feedback do utilizador',
    important_signal: 'Sinal importante',
    fact: 'Facto',
    preference: 'Preferência',
    pattern: 'Padrão',
    objection: 'Objeção',
    risk: 'Risco',
  };
  return labels[type] || type;
}

export function getMemoryTypeColor(type: MemoryType): string {
  const colors: Record<MemoryType, string> = {
    conclusion: 'bg-blue-100 text-blue-800',
    user_feedback: 'bg-green-100 text-green-800',
    important_signal: 'bg-amber-100 text-amber-800',
    fact: 'bg-slate-100 text-slate-800',
    preference: 'bg-purple-100 text-purple-800',
    pattern: 'bg-indigo-100 text-indigo-800',
    objection: 'bg-red-100 text-red-800',
    risk: 'bg-orange-100 text-orange-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
}

export function getCategoryLabel(category: MemoryCategory): string {
  const labels: Record<MemoryCategory, string> = {
    contact_preference: 'Preferência de contacto',
    decision_criteria: 'Critérios de decisão',
    relationship: 'Relacionamento',
    timeline: 'Linha temporal',
    price_sensitivity: 'Sensibilidade ao preço',
    competitive: 'Competitivo',
    product_interest: 'Interesse em produto',
    general: 'Geral',
  };
  return labels[category] || category;
}

export function formatMemoryAge(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Há ${Math.floor(diffDays / 30)} meses`;
  return `Há ${Math.floor(diffDays / 365)} anos`;
}

export function getConfidenceLabel(confidence: 'high' | 'medium' | 'low'): string {
  const labels: Record<string, string> = {
    high: 'Alta confiança',
    medium: 'Confiança média',
    low: 'Baixa confiança',
  };
  return labels[confidence] || confidence;
}

export function getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
  const colors: Record<string, string> = {
    high: 'text-green-600',
    medium: 'text-amber-600',
    low: 'text-red-600',
  };
  return colors[confidence] || 'text-gray-600';
}
