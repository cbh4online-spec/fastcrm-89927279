/**
 * Cache-Augmented Generation (CAG) Data
 * 
 * Level 3 caching: Pre-computed reference data injected into prompts.
 * Stable data that doesn't change frequently and can be cached.
 */

// =============================================================================
// TYPES
// =============================================================================

interface CAGEntry {
  key: string;
  type: 'business_rules' | 'scoring_heuristics' | 'industry_templates' | 'static_references';
  content: string;
  version: string;
  entityTypes: string[];
}

interface CAGContext {
  businessRules: string[];
  scoringHeuristics: string[];
  industryTemplates: string[];
  staticReferences: Record<string, string>;
  version: string;
}

// =============================================================================
// VERSION CONTROL
// =============================================================================

export const CAG_VERSION = 'v1.0.0';

// =============================================================================
// BUSINESS RULES
// =============================================================================

const BUSINESS_RULES: CAGEntry[] = [
  {
    key: 'lead_qualification',
    type: 'business_rules',
    content: `REGRAS DE QUALIFICAÇÃO DE LEADS:
- Lead quente (hot): Score >= 70, interação nos últimos 7 dias, interesse explícito demonstrado
- Lead morno (warm): Score 40-69, interação nos últimos 30 dias
- Lead frio (cold): Score < 40 ou sem interação há mais de 30 dias
- Lead qualificado: Tem budget definido, autoridade de decisão, necessidade clara, timeline definido`,
    version: CAG_VERSION,
    entityTypes: ['lead'],
  },
  {
    key: 'opportunity_stages',
    type: 'business_rules',
    content: `ESTÁGIOS DE OPORTUNIDADE:
- Prospeção: Contacto inicial, identificação de necessidades
- Qualificação: Validação de fit, orçamento e timeline
- Proposta: Apresentação de solução, negociação de termos
- Negociação: Discussão final de preços e condições
- Fecho: Assinatura de contrato, início de implementação
- Perdida: Oportunidade não convertida (registar motivo)`,
    version: CAG_VERSION,
    entityTypes: ['opportunity'],
  },
  {
    key: 'client_health',
    type: 'business_rules',
    content: `INDICADORES DE SAÚDE DE CLIENTE:
- Saudável (healthy): Engagement regular, sem tickets críticos, renovação confirmada
- Em risco (at_risk): Engagement em declínio, tickets não resolvidos, renovação incerta
- Crítico (critical): Sem engagement, reclamações ativas, possível churn`,
    version: CAG_VERSION,
    entityTypes: ['client'],
  },
];

// =============================================================================
// SCORING HEURISTICS
// =============================================================================

const SCORING_HEURISTICS: CAGEntry[] = [
  {
    key: 'lead_score_factors',
    type: 'scoring_heuristics',
    content: `FATORES DE LEAD SCORE:
+20 pontos: Empresa no target (tamanho, setor)
+15 pontos: Decisor identificado
+15 pontos: Budget confirmado
+10 pontos: Timeline definido (<3 meses)
+10 pontos: Pedido de demo/proposta
+5 pontos: Por cada interação (email aberto, clique, etc.)
-10 pontos: Sem resposta há 14+ dias
-20 pontos: Pedido de remoção ou "não interessado"`,
    version: CAG_VERSION,
    entityTypes: ['lead'],
  },
  {
    key: 'opportunity_probability',
    type: 'scoring_heuristics',
    content: `PROBABILIDADE DE FECHO:
- Prospeção: 10%
- Qualificação: 25%
- Proposta enviada: 50%
- Negociação: 75%
- Verbal close: 90%

AJUSTES:
+10% se múltiplos stakeholders engajados
+10% se referência de cliente existente
-10% se competidor forte identificado
-20% se processo de compra complexo`,
    version: CAG_VERSION,
    entityTypes: ['opportunity'],
  },
];

// =============================================================================
// INDUSTRY TEMPLATES
// =============================================================================

const INDUSTRY_TEMPLATES: CAGEntry[] = [
  {
    key: 'b2b_saas',
    type: 'industry_templates',
    content: `CONTEXTO B2B SAAS:
- Ciclo de vendas típico: 30-90 dias
- Métricas-chave: MRR, CAC, LTV, Churn
- Stakeholders típicos: CTO, CMO, CEO, CFO
- Objeções comuns: Preço, integração, segurança, adoção
- Fatores de sucesso: ROI claro, implementação rápida, suporte dedicado`,
    version: CAG_VERSION,
    entityTypes: ['lead', 'opportunity', 'client'],
  },
];

// =============================================================================
// STATIC REFERENCES
// =============================================================================

const STATIC_REFERENCES: Record<string, string> = {
  temperature_hot: 'Quente - Pronto para decisão',
  temperature_warm: 'Morno - Interessado mas não urgente',
  temperature_cold: 'Frio - Sem engagement recente',
  priority_high: 'Alta - Requer ação imediata',
  priority_medium: 'Média - Agendar para esta semana',
  priority_low: 'Baixa - Pode esperar',
  confidence_high: 'Alta - Dados completos e recentes',
  confidence_medium: 'Média - Alguns dados em falta',
  confidence_low: 'Baixa - Dados limitados ou antigos',
};

// =============================================================================
// CAG CONTEXT BUILDERS
// =============================================================================

/**
 * Build CAG context for a specific entity type
 */
export function buildCAGContext(entityType: string): CAGContext {
  const businessRules = BUSINESS_RULES
    .filter(r => r.entityTypes.includes(entityType))
    .map(r => r.content);
  
  const scoringHeuristics = SCORING_HEURISTICS
    .filter(r => r.entityTypes.includes(entityType))
    .map(r => r.content);
  
  const industryTemplates = INDUSTRY_TEMPLATES
    .filter(r => r.entityTypes.includes(entityType))
    .map(r => r.content);
  
  return {
    businessRules,
    scoringHeuristics,
    industryTemplates,
    staticReferences: STATIC_REFERENCES,
    version: CAG_VERSION,
  };
}

/**
 * Format CAG context for prompt injection
 */
export function formatCAGForPrompt(cagContext: CAGContext): string {
  const sections: string[] = [];
  
  if (cagContext.businessRules.length > 0) {
    sections.push(`[REGRAS DE NEGÓCIO]\n${cagContext.businessRules.join('\n\n')}`);
  }
  
  if (cagContext.scoringHeuristics.length > 0) {
    sections.push(`[HEURÍSTICAS DE SCORING]\n${cagContext.scoringHeuristics.join('\n\n')}`);
  }
  
  if (cagContext.industryTemplates.length > 0) {
    sections.push(`[CONTEXTO DE INDÚSTRIA]\n${cagContext.industryTemplates.join('\n\n')}`);
  }
  
  return sections.join('\n\n═══════════════════════════════════════════════════════════════\n\n');
}

/**
 * Get full CAG data for an entity type, formatted for prompt
 */
export function getCAGData(entityType: string): string {
  const context = buildCAGContext(entityType);
  return formatCAGForPrompt(context);
}

/**
 * Get a specific static reference value
 */
export function getStaticReference(key: string): string | undefined {
  return STATIC_REFERENCES[key];
}

/**
 * Get all available entity types for CAG
 */
export function getCAGEntityTypes(): string[] {
  const types = new Set<string>();
  
  for (const rule of BUSINESS_RULES) {
    for (const type of rule.entityTypes) {
      types.add(type);
    }
  }
  
  return Array.from(types);
}

/**
 * Check if CAG data is available for an entity type
 */
export function hasCAGData(entityType: string): boolean {
  return BUSINESS_RULES.some(r => r.entityTypes.includes(entityType)) ||
         SCORING_HEURISTICS.some(r => r.entityTypes.includes(entityType)) ||
         INDUSTRY_TEMPLATES.some(r => r.entityTypes.includes(entityType));
}

/**
 * Get CAG version hash for cache key building
 */
export function getCAGVersionHash(): string {
  return CAG_VERSION;
}
