/**
 * Prompt Prefix Cache
 * 
 * Level 1 caching: In-memory cache for stable prompt sections.
 * Reduces prompt construction overhead and enables LLM prefix caching.
 */

// =============================================================================
// TYPES
// =============================================================================

interface PromptPrefixEntry {
  key: string;
  content: string;
  version: string;
  hash: string;
  createdAt: number;
  hitCount: number;
  lastHitAt: number;
}

interface PromptPrefixMetrics {
  totalHits: number;
  totalMisses: number;
  hitRatio: number;
  entriesCount: number;
}

// =============================================================================
// HASH UTILITY
// =============================================================================

function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// =============================================================================
// IN-MEMORY CACHE
// =============================================================================

const prefixCache = new Map<string, PromptPrefixEntry>();
let cacheMetrics = { hits: 0, misses: 0 };

// =============================================================================
// PROMPT VERSIONS
// =============================================================================

/**
 * Current versions for each prompt component
 * Update these when prompts change to invalidate cached prefixes
 */
export const PROMPT_VERSIONS = {
  systemInstructions: 'v1.0.0',
  agentRoles: 'v1.0.0',
  outputContracts: 'v1.0.0',
  guardrails: 'v1.0.0',
  safetyRules: 'v1.0.0',
};

// =============================================================================
// AGENT SYSTEM PROMPTS
// =============================================================================

/**
 * Base system instructions shared across all agents
 */
const BASE_SYSTEM_INSTRUCTIONS = `Tu és um agente de IA especializado em análise de CRM para negócios B2B.

REGRAS FUNDAMENTAIS:
1. Nunca inventes informação - baseia-te apenas nos dados fornecidos
2. Sê específico e acionável nas recomendações
3. Prioriza clareza sobre complexidade
4. Indica sempre o nível de confiança das análises
5. Referencia os dados que suportam as conclusões

FORMATO DE RESPOSTA:
- Usa JSON estruturado quando solicitado
- Inclui sempre sumário executivo
- Lista sinais-chave e indicadores de risco
- Fornece recomendações priorizadas`;

/**
 * Role-specific instructions per agent type
 */
const AGENT_ROLE_PROMPTS: Record<string, string> = {
  lead: `PAPEL: Agente de Análise de Leads

Especialização:
- Avaliação de qualidade e potencial de leads
- Deteção de sinais de compra
- Classificação de temperatura e urgência
- Recomendação de próximos passos

Foco:
- Qualificação BANT (Budget, Authority, Need, Timeline)
- Engagement e responsividade
- Fit com o perfil ideal de cliente
- Timing de conversão`,

  opportunity: `PAPEL: Agente de Análise de Oportunidades

Especialização:
- Avaliação de probabilidade de fecho
- Análise de pipeline e progressão
- Deteção de riscos e blockers
- Estratégia de negociação

Foco:
- Valor e potencial da oportunidade
- Velocidade de progressão
- Stakeholders e decisores
- Competição e diferenciação`,

  contact: `PAPEL: Agente de Análise de Contactos

Especialização:
- Perfil e influência do contacto
- Histórico de interações
- Preferências de comunicação
- Networking e conexões

Foco:
- Papel no processo de decisão
- Engagement e relação
- Canais preferidos
- Pontos de alavancagem`,

  client: `PAPEL: Agente de Análise de Clientes

Especialização:
- Saúde e satisfação do cliente
- Oportunidades de upsell/cross-sell
- Risco de churn
- Valor de vida (LTV)

Foco:
- Métricas de sucesso
- Engagement contínuo
- Renovações e expansão
- Advocacia e referências`,
};

/**
 * Output contract (JSON schema) for agent responses
 */
const OUTPUT_CONTRACT = `CONTRATO DE OUTPUT:

A resposta DEVE seguir este formato JSON:
{
  "executiveSummary": "string (2-3 frases resumindo a análise)",
  "statusAssessment": "string (avaliação do estado atual)",
  "keySignals": ["array de sinais positivos identificados"],
  "riskIndicators": ["array de indicadores de risco"],
  "recommendations": [
    {
      "action": "string (ação específica)",
      "priority": "high|medium|low",
      "reasoning": "string (justificação)"
    }
  ],
  "confidenceLevel": "low|medium|high",
  "dataQuality": {
    "completeness": number (0-1),
    "freshness": number (0-1),
    "reliability": number (0-1)
  }
}`;

/**
 * Safety guardrails included in all prompts
 */
const SAFETY_GUARDRAILS = `GUARDRAILS DE SEGURANÇA:

❌ NUNCA:
- Inventar dados não fornecidos
- Fazer promessas em nome do negócio
- Sugerir ações antiéticas ou spam
- Ignorar indicadores de risco

✅ SEMPRE:
- Basear análise em dados concretos
- Indicar incertezas e limitações
- Priorizar ações de alto impacto
- Considerar contexto de negócio`;

// =============================================================================
// CACHE OPERATIONS
// =============================================================================

/**
 * Get or create a cached prompt prefix
 */
export function getPromptPrefix(
  key: string,
  generator: () => string,
  version: string
): string {
  const cacheKey = `${key}:${version}`;
  
  const cached = prefixCache.get(cacheKey);
  if (cached && cached.version === version) {
    // Cache hit
    cached.hitCount++;
    cached.lastHitAt = Date.now();
    cacheMetrics.hits++;
    return cached.content;
  }
  
  // Cache miss - generate and store
  const content = generator();
  const hash = hashContent(content);
  
  prefixCache.set(cacheKey, {
    key: cacheKey,
    content,
    version,
    hash,
    createdAt: Date.now(),
    hitCount: 0,
    lastHitAt: Date.now(),
  });
  
  cacheMetrics.misses++;
  return content;
}

/**
 * Build complete system prompt for an agent
 */
export function buildAgentSystemPrompt(agentType: string): string {
  const version = `${PROMPT_VERSIONS.systemInstructions}-${PROMPT_VERSIONS.agentRoles}-${PROMPT_VERSIONS.outputContracts}-${PROMPT_VERSIONS.guardrails}`;
  
  return getPromptPrefix(
    `system:${agentType}`,
    () => {
      const rolePrompt = AGENT_ROLE_PROMPTS[agentType] || AGENT_ROLE_PROMPTS.lead;
      
      return `${BASE_SYSTEM_INSTRUCTIONS}

═══════════════════════════════════════════════════════════════

${rolePrompt}

═══════════════════════════════════════════════════════════════

${OUTPUT_CONTRACT}

═══════════════════════════════════════════════════════════════

${SAFETY_GUARDRAILS}`;
    },
    version
  );
}

/**
 * Get just the base system instructions (for partial caching)
 */
export function getBaseSystemInstructions(): string {
  return getPromptPrefix(
    'base:system',
    () => BASE_SYSTEM_INSTRUCTIONS,
    PROMPT_VERSIONS.systemInstructions
  );
}

/**
 * Get just the output contract
 */
export function getOutputContract(): string {
  return getPromptPrefix(
    'contract:output',
    () => OUTPUT_CONTRACT,
    PROMPT_VERSIONS.outputContracts
  );
}

/**
 * Get safety guardrails
 */
export function getSafetyGuardrails(): string {
  return getPromptPrefix(
    'safety:guardrails',
    () => SAFETY_GUARDRAILS,
    PROMPT_VERSIONS.guardrails
  );
}

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

/**
 * Get cache metrics
 */
export function getPromptCacheMetrics(): PromptPrefixMetrics {
  const total = cacheMetrics.hits + cacheMetrics.misses;
  return {
    totalHits: cacheMetrics.hits,
    totalMisses: cacheMetrics.misses,
    hitRatio: total > 0 ? cacheMetrics.hits / total : 0,
    entriesCount: prefixCache.size,
  };
}

/**
 * Clear all cached prefixes (e.g., on version update)
 */
export function clearPromptCache(): void {
  prefixCache.clear();
  cacheMetrics = { hits: 0, misses: 0 };
}

/**
 * Invalidate entries for a specific agent type
 */
export function invalidateAgentPrompts(agentType: string): number {
  let invalidated = 0;
  for (const key of prefixCache.keys()) {
    if (key.includes(agentType)) {
      prefixCache.delete(key);
      invalidated++;
    }
  }
  return invalidated;
}

/**
 * Get hash of current prompt version (for cache key building)
 */
export function getPromptVersionHash(): string {
  const versions = Object.values(PROMPT_VERSIONS).join(':');
  return hashContent(versions);
}
