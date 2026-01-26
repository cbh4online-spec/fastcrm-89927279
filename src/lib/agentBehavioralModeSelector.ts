/**
 * Agent Behavioral Mode Selector
 * 
 * Deterministic selection logic for AI agent behavioral modes.
 * Mode selection is based on entity context, data quality, and business strategy.
 */

import type {
  BehavioralMode,
  ModeSelectionContext,
  ModeSelectionResult,
  WorkspaceModeSettings,
  UserModePreferences,
  BusinessStrategy,
  BEHAVIORAL_MODE_DEFINITIONS,
} from '@/types/agentBehavioralModes';

import {
  DEFAULT_WORKSPACE_MODE_SETTINGS,
} from '@/types/agentBehavioralModes';

// =============================================================================
// SCORING WEIGHTS
// =============================================================================

interface ModeScore {
  mode: BehavioralMode;
  score: number;
  reasons: string[];
}

const SELECTION_WEIGHTS = {
  dataCompleteness: 0.25,
  confidenceLevel: 0.20,
  pipelineStage: 0.20,
  businessStrategy: 0.15,
  userContext: 0.10,
  actionContext: 0.10,
};

// =============================================================================
// MAIN SELECTOR
// =============================================================================

export function selectBehavioralMode(
  context: ModeSelectionContext,
  workspaceSettings?: Partial<WorkspaceModeSettings>,
  userPreferences?: Partial<UserModePreferences>
): ModeSelectionResult {
  // Merge with defaults
  const settings: WorkspaceModeSettings = {
    ...DEFAULT_WORKSPACE_MODE_SETTINGS,
    workspaceId: context.entityId,
    ...workspaceSettings,
  };
  
  // Check for explicit overrides first
  const override = checkOverrides(context, settings, userPreferences);
  if (override) {
    return override;
  }
  
  // Calculate scores for each mode
  const scores = calculateModeScores(context, settings);
  
  // Sort by score and select best
  scores.sort((a, b) => b.score - a.score);
  const selectedMode = scores[0];
  const alternativeModes = scores.slice(1, 3).map(s => s.mode);
  
  // Get mode definition
  const definition = getModeDefinition(selectedMode.mode);
  
  return {
    selectedMode: selectedMode.mode,
    definition,
    selectionReason: selectedMode.reasons.join('; '),
    confidenceInSelection: Math.min(selectedMode.score, 1),
    alternativeModes,
    wasOverridden: false,
  };
}

// =============================================================================
// OVERRIDE CHECKING
// =============================================================================

function checkOverrides(
  context: ModeSelectionContext,
  settings: WorkspaceModeSettings,
  userPreferences?: Partial<UserModePreferences>
): ModeSelectionResult | null {
  // 1. Check user temporary override (highest priority)
  if (userPreferences?.temporaryOverride) {
    const override = userPreferences.temporaryOverride;
    const expiresAt = new Date(override.expiresAt);
    
    if (expiresAt > new Date()) {
      return createOverrideResult(
        override.mode,
        `Preferência explícita do utilizador: ${override.reason}`,
        'user'
      );
    }
  }
  
  // 2. Check user preferred mode (if allowed)
  if (settings.allowUserOverride && userPreferences?.preferredMode) {
    return createOverrideResult(
      userPreferences.preferredMode,
      'Modo preferido do utilizador',
      'user'
    );
  }
  
  // 3. Check context-specific workspace overrides
  if (context.entityType === 'lead' && context.pipelineStage === 'new' && settings.modeOverrides.newLeads) {
    return createOverrideResult(
      settings.modeOverrides.newLeads,
      'Override de workspace para novos leads',
      'workspace'
    );
  }
  
  if (context.isHighValue && settings.modeOverrides.highValueDeals) {
    return createOverrideResult(
      settings.modeOverrides.highValueDeals,
      'Override de workspace para negócios de alto valor',
      'workspace'
    );
  }
  
  if (isStalled(context) && settings.modeOverrides.stalledOpportunities) {
    return createOverrideResult(
      settings.modeOverrides.stalledOpportunities,
      'Override de workspace para oportunidades estagnadas',
      'workspace'
    );
  }
  
  if (context.isPreActionCheck && settings.modeOverrides.preAutomation) {
    return createOverrideResult(
      settings.modeOverrides.preAutomation,
      'Override de workspace para validação pré-automação',
      'workspace'
    );
  }
  
  return null;
}

function createOverrideResult(
  mode: BehavioralMode,
  reason: string,
  source: 'workspace' | 'user' | 'explicit'
): ModeSelectionResult {
  return {
    selectedMode: mode,
    definition: getModeDefinition(mode),
    selectionReason: reason,
    confidenceInSelection: 1,
    alternativeModes: [],
    wasOverridden: true,
    overrideSource: source,
  };
}

// =============================================================================
// SCORE CALCULATION
// =============================================================================

function calculateModeScores(
  context: ModeSelectionContext,
  settings: WorkspaceModeSettings
): ModeScore[] {
  const modes: BehavioralMode[] = ['exploratory', 'execution', 'risk_control', 'educational', 'validation'];
  
  return modes.map(mode => {
    let score = 0;
    const reasons: string[] = [];
    
    // Data completeness scoring
    const dataScore = scoreDataCompleteness(mode, context.dataCompleteness);
    score += dataScore.value * SELECTION_WEIGHTS.dataCompleteness;
    if (dataScore.reason) reasons.push(dataScore.reason);
    
    // Confidence level scoring
    const confScore = scoreConfidenceLevel(mode, context.confidenceLevel);
    score += confScore.value * SELECTION_WEIGHTS.confidenceLevel;
    if (confScore.reason) reasons.push(confScore.reason);
    
    // Pipeline stage scoring
    const stageScore = scorePipelineStage(mode, context.pipelineStage, context.entityType);
    score += stageScore.value * SELECTION_WEIGHTS.pipelineStage;
    if (stageScore.reason) reasons.push(stageScore.reason);
    
    // Business strategy scoring
    const strategyScore = scoreBusinessStrategy(mode, settings.businessStrategy);
    score += strategyScore.value * SELECTION_WEIGHTS.businessStrategy;
    if (strategyScore.reason) reasons.push(strategyScore.reason);
    
    // User context scoring
    const userScore = scoreUserContext(mode, context, settings);
    score += userScore.value * SELECTION_WEIGHTS.userContext;
    if (userScore.reason) reasons.push(userScore.reason);
    
    // Action context scoring
    const actionScore = scoreActionContext(mode, context);
    score += actionScore.value * SELECTION_WEIGHTS.actionContext;
    if (actionScore.reason) reasons.push(actionScore.reason);
    
    return { mode, score, reasons };
  });
}

// =============================================================================
// INDIVIDUAL SCORERS
// =============================================================================

interface ScoreResult {
  value: number;  // 0-1
  reason?: string;
}

function scoreDataCompleteness(mode: BehavioralMode, completeness: number): ScoreResult {
  // Low completeness favors exploratory
  // High completeness favors execution
  
  switch (mode) {
    case 'exploratory':
      if (completeness < 0.4) return { value: 1, reason: 'Dados incompletos requerem exploração' };
      if (completeness < 0.6) return { value: 0.6 };
      return { value: 0.3 };
      
    case 'execution':
      if (completeness > 0.8) return { value: 1, reason: 'Dados completos permitem execução direta' };
      if (completeness > 0.6) return { value: 0.6 };
      return { value: 0.2 };
      
    case 'risk_control':
      if (completeness < 0.5) return { value: 0.8, reason: 'Dados incompletos aumentam risco' };
      return { value: 0.4 };
      
    case 'educational':
      return { value: 0.5 };  // Neutral for educational
      
    case 'validation':
      if (completeness > 0.7) return { value: 0.7 };
      return { value: 0.3 };
  }
}

function scoreConfidenceLevel(mode: BehavioralMode, confidence: 'low' | 'medium' | 'high'): ScoreResult {
  const scores: Record<BehavioralMode, Record<string, number>> = {
    exploratory: { low: 1, medium: 0.6, high: 0.2 },
    execution: { low: 0.1, medium: 0.5, high: 1 },
    risk_control: { low: 0.9, medium: 0.7, high: 0.3 },
    educational: { low: 0.6, medium: 0.5, high: 0.4 },
    validation: { low: 0.3, medium: 0.6, high: 0.8 },
  };
  
  const value = scores[mode][confidence];
  const reason = confidence === 'low' && mode === 'exploratory' 
    ? 'Baixa confiança favorece modo exploratório'
    : confidence === 'high' && mode === 'execution'
    ? 'Alta confiança favorece modo execução'
    : undefined;
    
  return { value, reason };
}

function scorePipelineStage(
  mode: BehavioralMode, 
  stage: string | undefined,
  entityType: string
): ScoreResult {
  if (!stage) return { value: 0.5 };
  
  const earlyStages = ['new', 'qualification', 'discovery'];
  const lateStages = ['proposal', 'negotiation', 'closing'];
  const riskStages = ['stalled', 'at_risk', 'lost'];
  
  const isEarly = earlyStages.includes(stage.toLowerCase());
  const isLate = lateStages.includes(stage.toLowerCase());
  const isRisk = riskStages.includes(stage.toLowerCase());
  
  switch (mode) {
    case 'exploratory':
      if (isEarly) return { value: 0.9, reason: 'Fase inicial favorece exploração' };
      return { value: 0.3 };
      
    case 'execution':
      if (isLate) return { value: 0.9, reason: 'Fase avançada favorece execução' };
      return { value: 0.3 };
      
    case 'risk_control':
      if (isRisk) return { value: 1, reason: 'Situação de risco identificada' };
      if (isLate) return { value: 0.6 };
      return { value: 0.3 };
      
    case 'educational':
      if (isEarly) return { value: 0.7 };
      return { value: 0.4 };
      
    case 'validation':
      if (isLate) return { value: 0.8, reason: 'Fase de fecho requer validação' };
      return { value: 0.3 };
  }
}

function scoreBusinessStrategy(mode: BehavioralMode, strategy: BusinessStrategy): ScoreResult {
  const scores: Record<BehavioralMode, Record<BusinessStrategy, number>> = {
    exploratory: { conservative: 0.8, balanced: 0.5, aggressive: 0.3 },
    execution: { conservative: 0.3, balanced: 0.6, aggressive: 0.9 },
    risk_control: { conservative: 0.9, balanced: 0.6, aggressive: 0.3 },
    educational: { conservative: 0.6, balanced: 0.5, aggressive: 0.4 },
    validation: { conservative: 0.8, balanced: 0.5, aggressive: 0.3 },
  };
  
  const value = scores[mode][strategy];
  const reason = strategy === 'conservative' && mode === 'risk_control'
    ? 'Estratégia conservadora prioriza controlo de risco'
    : strategy === 'aggressive' && mode === 'execution'
    ? 'Estratégia agressiva prioriza execução'
    : undefined;
    
  return { value, reason };
}

function scoreUserContext(
  mode: BehavioralMode,
  context: ModeSelectionContext,
  settings: WorkspaceModeSettings
): ScoreResult {
  let value = 0.5;
  let reason: string | undefined;
  
  // New user favors educational mode
  if (context.isNewUser && mode === 'educational') {
    value = 1;
    reason = 'Novo utilizador beneficia de modo educacional';
  }
  
  // Many recent dismissals favor educational mode
  if ((context.recentDismissals || 0) > 3 && mode === 'educational') {
    value = 0.9;
    reason = 'Recomendações rejeitadas sugerem modo educacional';
  }
  
  // Owner/admin can have more direct execution
  if (context.userRole === 'owner' && mode === 'execution') {
    value = 0.7;
  }
  
  return { value, reason };
}

function scoreActionContext(mode: BehavioralMode, context: ModeSelectionContext): ScoreResult {
  // Pre-action checks strongly favor validation
  if (context.isPreActionCheck) {
    if (mode === 'validation') {
      return { value: 1, reason: 'Verificação pré-ação requer modo validação' };
    }
    return { value: 0.2 };
  }
  
  // Irreversible actions favor validation
  if (context.isIrreversible) {
    if (mode === 'validation') {
      return { value: 0.95, reason: 'Ação irreversível requer validação' };
    }
    if (mode === 'risk_control') {
      return { value: 0.7 };
    }
    return { value: 0.3 };
  }
  
  return { value: 0.5 };
}

// =============================================================================
// HELPERS
// =============================================================================

function isStalled(context: ModeSelectionContext): boolean {
  // Consider stalled if no activity in 14+ days
  if (context.lastActivityDays && context.lastActivityDays > 14) {
    return true;
  }
  
  // Or if explicitly marked
  if (context.pipelineStage?.toLowerCase().includes('stalled')) {
    return true;
  }
  
  return false;
}

function getModeDefinition(mode: BehavioralMode) {
  // Import here to avoid circular dependency
  const { BEHAVIORAL_MODE_DEFINITIONS } = require('@/types/agentBehavioralModes');
  return BEHAVIORAL_MODE_DEFINITIONS[mode];
}

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

export function buildModeSelectionContext(params: {
  entityType: 'lead' | 'opportunity' | 'contact' | 'company';
  entityId: string;
  entityData?: Record<string, unknown>;
  pipelineStage?: string;
  dealValue?: number;
  userRole?: 'owner' | 'admin' | 'agent' | 'viewer';
  businessStrategy?: BusinessStrategy;
  isPreAction?: boolean;
  actionType?: string;
}): ModeSelectionContext {
  const {
    entityType,
    entityId,
    entityData = {},
    pipelineStage,
    dealValue,
    userRole = 'agent',
    businessStrategy = 'balanced',
    isPreAction = false,
    actionType,
  } = params;
  
  // Calculate data completeness
  const requiredFields = getRequiredFieldsForEntity(entityType);
  const presentFields = requiredFields.filter(field => 
    entityData[field] !== null && entityData[field] !== undefined && entityData[field] !== ''
  );
  const dataCompleteness = requiredFields.length > 0 
    ? presentFields.length / requiredFields.length 
    : 0.5;
  
  // Determine confidence level
  let confidenceLevel: 'low' | 'medium' | 'high' = 'medium';
  if (dataCompleteness < 0.4) confidenceLevel = 'low';
  else if (dataCompleteness > 0.8) confidenceLevel = 'high';
  
  // Calculate entity age
  const createdAt = entityData.created_at as string;
  const entityAge = createdAt 
    ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : undefined;
  
  // Calculate last activity
  const lastActivity = entityData.last_activity_at as string || entityData.updated_at as string;
  const lastActivityDays = lastActivity
    ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
    : undefined;
  
  // Determine if high value (using default threshold)
  const highValueThreshold = 10000;
  const isHighValue = dealValue ? dealValue >= highValueThreshold : false;
  
  // Check for conflicting data
  const hasConflictingData = checkForConflictingData(entityData);
  
  return {
    entityType,
    entityId,
    pipelineStage,
    entityAge,
    lastActivityDays,
    dataCompleteness,
    confidenceLevel,
    hasConflictingData,
    dealValue,
    isHighValue,
    userRole,
    isNewUser: false,  // Would need user context
    recentDismissals: 0,  // Would need analytics context
    businessStrategy,
    isPreActionCheck: isPreAction,
    actionType,
    isIrreversible: isIrreversibleAction(actionType),
  };
}

function getRequiredFieldsForEntity(entityType: string): string[] {
  const fields: Record<string, string[]> = {
    lead: ['name', 'email', 'phone', 'source', 'status'],
    opportunity: ['title', 'value', 'stage_id', 'contact_id', 'expected_close_date'],
    contact: ['name', 'email', 'phone', 'company_id'],
    company: ['name', 'email', 'phone', 'website'],
  };
  return fields[entityType] || [];
}

function checkForConflictingData(data: Record<string, unknown>): boolean {
  // Check for obvious conflicts
  // e.g., status is 'won' but probability is 0
  if (data.status === 'won' && data.probability === 0) return true;
  if (data.status === 'lost' && data.probability === 100) return true;
  
  return false;
}

function isIrreversibleAction(actionType?: string): boolean {
  const irreversibleActions = [
    'archive', 'delete', 'close_lost', 'close_won', 
    'send_proposal', 'send_contract', 'charge_payment'
  ];
  return actionType ? irreversibleActions.includes(actionType) : false;
}

// =============================================================================
// EXPORTS FOR TESTING
// =============================================================================

export const _testing = {
  scoreDataCompleteness,
  scoreConfidenceLevel,
  scorePipelineStage,
  scoreBusinessStrategy,
  scoreUserContext,
  scoreActionContext,
  isStalled,
};
