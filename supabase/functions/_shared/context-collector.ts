/**
 * Context Collector - Data Collection & Priority Sorting
 * 
 * Responsibilities:
 * - Collect context from multiple sources
 * - Assign priority tiers
 * - Sort by relevance and importance
 * - Mark data for compression if needed
 */

import { estimateTokens } from './context-manager.ts';

// =============================================================================
// TYPES
// =============================================================================

export type ContextTierLevel = 1 | 2 | 3 | 4;

export type ContextSource =
  | 'live_entity'
  | 'risk_indicators'
  | 'guardrails'
  | 'validated_memory'
  | 'high_relevance_facts'
  | 'recent_conclusions'
  | 'patterns'
  | 'preferences'
  | 'interaction_history'
  | 'important_signals'
  | 'old_memories'
  | 'low_relevance'
  | 'redundant'
  | 'rag_historical'    // RAG: Historical outcomes
  | 'rag_pattern'       // RAG: Strategic patterns
  | 'rag_knowledge';    // RAG: Knowledge base

export interface ContextItem {
  id: string;
  source: ContextSource;
  tier: ContextTierLevel;
  content: string;
  tokenCount: number;
  relevanceScore: number;
  timestamp: string;
  isLiveData: boolean;
  isValidated?: boolean;
  category?: string;
  priority: number;
}

export interface EntityData {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  source?: string;
  temperature?: string;
  score?: number;
  value?: number;
  probability?: number;
  stage?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface MemoryData {
  id: string;
  content: string;
  memory_type: string;
  memory_category?: string;
  relevance_score: number;
  is_validated?: boolean;
  created_at: string;
  expires_at?: string;
}

// =============================================================================
// TIER DEFINITIONS
// =============================================================================

/**
 * TIER 1 - NEVER COMPRESSED (Critical Priority)
 * - Live entity state (current CRM data)
 * - Active risk indicators
 * - System guardrails/constraints
 */
const TIER_1_SOURCES: ContextSource[] = [
  'live_entity',
  'risk_indicators',
  'guardrails',
];

/**
 * TIER 2 - COMPRESSIBLE (High Priority)
 * - Validated memories (is_validated = true)
 * - High relevance facts (> 0.7)
 * - Recent conclusions (< 30 days)
 */
const TIER_2_SOURCES: ContextSource[] = [
  'validated_memory',
  'high_relevance_facts',
  'recent_conclusions',
];

/**
 * TIER 3 - SUMMARIZABLE (Medium Priority)
 * - Patterns and preferences
 * - Condensed interaction history
 * - Important signals
 */
const TIER_3_SOURCES: ContextSource[] = [
  'patterns',
  'preferences',
  'interaction_history',
  'important_signals',
];

/**
 * TIER 4 - DISCARDABLE (Low Priority)
 * - Old memories (> 60 days)
 * - Low relevance (< 0.4)
 * - Redundant data
 */
const TIER_4_SOURCES: ContextSource[] = [
  'old_memories',
  'low_relevance',
  'redundant',
];

// =============================================================================
// PRIORITY CALCULATION
// =============================================================================

/**
 * Calculate priority score for a context item
 * Higher score = higher priority (0-200)
 */
export function calculatePriority(item: Omit<ContextItem, 'priority'>): number {
  let score = 0;
  
  // Base score by tier (TIER 1 = 100, TIER 4 = 25)
  score += (5 - item.tier) * 25;
  
  // Boost by relevance score (0-30 points)
  score += item.relevanceScore * 30;
  
  // Boost by freshness
  const daysSinceCreation = getDaysSince(item.timestamp);
  if (daysSinceCreation < 7) score += 20;
  else if (daysSinceCreation < 30) score += 10;
  else if (daysSinceCreation > 60) score -= 10;
  
  // Maximum boost for live data (always highest priority)
  if (item.isLiveData) score = 200;
  
  // Validation boost
  if (item.isValidated) score += 15;
  
  return Math.max(0, Math.min(200, score));
}

/**
 * Calculate days since a timestamp
 */
function getDaysSince(timestamp: string): number {
  if (!timestamp) return 999;
  const date = new Date(timestamp);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// =============================================================================
// CONTEXT COLLECTION
// =============================================================================

/**
 * Determine tier for a memory based on its properties
 */
function getMemoryTier(memory: MemoryData): ContextTierLevel {
  const daysSince = getDaysSince(memory.created_at);
  
  // TIER 2: Validated or high relevance or recent
  if (memory.is_validated) return 2;
  if (memory.relevance_score >= 0.7) return 2;
  if (daysSince < 30 && memory.memory_type === 'conclusion') return 2;
  
  // TIER 3: Patterns, preferences, signals
  if (['pattern', 'preference', 'signal'].includes(memory.memory_type)) return 3;
  if (memory.relevance_score >= 0.4 && daysSince <= 60) return 3;
  
  // TIER 4: Old or low relevance
  return 4;
}

/**
 * Determine source type for a memory
 */
function getMemorySource(memory: MemoryData): ContextSource {
  if (memory.is_validated) return 'validated_memory';
  if (memory.relevance_score >= 0.7) return 'high_relevance_facts';
  
  const daysSince = getDaysSince(memory.created_at);
  if (daysSince < 30 && memory.memory_type === 'conclusion') return 'recent_conclusions';
  
  if (memory.memory_type === 'pattern') return 'patterns';
  if (memory.memory_type === 'preference') return 'preferences';
  if (memory.memory_type === 'risk') return 'risk_indicators';
  
  if (daysSince > 60) return 'old_memories';
  if (memory.relevance_score < 0.4) return 'low_relevance';
  
  return 'important_signals';
}

/**
 * Collect context from entity data (TIER 1)
 */
export function collectEntityContext(entity: EntityData, entityType: string): ContextItem {
  const content = formatEntityData(entity, entityType);
  const tokenCount = estimateTokens(content);
  
  const item: Omit<ContextItem, 'priority'> = {
    id: `entity_${entity.id}`,
    source: 'live_entity',
    tier: 1,
    content,
    tokenCount,
    relevanceScore: 1.0,
    timestamp: entity.updated_at || new Date().toISOString(),
    isLiveData: true,
    isValidated: true,
    category: 'entity_data',
  };
  
  return { ...item, priority: calculatePriority(item) };
}

/**
 * Format entity data for context
 */
function formatEntityData(entity: EntityData, entityType: string): string {
  const lines: string[] = [];
  
  // Common fields
  if (entity.name) lines.push(`Nome: ${entity.name}`);
  if (entity.email) lines.push(`Email: ${entity.email}`);
  if (entity.phone) lines.push(`Telefone: ${entity.phone}`);
  if (entity.status) lines.push(`Estado: ${entity.status}`);
  
  // Lead specific
  if (entityType === 'lead') {
    if (entity.source) lines.push(`Origem: ${entity.source}`);
    if (entity.temperature) lines.push(`Temperatura: ${entity.temperature}`);
    if (entity.score) lines.push(`Score: ${entity.score}`);
  }
  
  // Opportunity specific
  if (entityType === 'opportunity') {
    if (entity.value) lines.push(`Valor: €${entity.value.toLocaleString()}`);
    if (entity.probability) lines.push(`Probabilidade: ${entity.probability}%`);
    if (entity.stage) lines.push(`Etapa: ${entity.stage}`);
  }
  
  // Timestamps
  if (entity.created_at) {
    const days = getDaysSince(entity.created_at);
    lines.push(`Criado: há ${days} dias`);
  }
  if (entity.updated_at) {
    const days = getDaysSince(entity.updated_at);
    lines.push(`Última atualização: há ${days} dias`);
  }
  
  return lines.join('\n');
}

/**
 * Collect context from memories (TIER 2-4)
 */
export function collectMemoryContext(memories: MemoryData[]): ContextItem[] {
  return memories.map((memory) => {
    const tier = getMemoryTier(memory);
    const source = getMemorySource(memory);
    const tokenCount = estimateTokens(memory.content);
    
    const item: Omit<ContextItem, 'priority'> = {
      id: `memory_${memory.id}`,
      source,
      tier,
      content: memory.content,
      tokenCount,
      relevanceScore: memory.relevance_score,
      timestamp: memory.created_at,
      isLiveData: false,
      isValidated: memory.is_validated || false,
      category: memory.memory_category,
    };
    
    return { ...item, priority: calculatePriority(item) };
  });
}

/**
 * Collect guardrails context (TIER 1)
 */
export function collectGuardrailsContext(agentType: string): ContextItem {
  const content = getAgentGuardrails(agentType);
  const tokenCount = estimateTokens(content);
  
  const item: Omit<ContextItem, 'priority'> = {
    id: 'guardrails',
    source: 'guardrails',
    tier: 1,
    content,
    tokenCount,
    relevanceScore: 1.0,
    timestamp: new Date().toISOString(),
    isLiveData: true,
    isValidated: true,
    category: 'system',
  };
  
  return { ...item, priority: calculatePriority(item) };
}

/**
 * Get agent-specific guardrails
 */
function getAgentGuardrails(agentType: string): string {
  const baseRules = [
    'Nunca inventes dados que não foram fornecidos',
    'Não faças promessas em nome do negócio',
    'Todas as recomendações devem ser explicadas',
    'Confia nos dados ao vivo sobre memórias antigas',
  ];
  
  const agentRules: Record<string, string[]> = {
    lead: [
      'Foca na qualificação e próximo passo',
      'Identifica sinais de interesse e objeções',
    ],
    opportunity: [
      'Prioriza análise de probabilidade e riscos',
      'Considera tempo no funil e atividade recente',
    ],
    client: [
      'Avalia saúde da relação e risco de churn',
      'Identifica oportunidades de upsell',
    ],
    contact: [
      'Analisa histórico de interações',
      'Identifica preferências de comunicação',
    ],
  };
  
  const rules = [...baseRules, ...(agentRules[agentType] || [])];
  return rules.map((r) => `• ${r}`).join('\n');
}

// =============================================================================
// SORTING & FILTERING
// =============================================================================

/**
 * Sort context items by priority (descending)
 */
export function sortByPriority(items: ContextItem[]): ContextItem[] {
  return [...items].sort((a, b) => b.priority - a.priority);
}

/**
 * Filter items by tier
 */
export function filterByTier(items: ContextItem[], tiers: ContextTierLevel[]): ContextItem[] {
  return items.filter((item) => tiers.includes(item.tier));
}

/**
 * Get items within token budget
 */
export function fitToBudget(items: ContextItem[], maxTokens: number): {
  included: ContextItem[];
  excluded: ContextItem[];
  totalTokens: number;
} {
  const sorted = sortByPriority(items);
  const included: ContextItem[] = [];
  const excluded: ContextItem[] = [];
  let totalTokens = 0;
  
  for (const item of sorted) {
    if (totalTokens + item.tokenCount <= maxTokens) {
      included.push(item);
      totalTokens += item.tokenCount;
    } else {
      excluded.push(item);
    }
  }
  
  return { included, excluded, totalTokens };
}

// =============================================================================
// FULL COLLECTION FLOW
// =============================================================================

export interface CollectionResult {
  items: ContextItem[];
  totalTokens: number;
  tierCounts: Record<ContextTierLevel, number>;
  warnings: string[];
}

/**
 * Collect all context for an entity
 */
export function collectAllContext(
  entity: EntityData,
  entityType: string,
  memories: MemoryData[],
  agentType: string
): CollectionResult {
  const warnings: string[] = [];
  const items: ContextItem[] = [];
  
  // Collect TIER 1: Guardrails
  items.push(collectGuardrailsContext(agentType));
  
  // Collect TIER 1: Entity data
  items.push(collectEntityContext(entity, entityType));
  
  // Collect TIER 2-4: Memories
  if (memories.length > 0) {
    items.push(...collectMemoryContext(memories));
  } else {
    warnings.push('No memories available for this entity');
  }
  
  // Sort by priority
  const sorted = sortByPriority(items);
  
  // Calculate totals
  const totalTokens = sorted.reduce((sum, item) => sum + item.tokenCount, 0);
  const tierCounts: Record<ContextTierLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  sorted.forEach((item) => tierCounts[item.tier]++);
  
  return {
    items: sorted,
    totalTokens,
    tierCounts,
    warnings,
  };
}
