/**
 * Prompt Assembler - Structured Prompt Building
 * 
 * Responsibilities:
 * - Structure prompt with mandatory sections
 * - Apply anti-pattern prevention (lost-in-the-middle)
 * - Include context metadata
 * - Format final output
 * 
 * Structure:
 * [CONSTRAINTS & GUARDRAILS]    ← START (most important)
 * [CURRENT ENTITY DATA]
 * [KNOWN FACTS & VALIDATED MEMORY]
 * [HISTORICAL PATTERNS]
 * [CONTEXT METADATA]
 * [AGENT TASK & OBJECTIVE]      ← END (most important)
 */

import { estimateTokens, TokenBudget, AgentType } from './context-manager.ts';
import { ContextItem, ContextTierLevel } from './context-collector.ts';

// =============================================================================
// TYPES
// =============================================================================

export interface PromptSections {
  constraints: string;
  currentEntityData: string;
  knownFacts: string;
  historicalPatterns: string;
  contextMetadata: string;
  agentTask: string;
}

export interface ContextMetadata {
  strategy: 'SMALL' | 'MEDIUM' | 'LARGE';
  tiersIncluded: ContextTierLevel[];
  itemsIncluded: number;
  itemsDiscarded: number;
  dataFreshness: string;
  freshnessStatus: 'fresh' | 'stale' | 'expired';
  overallConfidence: 'high' | 'medium' | 'low';
  tokenUsage: {
    used: number;
    available: number;
    percentage: number;
  };
  warnings: string[];
}

export interface AssembledPrompt {
  systemPrompt: string;
  userPrompt: string;
  fullPrompt: string;
  totalTokens: number;
  sections: PromptSections;
  metadata: ContextMetadata;
}

// =============================================================================
// SECTION BUILDERS
// =============================================================================

/**
 * Build constraints section (TIER 1 guardrails)
 */
function buildConstraintsSection(items: ContextItem[]): string {
  const guardrails = items.find((i) => i.source === 'guardrails');
  
  if (!guardrails) {
    return `Tu és um agente de análise de CRM. Regras obrigatórias:
• Nunca inventes dados que não foram fornecidos
• Não faças promessas em nome do negócio
• Todas as recomendações devem ser explicadas
• Confia nos dados ao vivo sobre memórias antigas`;
  }
  
  return guardrails.content;
}

/**
 * Build current entity data section (TIER 1 live data)
 */
function buildEntityDataSection(items: ContextItem[]): string {
  const entityItem = items.find((i) => i.source === 'live_entity');
  
  if (!entityItem) {
    return 'Dados da entidade não disponíveis.';
  }
  
  return entityItem.content;
}

/**
 * Build known facts section (TIER 2 validated memories)
 */
function buildKnownFactsSection(items: ContextItem[]): string {
  const tier2Items = items.filter(
    (i) => i.tier === 2 || i.isValidated
  );
  
  if (tier2Items.length === 0) {
    return 'Sem factos validados disponíveis.';
  }
  
  return tier2Items
    .map((i) => `• ${i.content}`)
    .join('\n');
}

/**
 * Build historical patterns section (TIER 3)
 */
function buildHistoricalPatternsSection(items: ContextItem[]): string {
  const tier3Items = items.filter((i) => i.tier === 3);
  
  if (tier3Items.length === 0) {
    return 'Sem padrões históricos disponíveis.';
  }
  
  // Group by category
  const byCategory = new Map<string, string[]>();
  tier3Items.forEach((item) => {
    const cat = item.category || 'geral';
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(item.content);
  });
  
  const sections: string[] = [];
  byCategory.forEach((contents, category) => {
    sections.push(`${capitalize(category)}:`);
    contents.forEach((c) => sections.push(`• ${c}`));
  });
  
  return sections.join('\n');
}

/**
 * Build context metadata section
 */
function buildMetadataSection(metadata: ContextMetadata): string {
  return `Tokens utilizados: ${metadata.tokenUsage.used} / ${metadata.tokenUsage.available} (${metadata.tokenUsage.percentage}%)
Frescura dos dados: ${metadata.dataFreshness}
Confiança geral: ${translateConfidence(metadata.overallConfidence)}
Estratégia: ${metadata.strategy} (${getStrategyDescription(metadata.strategy)})`;
}

/**
 * Build agent task section
 */
function buildTaskSection(agentType: AgentType, entityType: string): string {
  const tasks: Record<string, string> = {
    lead: `Analisa este lead e fornece:
1. Sumário executivo (2-3 frases)
2. Avaliação do estado atual
3. Sinais positivos identificados
4. Indicadores de risco
5. Próxima ação recomendada

Usa a ferramenta analyze_lead para estruturar a resposta.`,

    opportunity: `Analisa esta oportunidade e fornece:
1. Sumário executivo (2-3 frases)
2. Probabilidade de fecho estimada
3. Sinais positivos (pipeline health)
4. Riscos identificados
5. Táctica de fecho recomendada

Usa a ferramenta analyze_opportunity para estruturar a resposta.`,

    client: `Analisa este cliente e fornece:
1. Sumário executivo (2-3 frases)
2. Health score (0-100)
3. Sinais de satisfação
4. Risco de churn
5. Oportunidades de upsell
6. Próxima ação recomendada

Usa a ferramenta analyze_client para estruturar a resposta.`,

    contact: `Analisa este contacto e fornece:
1. Sumário executivo (2-3 frases)
2. Avaliação da relação
3. Preferências identificadas
4. Histórico de interações relevante
5. Próxima ação recomendada

Usa a ferramenta analyze_contact para estruturar a resposta.`,
  };
  
  return tasks[agentType] || tasks.lead;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function translateConfidence(level: 'high' | 'medium' | 'low'): string {
  const translations: Record<string, string> = {
    high: 'alta',
    medium: 'média',
    low: 'baixa',
  };
  return translations[level] || level;
}

function getStrategyDescription(strategy: 'SMALL' | 'MEDIUM' | 'LARGE'): string {
  const descriptions: Record<string, string> = {
    SMALL: 'contexto completo',
    MEDIUM: 'compressão média',
    LARGE: 'compressão alta',
  };
  return descriptions[strategy] || strategy;
}

/**
 * Calculate data freshness from items
 */
function calculateFreshness(items: ContextItem[]): {
  status: 'fresh' | 'stale' | 'expired';
  description: string;
} {
  const liveItem = items.find((i) => i.isLiveData);
  if (!liveItem) {
    return { status: 'expired', description: 'sem dados recentes' };
  }
  
  const lastUpdate = new Date(liveItem.timestamp);
  const daysSince = Math.floor(
    (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSince === 0) {
    return { status: 'fresh', description: 'atualizado hoje' };
  } else if (daysSince === 1) {
    return { status: 'fresh', description: 'atualizado ontem' };
  } else if (daysSince <= 7) {
    return { status: 'fresh', description: `atualizado há ${daysSince} dias` };
  } else if (daysSince <= 30) {
    return { status: 'stale', description: `atualizado há ${daysSince} dias` };
  } else {
    return { status: 'expired', description: `atualizado há ${daysSince} dias` };
  }
}

/**
 * Calculate overall confidence from items
 */
function calculateConfidence(items: ContextItem[]): 'high' | 'medium' | 'low' {
  const tier1Count = items.filter((i) => i.tier === 1).length;
  const validatedCount = items.filter((i) => i.isValidated).length;
  const avgRelevance = items.reduce((sum, i) => sum + i.relevanceScore, 0) / items.length;
  
  if (tier1Count >= 2 && validatedCount >= 2 && avgRelevance >= 0.7) {
    return 'high';
  } else if (tier1Count >= 1 && avgRelevance >= 0.5) {
    return 'medium';
  }
  return 'low';
}

// =============================================================================
// MAIN ASSEMBLY FUNCTION
// =============================================================================

export interface AssembleOptions {
  agentType: AgentType;
  entityType: string;
  items: ContextItem[];
  budget: TokenBudget;
  strategy: 'SMALL' | 'MEDIUM' | 'LARGE';
  discardedCount: number;
  warnings: string[];
}

/**
 * Assemble the final structured prompt
 */
export function assemblePrompt(options: AssembleOptions): AssembledPrompt {
  const { agentType, entityType, items, budget, strategy, discardedCount, warnings } = options;
  
  // Calculate metadata
  const freshness = calculateFreshness(items);
  const confidence = calculateConfidence(items);
  const tiersIncluded = [...new Set(items.map((i) => i.tier))].sort() as ContextTierLevel[];
  
  const metadata: ContextMetadata = {
    strategy,
    tiersIncluded,
    itemsIncluded: items.length,
    itemsDiscarded: discardedCount,
    dataFreshness: freshness.description,
    freshnessStatus: freshness.status,
    overallConfidence: confidence,
    tokenUsage: {
      used: budget.used,
      available: budget.available,
      percentage: Math.round((budget.used / budget.available) * 100),
    },
    warnings,
  };
  
  // Build sections
  const sections: PromptSections = {
    constraints: buildConstraintsSection(items),
    currentEntityData: buildEntityDataSection(items),
    knownFacts: buildKnownFactsSection(items),
    historicalPatterns: buildHistoricalPatternsSection(items),
    contextMetadata: buildMetadataSection(metadata),
    agentTask: buildTaskSection(agentType, entityType),
  };
  
  // Build system prompt (constraints at the start for LLM attention)
  const systemPrompt = `${SECTION_HEADER}[CONSTRAINTS & GUARDRAILS]${SECTION_HEADER}

${sections.constraints}`;
  
  // Build user prompt (structured context + task at the end)
  const userPrompt = `${SECTION_HEADER}[CURRENT ENTITY DATA]${SECTION_HEADER}

${sections.currentEntityData}

${SECTION_HEADER}[KNOWN FACTS - VALIDATED]${SECTION_HEADER}

${sections.knownFacts}

${SECTION_HEADER}[HISTORICAL PATTERNS]${SECTION_HEADER}

${sections.historicalPatterns}

${SECTION_HEADER}[CONTEXT METADATA]${SECTION_HEADER}

${sections.contextMetadata}

${SECTION_HEADER}[AGENT TASK]${SECTION_HEADER}

${sections.agentTask}`;
  
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  const totalTokens = estimateTokens(fullPrompt);
  
  return {
    systemPrompt,
    userPrompt,
    fullPrompt,
    totalTokens,
    sections,
    metadata,
  };
}

// Section header formatting
const SECTION_HEADER = '════════════════════════════════════════════════════════════════';

// =============================================================================
// PARTIAL ANALYSIS RESPONSE
// =============================================================================

export interface PartialAnalysisResponse {
  partialAnalysis: true;
  completedSteps: number;
  totalSteps: number;
  analysisPerformed: string[];
  missingData: string[];
  reason: string;
  recommendation: string;
}

/**
 * Build a partial analysis response when context is insufficient
 */
export function buildPartialAnalysisResponse(
  completedSteps: string[],
  missingData: string[],
  reason: string
): PartialAnalysisResponse {
  return {
    partialAnalysis: true,
    completedSteps: completedSteps.length,
    totalSteps: 5,
    analysisPerformed: completedSteps,
    missingData,
    reason,
    recommendation: missingData.length > 0
      ? `Adicionar dados em falta: ${missingData.join(', ')}`
      : 'Tentar novamente com mais contexto disponível',
  };
}
