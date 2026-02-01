/**
 * Trigger.dev Type Definitions
 * 
 * Defines the contracts for all Trigger.dev jobs in FastCRM.
 * All jobs MUST follow these interfaces for consistency and type safety.
 */

// ============================================
// Job Payload Types
// ============================================

export interface TriggerJobPayload {
  workspaceId: string;
  jobType: TriggerJobType;
  entityType?: EntityType;
  entityId?: string;
  recommendationId?: string;
  inputData: Record<string, unknown>;
  idempotencyKey: string;
  priority?: number;
  scheduledFor?: string;
}

export interface TriggerJobResult {
  success: boolean;
  output: Record<string, unknown>;
  stepsExecuted?: number;
  durationMs: number;
  error?: TriggerJobError;
}

export interface TriggerJobError {
  message: string;
  code: string;
  retryable: boolean;
  stack?: string;
}

// ============================================
// Job Type Enums
// ============================================

export type TriggerJobType =
  | 'ai-analysis'
  | 'workflow-execute'
  | 'batch-process'
  | 'integration-sync'
  | 'rag-indexing'
  | 'knowledge-document';

export type EntityType =
  | 'lead'
  | 'opportunity'
  | 'client'
  | 'contact'
  | 'company'
  | 'task'
  | 'meeting';

export type TriggerJobStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

// ============================================
// AI Analysis Job
// ============================================

export interface AIAnalysisJobPayload extends TriggerJobPayload {
  jobType: 'ai-analysis';
  entityType: 'lead' | 'opportunity' | 'client';
  entityId: string;
  inputData: {
    agentType: string;
    triggerType: 'manual' | 'scheduled' | 'recommendation_accepted' | 'event';
    context?: Record<string, unknown>;
    skipCache?: boolean;
    useRag?: boolean;
  };
}

export interface AIAnalysisJobResult extends TriggerJobResult {
  output: {
    executionId: string;
    executiveSummary: string;
    statusAssessment: string;
    keySignals: string[];
    riskIndicators: string[];
    recommendedAction: string;
    confidenceLevel: 'high' | 'medium' | 'low';
    tokensUsed?: number;
    ragChunksUsed?: number;
  };
}

// ============================================
// Workflow Execution Job
// ============================================

export interface WorkflowExecuteJobPayload extends TriggerJobPayload {
  jobType: 'workflow-execute';
  inputData: {
    workflowCode: string;
    workflowVersion?: number;
    executionId?: string;
    triggerType: 'manual' | 'recommendation_accepted' | 'scheduled' | 'event' | 'api';
    triggerSource?: string;
    resumeFromStep?: number;
    context?: Record<string, unknown>;
  };
}

export interface WorkflowExecuteJobResult extends TriggerJobResult {
  output: {
    executionId: string;
    workflowCode: string;
    stepsCompleted: number;
    totalSteps: number;
    finalStatus: 'completed' | 'failed' | 'cancelled' | 'paused';
    stepResults: Array<{
      stepIndex: number;
      stepType: string;
      status: string;
      durationMs: number;
      output?: unknown;
    }>;
  };
}

// ============================================
// Batch Processing Job
// ============================================

export interface BatchProcessJobPayload extends TriggerJobPayload {
  jobType: 'batch-process';
  inputData: {
    batchType: 'daily-pipeline-review' | 'weekly-health-check' | 'periodic-rescoring';
    entityFilter?: {
      entityType?: EntityType;
      status?: string[];
      stageId?: string;
      lastActivityBefore?: string;
    };
    maxEntities?: number;
    dryRun?: boolean;
  };
}

export interface BatchProcessJobResult extends TriggerJobResult {
  output: {
    batchId: string;
    entitiesProcessed: number;
    entitiesSkipped: number;
    entitiesFailed: number;
    summary: {
      actionsTaken: number;
      alertsGenerated: number;
      recommendationsCreated: number;
    };
    failedEntities?: Array<{
      entityId: string;
      error: string;
    }>;
  };
}

// ============================================
// Integration Sync Job
// ============================================

export interface IntegrationSyncJobPayload extends TriggerJobPayload {
  jobType: 'integration-sync';
  inputData: {
    integrationType: 'email' | 'whatsapp' | 'payment' | 'calendar' | 'external-crm';
    operation: 'send' | 'sync' | 'webhook' | 'refresh';
    targetId?: string;
    payload?: Record<string, unknown>;
  };
}

export interface IntegrationSyncJobResult extends TriggerJobResult {
  output: {
    integrationType: string;
    operation: string;
    itemsSynced?: number;
    externalId?: string;
    providerResponse?: Record<string, unknown>;
  };
}

// ============================================
// RAG Indexing Job
// ============================================

export interface RagIndexingJobPayload extends TriggerJobPayload {
  jobType: 'rag-indexing';
  inputData: {
    indexType: 'outcome' | 'conversation' | 'document';
    sourceId: string;
    sourceType: string;
    metadata?: Record<string, unknown>;
    reindex?: boolean;
  };
}

export interface RagIndexingJobResult extends TriggerJobResult {
  output: {
    chunksIndexed: number;
    embeddingsGenerated: number;
    indexId: string;
    vectorIds: string[];
  };
}

// ============================================
// Job Run Database Record
// ============================================

export interface TriggerJobRun {
  id: string;
  workspace_id: string;
  trigger_run_id: string;
  job_type: string;
  entity_type?: string | null;
  entity_id?: string | null;
  recommendation_id?: string | null;
  status: string;
  priority: number;
  idempotency_key?: string | null;
  input_data: Record<string, unknown>;
  output_data?: Record<string, unknown> | null;
  error_data?: Record<string, unknown> | null;
  attempts: number;
  max_attempts: number;
  started_at?: string | null;
  completed_at?: string | null;
  scheduled_for?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Job Progress Events
// ============================================

export interface TriggerJobProgressEvent {
  jobId: string;
  runId: string;
  event: 'started' | 'step_completed' | 'step_failed' | 'completed' | 'failed' | 'retrying';
  timestamp: string;
  data?: {
    stepIndex?: number;
    stepName?: string;
    progress?: number;
    message?: string;
  };
}

// ============================================
// Concurrency Configuration
// ============================================

export interface TriggerConcurrencyConfig {
  perWorkspace: number;
  perEntity: number;
  perJobType: Record<TriggerJobType, number>;
}

export const DEFAULT_CONCURRENCY_CONFIG: TriggerConcurrencyConfig = {
  perWorkspace: 5,
  perEntity: 1,
  perJobType: {
    'ai-analysis': 3,
    'workflow-execute': 5,
    'batch-process': 2,
    'integration-sync': 2,
    'rag-indexing': 3,
    'knowledge-document': 3,
  },
};

// ============================================
// Retry Configuration
// ============================================

export interface TriggerRetryConfig {
  maxAttempts: number;
  factor: number;
  minTimeout: number;
  maxTimeout: number;
  randomize: boolean;
}

export const DEFAULT_RETRY_CONFIG: TriggerRetryConfig = {
  maxAttempts: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 30000,
  randomize: true,
};

// ============================================
// Idempotency Utilities
// ============================================

export function generateIdempotencyKey(
  jobType: TriggerJobType,
  workspaceId: string,
  entityId?: string,
  recommendationId?: string,
  dateKey?: string
): string {
  const parts = [jobType, workspaceId];
  if (entityId) parts.push(entityId);
  if (recommendationId) parts.push(recommendationId);
  if (dateKey) parts.push(dateKey);
  return parts.join(':');
}

export function getDailyDateKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function getHourlyDateKey(): string {
  const now = new Date();
  return `${now.toISOString().split('T')[0]}-${now.getUTCHours()}`;
}
