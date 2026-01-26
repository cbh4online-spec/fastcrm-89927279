/**
 * Adaptive Behavioral Modes for AI Decision Agents
 * 
 * Defines how agents reason, communicate, and recommend actions
 * based on context, task type, and business strategy.
 */

// =============================================================================
// BEHAVIORAL MODE TYPES
// =============================================================================

export type BehavioralMode = 
  | 'exploratory'      // Diagnostic, early-stage, unclear intent
  | 'execution'        // High-confidence, time-sensitive, action-focused
  | 'risk_control'     // Stalled deals, high-value, quality control
  | 'educational'      // New users, explain reasoning, reduce friction
  | 'validation';      // Pre-action checks, confirm readiness

export type BusinessStrategy = 'conservative' | 'balanced' | 'aggressive';

export type UserRole = 'owner' | 'admin' | 'agent' | 'viewer';

// =============================================================================
// MODE DEFINITIONS
// =============================================================================

export interface BehavioralModeDefinition {
  mode: BehavioralMode;
  displayName: string;
  description: string;
  
  // Behavior characteristics
  characteristics: {
    recommendationStyle: 'multiple_options' | 'single_action' | 'cautionary';
    confidenceThreshold: number;  // 0-1, minimum to recommend
    explanationDepth: 'minimal' | 'standard' | 'detailed';
    urgencyLevel: 'low' | 'medium' | 'high';
    riskTolerance: 'low' | 'medium' | 'high';
  };
  
  // Communication style
  communication: {
    tone: 'exploratory' | 'directive' | 'cautious' | 'educational' | 'confirmatory';
    verbosity: 'concise' | 'standard' | 'verbose';
    includeAlternatives: boolean;
    explainReasoning: boolean;
  };
  
  // When to use
  triggers: {
    entityStages?: string[];
    confidenceLevels?: ('low' | 'medium' | 'high')[];
    entityTypes?: string[];
    dataQuality?: ('poor' | 'fair' | 'good')[];
  };
}

export const BEHAVIORAL_MODE_DEFINITIONS: Record<BehavioralMode, BehavioralModeDefinition> = {
  exploratory: {
    mode: 'exploratory',
    displayName: 'Exploratório',
    description: 'Modo diagnóstico para situações de incerteza ou dados incompletos',
    characteristics: {
      recommendationStyle: 'multiple_options',
      confidenceThreshold: 0.3,
      explanationDepth: 'detailed',
      urgencyLevel: 'low',
      riskTolerance: 'low',
    },
    communication: {
      tone: 'exploratory',
      verbosity: 'verbose',
      includeAlternatives: true,
      explainReasoning: true,
    },
    triggers: {
      entityStages: ['new', 'qualification'],
      confidenceLevels: ['low'],
      dataQuality: ['poor', 'fair'],
    },
  },
  
  execution: {
    mode: 'execution',
    displayName: 'Execução',
    description: 'Modo focado em ação para situações de alta confiança',
    characteristics: {
      recommendationStyle: 'single_action',
      confidenceThreshold: 0.7,
      explanationDepth: 'minimal',
      urgencyLevel: 'high',
      riskTolerance: 'medium',
    },
    communication: {
      tone: 'directive',
      verbosity: 'concise',
      includeAlternatives: false,
      explainReasoning: false,
    },
    triggers: {
      entityStages: ['proposal', 'negotiation', 'closing'],
      confidenceLevels: ['high'],
      dataQuality: ['good'],
    },
  },
  
  risk_control: {
    mode: 'risk_control',
    displayName: 'Controlo de Risco',
    description: 'Modo cauteloso para negócios estagnados ou de alto valor',
    characteristics: {
      recommendationStyle: 'cautionary',
      confidenceThreshold: 0.5,
      explanationDepth: 'detailed',
      urgencyLevel: 'medium',
      riskTolerance: 'low',
    },
    communication: {
      tone: 'cautious',
      verbosity: 'standard',
      includeAlternatives: true,
      explainReasoning: true,
    },
    triggers: {
      entityStages: ['stalled', 'at_risk'],
      confidenceLevels: ['low', 'medium'],
      dataQuality: ['poor', 'fair'],
    },
  },
  
  educational: {
    mode: 'educational',
    displayName: 'Educacional',
    description: 'Modo explicativo para novos utilizadores ou recomendações rejeitadas',
    characteristics: {
      recommendationStyle: 'multiple_options',
      confidenceThreshold: 0.4,
      explanationDepth: 'detailed',
      urgencyLevel: 'low',
      riskTolerance: 'low',
    },
    communication: {
      tone: 'educational',
      verbosity: 'verbose',
      includeAlternatives: true,
      explainReasoning: true,
    },
    triggers: {
      dataQuality: ['poor', 'fair', 'good'],
    },
  },
  
  validation: {
    mode: 'validation',
    displayName: 'Validação',
    description: 'Modo de confirmação antes de ações irreversíveis',
    characteristics: {
      recommendationStyle: 'cautionary',
      confidenceThreshold: 0.8,
      explanationDepth: 'standard',
      urgencyLevel: 'medium',
      riskTolerance: 'low',
    },
    communication: {
      tone: 'confirmatory',
      verbosity: 'standard',
      includeAlternatives: false,
      explainReasoning: true,
    },
    triggers: {
      entityStages: ['closing', 'won', 'lost'],
      confidenceLevels: ['medium', 'high'],
    },
  },
};

// =============================================================================
// MODE SELECTION CONTEXT
// =============================================================================

export interface ModeSelectionContext {
  // Entity context
  entityType: 'lead' | 'opportunity' | 'contact' | 'company';
  entityId: string;
  pipelineStage?: string;
  entityAge?: number;  // Days since creation
  lastActivityDays?: number;
  
  // Data quality
  dataCompleteness: number;  // 0-1
  confidenceLevel: 'low' | 'medium' | 'high';
  hasConflictingData?: boolean;
  
  // Value context
  dealValue?: number;
  isHighValue?: boolean;  // Based on workspace thresholds
  
  // User context
  userRole: UserRole;
  isNewUser?: boolean;
  recentDismissals?: number;  // Recommendations dismissed recently
  
  // Business context
  businessStrategy: BusinessStrategy;
  workspaceDefaultMode?: BehavioralMode;
  userPreferredMode?: BehavioralMode;
  
  // Action context
  isPreActionCheck?: boolean;
  actionType?: string;
  isIrreversible?: boolean;
}

export interface ModeSelectionResult {
  selectedMode: BehavioralMode;
  definition: BehavioralModeDefinition;
  selectionReason: string;
  confidenceInSelection: number;
  alternativeModes: BehavioralMode[];
  wasOverridden: boolean;
  overrideSource?: 'workspace' | 'user' | 'explicit';
}

// =============================================================================
// WORKSPACE MODE SETTINGS
// =============================================================================

export interface WorkspaceModeSettings {
  workspaceId: string;
  
  // Default mode
  defaultMode: BehavioralMode;
  businessStrategy: BusinessStrategy;
  
  // Value thresholds
  highValueThreshold: number;  // Currency amount
  
  // Mode overrides by context
  modeOverrides: {
    newLeads?: BehavioralMode;
    highValueDeals?: BehavioralMode;
    stalledOpportunities?: BehavioralMode;
    preAutomation?: BehavioralMode;
  };
  
  // Feature flags
  enableEducationalMode: boolean;
  enableValidationMode: boolean;
  requireValidationForHighValue: boolean;
  
  // User customization
  allowUserOverride: boolean;
  
  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_WORKSPACE_MODE_SETTINGS: Omit<WorkspaceModeSettings, 'workspaceId'> = {
  defaultMode: 'exploratory',
  businessStrategy: 'balanced',
  highValueThreshold: 10000,
  modeOverrides: {
    newLeads: 'exploratory',
    highValueDeals: 'risk_control',
    stalledOpportunities: 'risk_control',
    preAutomation: 'validation',
  },
  enableEducationalMode: true,
  enableValidationMode: true,
  requireValidationForHighValue: true,
  allowUserOverride: true,
  updatedAt: new Date().toISOString(),
};

// =============================================================================
// USER MODE PREFERENCES
// =============================================================================

export interface UserModePreferences {
  userId: string;
  workspaceId: string;
  
  preferredMode?: BehavioralMode;
  preferExplicitReasoning: boolean;
  preferConciseOutputs: boolean;
  
  // Explicit overrides (from conversation)
  temporaryOverride?: {
    mode: BehavioralMode;
    reason: string;
    expiresAt: string;
  };
}

// =============================================================================
// MODE OUTPUT MODIFIERS
// =============================================================================

export interface ModeOutputModifiers {
  // Language modifiers
  summaryPrefix: string;
  actionPrefix: string;
  uncertaintyPhrase: string;
  confidencePhrase: string;
  
  // Structure modifiers
  maxAlternatives: number;
  includeRiskSection: boolean;
  includeExplanation: boolean;
  includeNextSteps: boolean;
  
  // Confidence adjustments
  confidenceModifier: number;  // -0.2 to +0.2
  requiresUserConfirmation: boolean;
}

export function getModeOutputModifiers(mode: BehavioralMode): ModeOutputModifiers {
  const modifiers: Record<BehavioralMode, ModeOutputModifiers> = {
    exploratory: {
      summaryPrefix: 'Com base nos dados disponíveis, identificámos várias possibilidades:',
      actionPrefix: 'Opções recomendadas:',
      uncertaintyPhrase: 'A confiança é limitada devido a dados incompletos.',
      confidencePhrase: 'Recomendamos recolher mais informação antes de decidir.',
      maxAlternatives: 3,
      includeRiskSection: true,
      includeExplanation: true,
      includeNextSteps: true,
      confidenceModifier: -0.1,
      requiresUserConfirmation: false,
    },
    execution: {
      summaryPrefix: 'Ação prioritária identificada:',
      actionPrefix: 'Executar agora:',
      uncertaintyPhrase: '',
      confidencePhrase: 'Alta probabilidade de sucesso.',
      maxAlternatives: 0,
      includeRiskSection: false,
      includeExplanation: false,
      includeNextSteps: false,
      confidenceModifier: 0.1,
      requiresUserConfirmation: false,
    },
    risk_control: {
      summaryPrefix: 'Análise de risco identificou os seguintes pontos de atenção:',
      actionPrefix: 'Ação corretiva recomendada:',
      uncertaintyPhrase: 'Existem sinais de risco que requerem atenção.',
      confidencePhrase: 'Recomendamos validar antes de prosseguir.',
      maxAlternatives: 2,
      includeRiskSection: true,
      includeExplanation: true,
      includeNextSteps: true,
      confidenceModifier: -0.15,
      requiresUserConfirmation: true,
    },
    educational: {
      summaryPrefix: 'Explicação da análise:',
      actionPrefix: 'Sugerimos esta ação porque:',
      uncertaintyPhrase: 'Vamos explicar o raciocínio por trás desta recomendação.',
      confidencePhrase: 'Esta abordagem é eficaz porque:',
      maxAlternatives: 2,
      includeRiskSection: true,
      includeExplanation: true,
      includeNextSteps: true,
      confidenceModifier: 0,
      requiresUserConfirmation: false,
    },
    validation: {
      summaryPrefix: 'Verificação pré-ação:',
      actionPrefix: 'Antes de prosseguir, confirme:',
      uncertaintyPhrase: 'Alguns requisitos podem estar em falta.',
      confidencePhrase: 'Todos os pré-requisitos verificados.',
      maxAlternatives: 0,
      includeRiskSection: true,
      includeExplanation: true,
      includeNextSteps: false,
      confidenceModifier: 0,
      requiresUserConfirmation: true,
    },
  };
  
  return modifiers[mode];
}

// =============================================================================
// ANALYTICS TRACKING
// =============================================================================

export interface ModeAnalyticsEvent {
  eventType: 'mode_selected' | 'mode_overridden' | 'mode_feedback';
  workspaceId: string;
  userId: string;
  entityType: string;
  entityId: string;
  
  selectedMode: BehavioralMode;
  selectionReason: string;
  wasOverridden: boolean;
  overrideSource?: string;
  
  // Context snapshot
  contextSnapshot: {
    confidenceLevel: string;
    dataCompleteness: number;
    pipelineStage?: string;
    businessStrategy: string;
  };
  
  timestamp: string;
}

// =============================================================================
// HELPERS
// =============================================================================

export function isValidBehavioralMode(mode: string): mode is BehavioralMode {
  return ['exploratory', 'execution', 'risk_control', 'educational', 'validation'].includes(mode);
}

export function getModeDisplayName(mode: BehavioralMode): string {
  return BEHAVIORAL_MODE_DEFINITIONS[mode].displayName;
}

export function getModeDescription(mode: BehavioralMode): string {
  return BEHAVIORAL_MODE_DEFINITIONS[mode].description;
}

export function getModeIcon(mode: BehavioralMode): string {
  const icons: Record<BehavioralMode, string> = {
    exploratory: 'Search',
    execution: 'Zap',
    risk_control: 'Shield',
    educational: 'GraduationCap',
    validation: 'CheckCircle',
  };
  return icons[mode];
}

export function getModeColor(mode: BehavioralMode): string {
  const colors: Record<BehavioralMode, string> = {
    exploratory: 'text-blue-600',
    execution: 'text-green-600',
    risk_control: 'text-amber-600',
    educational: 'text-purple-600',
    validation: 'text-cyan-600',
  };
  return colors[mode];
}
